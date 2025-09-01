/**
 * FS Source/Input Types
 */

import type { Branded, TFilePath, TFolderPath } from "./branded.types";

export type TFsSrcFilePath = Branded<TFilePath, "FsSrcFile">;
export type TFSSrcFolderPath = Branded<TFolderPath, "FsSrcFolder">;
export type TFsSrcRootPath = Branded<TFSSrcFolderPath, "FsSrcRoot">;
