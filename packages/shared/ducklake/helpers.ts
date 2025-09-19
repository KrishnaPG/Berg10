import type duckdb from "@duckdb/node-api";
import { DuckDBInstanceCache } from "@duckdb/node-api";
import type { TFileBaseName, TFilePath, TFolderPath, TParquetFilePath, TSQLString } from "@shared/types";
import { atomicFileRename } from "@shared/utils";
import path from "path";

const gDuckDBInstances = new DuckDBInstanceCache();
/** Returns a DuckDB connection */
export function getDuckDbConnection(
  path: string = ":memory:",
  options?: Record<string, string> | undefined,
): Promise<duckdb.DuckDBConnection> {
  return gDuckDBInstances.getOrCreateInstance(path, options).then((instance) => instance.connect());
}

export type TCsvDelims = `\t` | `,` | "\\|";

/** converts the given csv-compatible file/content to parquet (using DuckDB)*/
export function csvToParquet(
  srcFilePath: TFilePath, // can be csv file path or csv file content in string form
  colProjection: TSQLString,
  destFolder: TFolderPath,
  destFileBaseName: TFileBaseName,
  delim: TCsvDelims = "\t",
) {
  const tmpFilePath = path.resolve(destFolder, `${destFileBaseName}.tmp`) as TFilePath;
  const finalFilePath = path.resolve(destFolder, `${destFileBaseName}.parquet`) as TFilePath;

  const sql = `
    COPY (
      WITH raw AS (
        SELECT regexp_split_to_array(line, '${delim}') AS c
        FROM read_csv_auto(
            '${srcFilePath}',
            delim='\\0',      -- we never want read_csv to split
            columns={'line': 'VARCHAR'},
            header=false
        )
      )
      SELECT ${colProjection} FROM raw 
    ) TO '${tmpFilePath}' (FORMAT PARQUET, COMPRESSION ZSTD);
  `;
  return getDuckDbConnection().then((db) =>
    db
      .run(sql)
      .then(() => atomicFileRename(tmpFilePath, finalFilePath))
      .finally(() => db.closeSync()),
  );
}
