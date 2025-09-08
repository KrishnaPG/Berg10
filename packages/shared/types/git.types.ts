import type { Branded, TFolderPath } from "./branded.types";

/** The working directory that contains `.git` file/folder (i.e. root of a git repo) */
export type TGitRepoRootPath = Branded<TFolderPath, "GitRepoRoot">;

/** The `.git` folder path; Usually `<TGitRepoRootPath>/.git/` */
export type TGitDirPath = Branded<TFolderPath, "GitDir">;