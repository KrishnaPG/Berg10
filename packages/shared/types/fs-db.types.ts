/**
 * The file-system DB Types
 */

import type { Branded, TFilePath, TFolderPath, TName } from "./branded.types";// DB File types

// TFsDBRootPath is equivalent to TDuckLakeRootPath, and 
// contains {TDuckLakeMetaFilePath, TDuckLakeDataFilesFolder};
// A single TFsDBRootPath might contain multiple tables, metadata files inside it.
export type TFsDBRootPath = Branded<TFolderPath, "FsDBRoot">;