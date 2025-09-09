import type { Branded, TFolderPath } from "./branded.types";

/** The working directory that contains `.git` file/folder (i.e. root of a git repo) */
export type TGitRepoRootPath = Branded<TFolderPath, "GitRepoRoot">;

/** The `.git` folder path; Usually `<TGitRepoRootPath>/.git/` */
export type TGitDirPath = Branded<TFolderPath, "GitDir">;

/** `TWorkTreePath` always refers to a user owned/controlled source files root path. 
 *  When `.git` folder exists inside it, it becomes same as `TGitRepoRootPath`;
 *  Otherwise, `TWorkTreePath` may just hold the source files, and the 
 * `.git` folder may reside elsewhere (pointed by TGitDirPath);
 *  When `TGitRepoRootPath == TWorkTreePath`, then `TGitDirPath == TGitRepoRootPath + .git/`;
 *  Other times, `TWorkTreePath` and `TGitDirPath` together define the git operations. * 
 */
export type TWorkTreePath = Branded<TFolderPath, "WorkTree">;