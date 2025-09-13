import { type ParquetSchema, ParquetWriter, type WriterOptions } from "@dsnp/parquetjs";
import type { TFileBaseName, TFilePath, TFolderPath, TParquetFilePath } from "@shared/types";
import fs from "fs-extra";
import path from "path";

export class AtomicParquetWriter {
  constructor(
    protected writer: ParquetWriter,
    protected tmpFilePath: TFilePath,
    protected finalFilePath: TParquetFilePath,
  ) {}

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
  commit(): Promise<void> {
    return this.writer.close().then(() => {
      return fs.renameSync(this.tmpFilePath, this.finalFilePath);
    });
  }

  public static open(
    schema: ParquetSchema,
    folder: TFolderPath,
    fileBaseName: TFileBaseName,
    opts?: WriterOptions,
  ): Promise<AtomicParquetWriter> {
    const tmpFilePath = path.resolve(folder, `${fileBaseName}.tmp`) as TFilePath;
    const finalFilePath = path.resolve(folder, `${fileBaseName}.parquet`) as TParquetFilePath;
    return ParquetWriter.openFile(schema, tmpFilePath, opts).then((writer) => {
      return new AtomicParquetWriter(writer, tmpFilePath, finalFilePath);
    });
  }
}
