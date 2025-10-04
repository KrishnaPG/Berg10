import {
  DuckDBConnection,
  type DuckDBInstance,
  type DuckDBMaterializedResult,
  type DuckDBType,
  type DuckDBValue,
  timestampMillisValue,
  version,
} from "@duckdb/node-api";
import { mkdir, rm } from "fs/promises";
import os from "os";
import path from "path";
import type {
  TDuckLakeDataFilesFolder,
  TDuckLakeDBName,
  TDuckLakeMetaFilePath,
  TDuckLakeRootPath,
  TSQLString,
} from "../types";
import { createRetryableDatabaseOperation } from "../utils/retry";
import { getDuckDbConnection } from "./helpers";

// converts Date() based milli-seconds to DuckDB compatible timestamps
export const getTimestamp = (tMS: number = Date.now()) => timestampMillisValue(BigInt(tMS));

export const getDuckDBVersion = () => version();

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
  // Use getDuckDbConnection for proper instance caching and management
  const connection = await getDuckDbConnection(":memory:");

  // Create BaseQueryExecutor from existing connection
  const executor = BaseQueryExecutor.fromConnection(connection);

  // Install and load DuckLake extension
  await executor.run("INSTALL parquet;");
  await executor.run("LOAD parquet;");
  await executor.run("INSTALL ducklake;");
  await executor.run("LOAD ducklake;");
  const attachCmd = `ATTACH IF NOT EXISTS 'ducklake:${metaFilePath}' AS lakeFile (DATA_PATH '${dataFilesFolderPath}'${readOnly ? " READ_ONLY " : ""});`;
  await executor.run(attachCmd);
  await executor.run(`USE lakeFile;`);
  return executor;
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

/**
 * Industry-standard logging: Use console with levels and structured output.
 * For production, could integrate pino or winston, but keep simple here.
 */
function logQuery(level: "debug" | "info" | "warn", sql: string, params?: DuckDBValue[]) {
  const timestamp = new Date().toISOString();
  console[level](
    `${timestamp} [DuckDB] ${level.toUpperCase()}: SQL: ${sql}${params ? ` | Params: ${JSON.stringify(params)}` : ""}`,
  );
}

//#region BaseQueryExecutor
/**
 * High-performance query executor that extends DuckDBConnection with additional utilities
 * while leveraging native DuckDB streaming and bulk operations.
 */
export class BaseQueryExecutor extends DuckDBConnection {
  /** Static factory method to create a BaseQueryExecutor instance */
  static async create(instance?: DuckDBInstance): Promise<BaseQueryExecutor> {
    const connection = await DuckDBConnection.create(instance);
    // Create a new instance by copying the connection's internal state
    const executor = Object.create(BaseQueryExecutor.prototype);
    Object.assign(executor, connection);
    return executor;
  }

  /** Create a BaseQueryExecutor from an existing DuckDB connection */
  static fromConnection(connection: any): BaseQueryExecutor {
    // Create a new instance by copying the connection's internal state
    const executor = Object.create(BaseQueryExecutor.prototype);
    Object.assign(executor, connection);
    return executor;
  }

  /**
   * Builds query parameters from either template strings or raw SQL.
   * Eliminates the need for buildQuery by leveraging DuckDB's native parameter binding.
   */
  private buildQueryParams(
    queryOrStrings: string | TemplateStringsArray,
    params: DuckDBValue[],
  ): { sql: string; values: DuckDBValue[] } {
    let sql: string;
    let values: DuckDBValue[];

    if (typeof queryOrStrings === "string") {
      // Raw SQL string with parameters
      sql = queryOrStrings;
      values = params;
    } else {
      // Template strings - convert to parameterized query
      const strings = queryOrStrings;
      sql = strings[0];
      values = [];
      for (let i = 0; i < params.length; i++) {
        values.push(params[i]);
        sql += `$${values.length}`;
        sql += strings[i + 1];
      }
    }
    logQuery("debug", sql, params);
    return { sql, values };
  }

  /**
   * Unified query method that handles both template strings and raw SQL queries.
   * Returns an async generator for streaming results.
   *
   * @example
   * // Template string usage
   * const email = "foo@example.com";
   * for await (const row of db.query`SELECT id FROM users WHERE email=${email}`) {
   *   console.log(row);
   * }
   *
   * // Raw SQL usage
   * for await (const row of db.query("SELECT id FROM users WHERE email=$1", email)) {
   *   console.log(row);
   * }
   */
  async *query<T extends Row<T> = Record<string, DuckDBValue>>(
    queryOrStrings: TSQLString | TemplateStringsArray,
    ...params: DuckDBValue[]
  ): AsyncGenerator<T[]> {
    const { sql, values } = this.buildQueryParams(queryOrStrings, params);
    const reader = await this.streamAndRead(sql, values);

    // Stream results in chunks for memory efficiency
    while (!reader.done) {
      await reader.readUntil(10); // Read in chunks of 2048 rows
      const rows = reader.getRowObjects() as T[];
      yield rows;
    }
  }

  /**
   * Unified queryAll method that returns all results as an array.
   *
   * @example
   * const rows = await db.queryAll`SELECT * FROM users WHERE active=${true}`;
   * const rows2 = await db.queryAll("SELECT * FROM users WHERE active=$1", true);
   */
  async queryAll<T extends Row<T> = Record<string, DuckDBValue>>(
    queryOrStrings: TSQLString | TemplateStringsArray,
    ...params: DuckDBValue[]
  ): Promise<T[]> {
    const { sql, values } = this.buildQueryParams(queryOrStrings, params);
    const reader = await this.runAndReadAll(sql, values);
    return reader.getRowObjects() as T[];
  }

  /**
   * Unified queryRow method that returns the first row or null.
   *
   * @example
   * const user = await db.queryRow`SELECT * FROM users WHERE id=${userId}`;
   */
  async queryRow<T extends Row<T> = Record<string, DuckDBValue>>(
    queryOrStrings: TSQLString | TemplateStringsArray,
    ...params: DuckDBValue[]
  ): Promise<T | null> {
    const { sql, values } = this.buildQueryParams(queryOrStrings, params);
    const reader = await this.runAndReadAll(sql, values);
    const rows = reader.getRowObjects() as T[];
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Unified exec method for queries that don't return data.
   *
   * @example
   * const sql = `DELETE FROM users WHERE id=${userId}`;
   * await db.exec(sql);
   */
  async exec(sql: TSQLString): Promise<DuckDBMaterializedResult> {
    return this.retryableRun(sql);
  }

  /**
   * Helper method to append data to a DuckDB appender with proper type handling.
   */
  private async appendDataToAppender(appender: any, data: Record<string, any>): Promise<boolean> {
    const values = Object.values(data);

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (typeof value === "number") {
        if (Number.isInteger(value)) {
          appender.appendInteger(value);
        } else {
          appender.appendDouble(value);
        }
      } else if (typeof value === "string") {
        appender.appendVarchar(value);
      } else if (typeof value === "boolean") {
        appender.appendBoolean(value);
      } else if (value === null || value === undefined) {
        appender.appendNull();
      } else {
        // Complex type that can't be handled by appender
        return false;
      }
    }

    appender.endRow();
    return true;
  }

  // Generic insert method using native appender for better performance
  async insert<T extends Record<string, any>>(
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

    // Use appender for single insert - more efficient than SQL building
    const appender = await this.createAppender(tableName);
    try {
      const success = await this.appendDataToAppender(appender, finalData);
      if (!success) {
        // Fallback to SQL for complex types
        const columns = Object.keys(finalData);
        const values = Object.values(finalData);
        const placeholders = columns.map(() => "?").join(", ");
        const sql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})` as TSQLString;
        return this.retryableRun(sql, values);
      }

      await appender.flushSync();
    } finally {
      await appender.closeSync();
    }

    // Return empty result for consistency
    return { rowCount: 1 } as DuckDBMaterializedResult;
  }

  // Optimized batch insert using native appender
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

    // Use appender for bulk insert - much more efficient than multi-row SQL
    const appender = await this.createAppender(tableName);
    try {
      let hasComplexTypes = false;

      for (const item of processedItems) {
        const success = await this.appendDataToAppender(appender, item);
        if (!success) {
          hasComplexTypes = true;
          break;
        }
      }

      if (hasComplexTypes) {
        // Fallback to SQL for complex types
        const columns = Object.keys(processedItems[0]);
        const placeholders = processedItems.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
        const sql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES ${placeholders}` as TSQLString;
        const values = processedItems.flatMap((item) => Object.values(item));
        return this.retryableRun(sql, values);
      }

      await appender.flushSync();
    } finally {
      await appender.closeSync();
    }

    // Return result for consistency
    return { rowCount: items.length } as DuckDBMaterializedResult;
  }

  /**
   * Optimized upsert using prepared statements for better performance and security.
   */
  async upsert<T extends Record<string, any>>(
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
    ` as TSQLString;
    return this.retryableRun(sql, values);
  }

  /**
   * Optimized update method using prepared statements.
   */
  async update<T extends Record<string, any>>(
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

    const sql = `UPDATE ${tableName} SET ${setClause} ${whereClause}` as TSQLString;

    // Combine update values and where values
    const allValues = [...updateValues, ...whereValues];

    return this.retryableRun(sql, allValues);
  }

  /**
   * Optimized delete method using prepared statements.
   */
  async delete<T extends Record<string, any>>(
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

    const sql = `DELETE FROM ${tableName} ${whereClause}` as TSQLString;
    return this.retryableRun(sql, whereValues);
  }

  /**
   * Transaction support methods for atomic operations.
   */
  async beginTransaction(): Promise<void> {
    await this.run("BEGIN TRANSACTION");
  }

  async commit(): Promise<void> {
    await this.run("COMMIT");
  }

  async rollback(): Promise<void> {
    await this.run("ROLLBACK");
  }

  /**
   * Execute a function within a transaction with automatic rollback on error.
   */
  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.beginTransaction();
    try {
      const result = await fn();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Get table schema information for better type safety and introspection.
   */
  async getTableSchema(
    tableName: string,
  ): Promise<Array<{ column_name: string; column_type: string; nullable: boolean }>> {
    const sql: TSQLString =
      "SELECT column_name, column_type, nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position" as TSQLString;
    const result = await this.queryAll(sql, tableName);
    return result as Array<{ column_name: string; column_type: string; nullable: boolean }>;
  }

  /**
   * Enhanced error handling wrapper for database operations.
   */
  async safeExecute<T>(operation: () => Promise<T>, errorMessage = "Database operation failed"): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  retryableRun(
    sql: TSQLString,
    values?: DuckDBValue[] | undefined,
    types?: DuckDBType[] | Record<string, DuckDBType | undefined>,
  ) {
    logQuery("debug", sql, values);
    return createRetryableDatabaseOperation(() => this.run(sql, values, types))();
  }
}

//#endregion
