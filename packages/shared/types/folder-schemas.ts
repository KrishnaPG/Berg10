// schemas.ts

import fs from "fs-extra";
import path from "path";
import type { TFolderPath } from "./branded.types";
import { folder } from "./folder-validators";
import type { TGitRepoRootPath } from "./git.types";

/* ---------- generic folder behaviours ---------- */
export const FolderPath = folder<TFolderPath>("FolderPath", "FolderPath");
export const ExistingFolderPath = folder<TFolderPath>("FolderPath", "ExistingFolderPath");
export const EnsuredFolderPath = folder<TFolderPath>("FolderPath", "EnsuredFolderPath");

/* ---------- git-repo behaviours ---------- */
const gitCheck = (p: string) =>
  fs.access(path.resolve(p, ".git")).catch(() => {
    throw new Error("Missing .git");
  });

export const GitRepoPath = folder<TGitRepoRootPath>("GitRepoRoot", "FolderPath", gitCheck);
export const ExistingGitRepoPath = folder<TGitRepoRootPath>("GitRepoRoot", "ExistingFolderPath", gitCheck);
export const EnsuredGitRepoPath = folder<TGitRepoRootPath>("GitRepoRoot", "EnsuredFolderPath", gitCheck);
