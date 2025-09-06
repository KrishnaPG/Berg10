/**
 * FS VCS Types
 */

import type { Branded, TFolderPath } from "./branded.types";

/** Usually this is `TBergPath + "/vcs"`; 
 * 
 * Contains multiple `<sha256B58>.git` named folders, each a `.git` folder
 * created with `--separate-git-dir`;  
 * */ 
export type TFsVCSRootPath = Branded<TFolderPath, "FsVCSRoot">;

/**
 * Usually this is `TFsVCSRootPath + "/<sha256B58>.git"`; 
 * 
 * Contains git internal files/folders such as {`objects`, `HEAD`, `refs`...}
 */
export type TFsVCSDotGitPath = Branded<TFolderPath, "<sha256B58>.git folder">;
