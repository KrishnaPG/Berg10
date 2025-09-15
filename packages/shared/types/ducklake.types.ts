import type { Branded, TFilePath, TFolderPath, TName } from "./branded.types";

/** Generic .parquet file path */
export type TParquetFilePath = Branded<TFilePath, "ParquetFilePath">;

/** DuckLake internal file/folder paths */
export type TDuckLakeMetaFilePath = Branded<TFilePath, "DLMetaFilePath">;
export type TDuckLakeDataFilesFolder = Branded<TFolderPath, "DLDataFilesFolder">;

// TDuckLakeRootPath contains {TDuckLakeMetaFilePath, TDuckLakeDataFilesFolder}
export type TDuckLakeRootPath = Branded<TFolderPath, "DLRootPath">; 

export type TDuckLakeDBName = Branded<TName, "LakeDBName">;
export type TDuckLakeTableName = Branded<TName, "LakeTableName">;
