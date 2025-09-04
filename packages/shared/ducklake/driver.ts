import {
  type DuckDBConnection,
  DuckDBInstanceCache,
  type DuckDBMaterializedResult,
  type DuckDBType,
  type DuckDBValue,
  timestampMillisValue,
} from "@duckdb/node-api";
import { mkdir, rm } from "fs/promises";
import os from "os";
import path from "path";
import { createRetryableDatabaseOperation } from "../retry";
import type { TDuckLakeDataFilesFolder, TDuckLakeDBName, TDuckLakeMetaFilePath, TDuckLakeRootPath } from "../types";

// converts Date() based milli-seconds to DuckDB compatible timestamps
export const getTimestamp = (tMS: number = Date.now()) => timestampMillisValue(BigInt(tMS));

export interface ILakePaths {
  metaFilePath: TDuckLakeMetaFilePath;
  dataFilesFolderPath: TDuckLakeDataFilesFolder;
}

/** helper function to get temp rootPath for duckLakes */
export function getTempLakeRootPath(): TDuckLakeRootPath {
  return path.resolve(os.tmpdir(), "duckLakes") as TDuckLakeRootPath;
}

/** Returns the calculated data files folder path and metadata file path */
export function getLakePaths(rootPath: TDuckLakeRootPath, lakeDBName: TDuckLakeDBName): ILakePaths {
  return {
    metaFilePath: path.resolve(rootPath, `${lakeDBName}.metadata`) as TDuckLakeMetaFilePath,
    dataFilesFolderPath: path.resolve(rootPath, `${lakeDBName}.files`) as TDuckLakeDataFilesFolder,
  };
}

/** Sets up a new DuckDB Lake at the given root folder. Creates the paths and DB if needed. */
export function setupLake(
  rootPath: TDuckLakeRootPath = getTempLakeRootPath(),
  lakeDBName: TDuckLakeDBName = "db" as TDuckLakeDBName,
) {
  const lakePaths = getLakePaths(rootPath, lakeDBName);
  return mkdir(lakePaths.dataFilesFolderPath, { recursive: true }) // we presume both paths are under same root
    .then(() => initDB(lakePaths))
    .then((db: BaseQueryExecutor) => ({
      db,
      ...lakePaths,
    }));
}

/** Removes all the lake metadata and files */
export function clearLake(rootPath: TDuckLakeRootPath, lakeDBName: TDuckLakeDBName) {
  const { metaFilePath, dataFilesFolderPath } = getLakePaths(rootPath, lakeDBName);
  return Promise.allSettled([
    rm(metaFilePath, { force: true }),
    rm(dataFilesFolderPath, { recursive: true, force: true }),
  ]);
}

// Creates or Opens a new duckLake database; we need:
//  - meta file path: this needs to be relevant to the cwd of the process, and the parent folder should already exist;
//  - data files folder path: this is where actual parquet files will be stored under; i.e. dataPath/main/<tableName>/ducklake-{uuid}.parquet
async function initDB(
  { metaFilePath, dataFilesFolderPath }: ILakePaths,
  readOnly: boolean = false,
): Promise<BaseQueryExecutor> {
  const cache = new DuckDBInstanceCache();
  const instance = await cache.getOrCreateInstance(":memory:");
  const con = await instance.connect();

  // Install and load DuckLake extension
  await con.run("INSTALL ducklake;");
  await con.run("LOAD ducklake;");
  const attachCmd = `ATTACH IF NOT EXISTS 'ducklake:${metaFilePath}' AS lakeFile (DATA_PATH '${dataFilesFolderPath}'${readOnly ? " READ_ONLY " : ""});`;
  await con.run(attachCmd);
  await con.run(`USE lakeFile;`);
  return new _BaseQueryExecutor(con) as BaseQueryExecutor;
}

/**
 * Represents a single row from a query result
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row<Table, Col = DuckDBValue> = Partial<Record<keyof Table, Col>>;

/**
 *  Represents a type that can be used in query template literals
 * */
export type Primitive = DuckDBValue;

export type TGenIDFunction = (_x: unknown) => string;

//
//#region BaseQueryExecutor
//
type DuckDBConnectionAPI = Pick<
  DuckDBConnection,
  {
    [K in keyof DuckDBConnection]: DuckDBConnection[K] extends Function ? K : never;
  }[keyof DuckDBConnection]
>;

export class _BaseQueryExecutor {
  constructor(protected readonly impl: DuckDBConnection) {
    // generate forwarding methods once, at construction time
    for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(impl)) as Array<keyof DuckDBConnection>) {
      const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(impl), key);
      if (desc && typeof desc.value === "function") {
        (this as any)[key] = (...args: any[]) => (impl as any)[key].apply(impl, args);
      }
    }
  }

  /**
   * query queries the database using a template string, replacing your placeholders in the template
   * with parametrised values without risking SQL injections.
   *
   * It returns an async generator, that allows iterating over the results
   * in a streaming fashion using `for await`.
   *
   * @example
   *
   * const email = "foo@example.com";
   * const result = database.query`SELECT id FROM users WHERE email=${email}`
   *
   * This produces the query: "SELECT id FROM users WHERE email=$1".
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query<T extends Row<T> = Record<string, DuckDBValue>>(
    strings: TemplateStringsArray,
    ...params: DuckDBValue[]
  ): AsyncGenerator<T> {
    const query = buildQuery(strings, params);
    return this.rawQuery(query, ...params);
  }

  /**
   * rawQuery queries the database using a raw parametrised SQL query and parameters.
   *
   * It returns an async generator, that allows iterating over the results
   * in a streaming fashion using `for await`.
   *
   * @example
   * const query = "SELECT id FROM users WHERE email=$1";
   * const email = "foo@example.com";
   * for await (const row of database.rawQuery(query, email)) {
   *   console.log(row);
   * }
   *
   * @param query - The raw SQL query string.
   * @param params - The parameters to be used in the query.
   * @returns An async generator that yields rows from the query result.
   */
  async *rawQuery<T extends Row<T> = Record<string, DuckDBValue>>(
    query: string,
    ...params: DuckDBValue[]
  ): AsyncGenerator<T> {
    // Convert parameters to object format for DuckDB Node Neo API
    const paramObj: Record<string, DuckDBValue> = {};
    for (let i = 0; i < params.length; i++) {
      paramObj[`$${i + 1}`] = params[i];
    }
    const reader = await this.impl.runAndRead(query, params);
    const rows = reader.getRowObjects() as T[];
    for (const row of rows) {
      yield row;
    }
  }

  /**
   * queryAll queries the database using a template string, replacing your placeholders in the template
   * with parametrised values without risking SQL injections.
   *
   * It returns an array of all results.
   *
   * @example
   *
   * const email = "foo@example.com";
   * const result = database.queryAll`SELECT id FROM users WHERE email=${email}`
   *
   * This produces the query: "SELECT id FROM users WHERE email=$1".
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryAll<T extends Row<T> = Record<string, DuckDBValue>>(
    strings: TemplateStringsArray,
    ...params: DuckDBValue[]
  ): Promise<T[]> {
    const query = buildQuery(strings, params);
    return this.rawQueryAll(query, ...params);
  }

  /**
   * rawQueryAll queries the database using a raw parametrised SQL query and parameters.
   *
   * It returns an array of all results.
   *
   * @example
   *
   * const query = "SELECT id FROM users WHERE email=$1";
   * const email = "foo@example.com";
   * const rows = await database.rawQueryAll(query, email);
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async rawQueryAll<T extends Row<T> = Record<string, DuckDBValue>>(
    query: string,
    ...params: DuckDBValue[]
  ): Promise<T[]> {
    const reader = await this.impl.runAndReadAll(query, params);
    return reader.getRowObjects() as T[];
  }

  /**
   * queryRow is like query but returns only a single row.
   * If the query selects no rows it returns null.
   * Otherwise it returns the first row and discards the rest.
   *
   * @example
   * const email = "foo@example.com";
   * const result = database.queryRow`SELECT id FROM users WHERE email=${email}`
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async queryRow<T extends Row<T> = Record<string, DuckDBValue>>(
    strings: TemplateStringsArray,
    ...params: DuckDBValue[]
  ): Promise<T | null> {
    const query = buildQuery(strings, params);
    return this.rawQueryRow(query, ...params);
  }

  /**
   * rawQueryRow is like rawQuery but returns only a single row.
   * If the query selects no rows, it returns null.
   * Otherwise, it returns the first row and discards the rest.
   *
   * @example
   * const query = "SELECT id FROM users WHERE email=$1";
   * const email = "foo@example.com";
   * const result = await database.rawQueryRow(query, email);
   * console.log(result);
   *
   * @param query - The raw SQL query string.
   * @param params - The parameters to be used in the query.
   * @returns A promise that resolves to a single row or null.
   */
  async rawQueryRow<T extends Row<T> = Record<string, DuckDBValue>>(
    query: string,
    ...params: DuckDBValue[]
  ): Promise<T | null> {
    // Convert parameters to object format for DuckDB Node Neo API
    const paramObj: Record<string, DuckDBValue> = {};
    for (let i = 0; i < params.length; i++) {
      paramObj[`$${i + 1}`] = params[i];
    }
    const reader = await this.impl.runAndReadAll(query, params);
    const rows = reader.getRowObjects() as T[];
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * exec executes a query without returning any rows.
   *
   * @example
   * const email = "foo@example.com";
   * const result = database.exec`DELETE FROM users WHERE email=${email}`
   */
  exec(strings: TemplateStringsArray, ...params: DuckDBValue[]): Promise<DuckDBMaterializedResult> {
    const query = buildQuery(strings, params);
    return this.rawExec(query, ...params);
  }

  /**
   * rawExec executes a query without returning any rows.
   *
   * @example
   * const query = "DELETE FROM users WHERE email=$1";
   * const email = "foo@example.com";
   * await database.rawExec(query, email);
   *
   * @param query - The raw SQL query string.
   * @param params - The parameters to be used in the query.
   * @returns A promise that resolves when the query has been executed.
   */
  async rawExec(query: string, ...params: DuckDBValue[]): Promise<DuckDBMaterializedResult> {
    return this.retirableRun(query, params);
  }

  // Generic insert method
  insert<T extends Record<string, any>>(
    tableName: string,
    data: T,
    options?: {
      generateId?: TGenIDFunction;
      idField?: string;
    },
  ): Promise<DuckDBMaterializedResult> {
    // Generate ID if requested
    const finalData = data;
    if (options?.generateId && options.idField && !data[options.idField]) {
      (finalData as any)[options.idField] = options.generateId(data);
    }

    // Get column names and values
    const columns = Object.keys(finalData);
    const values = Object.values(finalData); //columns.map(col => toDuckDBValue(finalData[col]));

    // Build parameterized query
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

    return this.retirableRun(sql, values);
  }

  // Generic batch insert method
  async insertBatch<T extends Record<string, any>>(
    tableName: string,
    items: T[],
    options?: {
      generateId?: TGenIDFunction;
      idField?: string;
    },
  ): Promise<DuckDBMaterializedResult | void> {
    if (items.length === 0) return;

    // Process items with ID generation if needed
    const processedItems = items.map((item) => {
      const processed = item;
      if (options?.generateId && options.idField && !item[options.idField]) {
        (processed as any)[options.idField] = options.generateId(item);
      }
      return processed;
    });

    // Get column names from first item
    const columns = Object.keys(processedItems[0]);

    // Build multi-row insert
    const placeholders = processedItems.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");

    const sql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES ${placeholders}`;

    // Flatten values for parameterized query
    const values = processedItems.flatMap((item) => Object.values(item));

    return this.retirableRun(sql, values);
  }

  upsert<T extends Record<string, any>>(
    tableName: string,
    data: T,
    conflictColumns: string[],
    updateColumns?: string[],
  ): Promise<DuckDBMaterializedResult> {
    const columns = Object.keys(data);
    const values = Object.values(data);

    const placeholders = columns.map(() => "?").join(", ");
    const updateClause = updateColumns
      ? updateColumns.map((col) => `${col} = EXCLUDED.${col}`).join(", ")
      : columns
          .filter((col) => !conflictColumns.includes(col))
          .map((col) => `${col} = EXCLUDED.${col}`)
          .join(", ");

    const sql = `
    			INSERT INTO ${tableName} (${columns.join(", ")})
    			VALUES (${placeholders})
    			ON CONFLICT (${conflictColumns.join(", ")})
    			DO UPDATE SET ${updateClause}
    		`;

    return this.retirableRun(sql, values);
  }

  // Generic update method
  update<T extends Record<string, any>>(
    tableName: string,
    data: T,
    whereConditions: Partial<T>,
    options?: {
      whereColumns?: string[];
    },
  ): Promise<DuckDBMaterializedResult> {
    // Get column names and values for update
    const updateColumns = Object.keys(data);
    const updateValues = Object.values(data);

    // Build WHERE clause
    let whereClause = "";
    let whereValues: any[] = [];

    if (options?.whereColumns && options.whereColumns.length > 0) {
      whereClause = "WHERE " + options.whereColumns.map((col) => `${col} = ?`).join(" AND ");
      whereValues = options.whereColumns.map((col) => whereConditions[col]);
    } else {
      // Use all columns from whereConditions if whereColumns not specified
      const whereColumns = Object.keys(whereConditions);
      whereClause = "WHERE " + whereColumns.map((col) => `${col} = ?`).join(" AND ");
      whereValues = whereColumns.map((col) => whereConditions[col]);
    }

    // Build SET clause
    const setClause = updateColumns.map((col) => `${col} = ?`).join(", ");

    const sql = `UPDATE ${tableName} SET ${setClause} ${whereClause}`;

    // Combine update values and where values
    const allValues = [...updateValues, ...whereValues];

    return this.retirableRun(sql, allValues);
  }

  // Generic delete method
  delete<T extends Record<string, any>>(
    tableName: string,
    whereConditions: Partial<T>,
    options?: {
      whereColumns?: string[];
    },
  ): Promise<DuckDBMaterializedResult> {
    // Build WHERE clause
    let whereClause = "";
    let whereValues: any[] = [];

    if (options?.whereColumns && options.whereColumns.length > 0) {
      whereClause = "WHERE " + options.whereColumns.map((col) => `${col} = ?`).join(" AND ");
      whereValues = options.whereColumns.map((col) => whereConditions[col]);
    } else {
      // Use all columns from whereConditions if whereColumns not specified
      const whereColumns = Object.keys(whereConditions);
      whereClause = "WHERE " + whereColumns.map((col) => `${col} = ?`).join(" AND ");
      whereValues = whereColumns.map((col) => whereConditions[col]);
    }

    const sql = `DELETE FROM ${tableName} ${whereClause}`;

    return this.retirableRun(sql, whereValues);
  }

  retirableRun(
    sql: string,
    values?: Record<string, DuckDBValue> | DuckDBValue[] | undefined,
    types?: DuckDBType[] | Record<string, DuckDBType | undefined>,
  ) {
    return createRetryableDatabaseOperation(() => this.impl.run(sql, values, types))();
  }
}

export interface BaseQueryExecutor extends _BaseQueryExecutor, DuckDBConnectionAPI {}

// replaces ${var} parts into $1, $2 etc.
function buildQuery(strings: TemplateStringsArray, expr: DuckDBValue[]): string {
  let query = "";
  for (let i = 0; i < strings.length; i++) {
    query += strings[i];

    if (i < expr.length) {
      query += "$" + (i + 1);
    }
  }
  return query;
}
//#endregion
