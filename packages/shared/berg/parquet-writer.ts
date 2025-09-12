import { ParquetSchema, ParquetWriter } from "@dsnp/parquetjs";
import type { TFolderPath, TParquetFilePath } from "@shared/types";

export class ParquetAtomicWriter {
  constructor(protected finalPath: TParquetFilePath) {
    ParquetWriter.openFile(commitParquetSchema, path.join(DB_DIR, "commits.parquet"), {
      rowGroupSize: ROW_GROUP_SIZE,
    });
  }
  public static open(folder: TFolderPath, fileBaseName: TName, rowGroupSize: number = 4096) {
    return ParquetWriter.openFile();
  }
}
