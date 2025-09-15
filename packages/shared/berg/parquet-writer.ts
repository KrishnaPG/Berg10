import { type ParquetSchema, ParquetWriter, type WriterOptions } from "@dsnp/parquetjs";
import type { TFileBaseName, TFilePath, TFolderPath, TParquetFilePath } from "@shared/types";
import fs from "fs-extra";
import path from "path";

export class TransactionalParquetWriter {
  constructor(
    protected writer: ParquetWriter,
    protected tmpFilePath: TFilePath,
    protected finalFilePath: TParquetFilePath,
  ) {}

  get rowGroupSize() { return this.writer.rowGroupSize; }

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
    return this.writer.close().then(()=>{
      // 2. fsync the file
      const fd = fs.openSync(this.tmpFilePath, "r+");
      fs.fsyncSync(fd);
      fs.closeSync(fd);

      // 3. fsync the *directory* so the inode entry is durable
      const dirPath = path.resolve(this.tmpFilePath, "..");
      const dirFd = fs.openSync(dirPath, "r");
      fs.fsyncSync(dirFd);
      fs.closeSync(dirFd);

      // 4. atomic rename
      return fs.renameSync(this.tmpFilePath, this.finalFilePath);
    });
  }

  public static open(
    schema: ParquetSchema,
    destFolder: TFolderPath,
    destFileBaseName: TFileBaseName,
    opts?: WriterOptions,
  ): Promise<TransactionalParquetWriter> {
    const tmpFilePath = path.resolve(destFolder, `${destFileBaseName}.tmp`) as TFilePath;
    const finalFilePath = path.resolve(destFolder, `${destFileBaseName}.parquet`) as TParquetFilePath;
    return ParquetWriter.openFile(schema, tmpFilePath, opts).then((writer) => {
      return new TransactionalParquetWriter(writer, tmpFilePath, finalFilePath);
    });
  }
}
