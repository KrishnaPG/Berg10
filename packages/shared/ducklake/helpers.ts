import { type ParquetSchema, ParquetWriter, type WriterOptions } from "@dsnp/parquetjs";
import type duckdb from "@duckdb/node-api";
import { DuckDBInstanceCache } from "@duckdb/node-api";
import type { TFileBaseName, TFilePath, TFolderPath, TParquetFilePath, TSQLString } from "@shared/types";
import { atomicFileRename, getRandomId } from "@shared/utils";
import path from "path";

const gDuckDBInstances = new DuckDBInstanceCache();
/** Returns a DuckDB connection */
export function getDuckDbConnection(
  path: string = ":memory:",
  options?: Record<string, string> | undefined,
): Promise<duckdb.DuckDBConnection> {
  return gDuckDBInstances.getOrCreateInstance(path, options).then((instance) => instance.connect());
}

/** ParquetWriter class with atomic file rename */
export class TransactionalParquetWriter {
  constructor(
    protected writer: ParquetWriter,
    protected tmpFilePath: TFilePath,
    protected finalFilePath: TParquetFilePath,
  ) {}

  get rowGroupSize() {
    return this.writer.rowGroupSize;
  }

  /**
   * Append a single row to the parquet file. Rows are buffered in memory until
   * rowGroupSize rows are in the buffer or close() is called
   */
  appendRow(row: Record<string, unknown>): Promise<void> {
    return this.writer.appendRow(row);
  }

  /**
   * Finish writing the parquet file and commit the footer to disk. This method
   * MUST be called after you are finished adding rows. You must not call this
   * method twice on the same object or add any rows after the commit() method has
   * been called.
   */
  async commit(): Promise<void> {
    // 1. Flush the content to temp file/disk
    return this.writer.close().then(() => atomicFileRename(this.tmpFilePath, this.finalFilePath));
  }

  public static open(
    schema: ParquetSchema,
    destFolder: TFolderPath,
    destFileBaseName: TFileBaseName,
    opts?: WriterOptions,
  ): Promise<TransactionalParquetWriter> {
    const tmpFilePath = path.resolve(destFolder, `${getRandomId()}.tmp`) as TFilePath;
    const finalFilePath = path.resolve(destFolder, `${destFileBaseName}.parquet`) as TParquetFilePath;
    return ParquetWriter.openFile(schema, tmpFilePath, opts).then((writer) => {
      return new TransactionalParquetWriter(writer, tmpFilePath, finalFilePath);
    });
  }
}
