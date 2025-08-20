import type { BackendKind, FileEntry } from "../types";

export interface IGitBackend {
  kind: BackendKind;
  init(repoPath: string): Promise<void>;
  listFiles(repo: string, rev: string, path?: string, recursive?: boolean): Promise<FileEntry[]>;
  stageFile(repo: string, path: string, patch?: string): Promise<void>;
  stashSave(repo: string, message?: string, includeUntracked?: boolean): Promise<string>;
  revertCommit(repo: string, sha: string): Promise<string>;
  diffCommits(repo: string, from: string, to: string): Promise<string>;
}
