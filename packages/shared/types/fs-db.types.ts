/**
 * The file-system DB Types
 */

import type { Branded, TFilePath, TFolderPath, TName } from "./branded.types";

// DB File types
export type TFsDBRootPath = Branded<TFolderPath, "FsDBRoot">;


// DuckLake types
export type TDLMetaFilePath = Branded<TFilePath, "DL Metadata File">;
export type TDLDBFilesRootPath = Branded<TFolderPath, "DL DB Files Root Folder">;

export type TDLTableName = Branded<TName, "DuckLake Table Name">;
export type TDLColName = Branded<TName, "DuckLake Column Name">;