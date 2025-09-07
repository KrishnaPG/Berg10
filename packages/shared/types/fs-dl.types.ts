/**
 * The file-system DB Types
 */

import type { Branded, TFilePath, TFolderPath, TName } from "./branded.types"; // DB File types
import type { TDuckLakeRootPath } from "./ducklake.types";

/**
 * Usually this is `TBergPath + "/dl"`;
 *
 * Same as `TDuckLakeRootPath`, and contains {`TDuckLakeMetaFilePath`, `TDuckLakeDataFilesFolder`};
 *
 * A single `TFsDLRootPath` might contain multiple tables, metadata files inside it.
 */
export type TFsDLRootPath = TDuckLakeRootPath;
