import type duckdb from "@duckdb/node-api";
import { DuckDBInstanceCache } from "@duckdb/node-api";
import type { TFilePath, TJsonString, TParquetFilePath, TSqlString } from "@shared/types";

const gDuckDBInstances = new DuckDBInstanceCache();
/** Returns a DuckDB connection */
export function getDuckDbConnection(
  path: string = ":memory:",
  options?: Record<string, string> | undefined,
): Promise<duckdb.DuckDBConnection> {
  return gDuckDBInstances.getOrCreateInstance(path, options).then((instance) => instance.connect());
}

export type TCsvDelims = `\t` | `,` | "|";

/** converts the given csv-compatible file/content to parquet (using DuckDB)*/
export function csvToParquet(
  src: TFilePath | string,  // can be csv file path or csv file content in string form
  parquetSchema: TSqlString,
  destFilePath: TParquetFilePath,
  delim: TCsvDelims = "\t"
): Promise<duckdb.DuckDBResultReader> {
  const sql = `
    COPY (
      WITH raw AS (
        SELECT regexp_split_to_array(line, '${delim}') AS c
        FROM read_csv_auto(
            ${src},
            delim='\0',      -- we never want read_csv to split
            columns={'line': 'VARCHAR'},
            header=false
        )
      )
      SELECT ${parquetSchema} FROM raw 
    ) TO '${destFilePath}' (FORMAT PARQUET, COMPRESSION ZSTD);
  `;
  return getDuckDbConnection().then((db) => db.runAndRead(sql));
}
