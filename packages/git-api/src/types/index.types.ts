/**
 * Index (staging) operation types for Git API
 * Staging area management and file operations
 */

export interface IIndexEntry {
  path: string;
  stage: number;
  sha: string;
  mode: string;
  size: number;
  flags: number;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unmerged';
  worktreeStatus?: 'unmodified' | 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'ignored';
  indexStatus?: 'unmodified' | 'modified' | 'added' | 'deleted' | 'renamed' | 'copied';
}

export interface IIndex {
  entries: IIndexEntry[];
  conflicts?: IIndexEntry[];
}

export interface IIndexListRequest {
  repoPath: string;
  cached?: boolean;
  modified?: boolean;
  deleted?: boolean;
  others?: boolean;
  ignored?: boolean;
  stage?: number;
  pathspec?: string[];
}

export interface IIndexListResponse {
  staged: IIndexEntry[];
  modified: IIndexEntry[];
  deleted: IIndexEntry[];
  untracked: IIndexEntry[];
  ignored: IIndexEntry[];
}

export interface IIndexStageRequest {
  repoPath: string;
  path: string;
  patch?: string;
  intentToAdd?: boolean;
  refresh?: boolean;
}

export interface IIndexStageResponse {
  success: boolean;
  path: string;
  status: string;
}

export interface IIndexUnstageRequest {
  repoPath: string;
  path: string;
  reset?: boolean;
  patch?: string;
}

export interface IIndexUnstageResponse {
  success: boolean;
  path: string;
  status: string;
}

export interface IIndexStagePatchRequest {
  repoPath: string;
  path: string;
  patchText: string;
  reverse?: boolean;
}

export interface IIndexStagePatchResponse {
  success: boolean;
  path: string;
  applied: boolean;
}

export interface IIndexDiscardWorktreeRequest {
  repoPath: string;
  path: string;
  force?: boolean;
  recursive?: boolean;
}

export interface IIndexDiscardWorktreeResponse {
  success: boolean;
  path: string;
  discarded: boolean;
}