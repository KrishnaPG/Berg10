/**
 * Commit operation types for Git API
 * Commit creation, manipulation, and management operations
 */

import type { GitSignature } from "./git.types";

export interface ICommit {
  sha: string;
  tree: string;
  parents: string[];
  author: GitSignature;
  committer: GitSignature;
  message: string;
  encoding?: string;
  gpgSignature?: string;
}

export interface ICommitCreateRequest {
  repoPath: string;
  message: string;
  author?: GitSignature;
  committer?: GitSignature;
  parents?: string[];
  tree?: string;
  amend?: boolean;
  sign?: boolean;
  gpgKey?: string;
  allowEmpty?: boolean;
  allowEmptyMessage?: boolean;
  noVerify?: boolean;
}

export interface ICommitCreateResponse {
  success: boolean;
  commit: ICommit;
  treeSha: string;
}

export interface ICommitListRequest {
  repoPath: string;
  maxCount?: number;
  skip?: number;
  since?: string;
  until?: string;
  author?: string;
  committer?: string;
  grep?: string;
  all?: boolean;
  firstParent?: boolean;
  reverse?: boolean;
  pathspec?: string[];
}

export interface ICommitListResponse {
  commits: ICommit[];
  total: number;
  hasMore: boolean;
}

export interface ICommitGetRequest {
  repoPath: string;
  sha: string;
}

export interface ICommitGetResponse {
  commit: ICommit;
  diff?: string;
}

export interface ICommitCherryPickRequest {
  repoPath: string;
  sha: string;
  parent?: number;
  mainline?: number;
  noCommit?: boolean;
  edit?: boolean;
  sign?: boolean;
  gpgKey?: string;
}

export interface ICommitCherryPickResponse {
  success: boolean;
  newCommit?: ICommit;
  conflicts?: string[];
}

export interface ICommitRevertRequest {
  repoPath: string;
  sha: string;
  parent?: number;
  mainline?: number;
  noCommit?: boolean;
  edit?: boolean;
  sign?: boolean;
  gpgKey?: string;
}

export interface ICommitRevertResponse {
  success: boolean;
  newCommit?: ICommit;
  conflicts?: string[];
}

export interface ICommitAmendRequest {
  repoPath: string;
  message?: string;
  author?: GitSignature;
  committer?: GitSignature;
  noEdit?: boolean;
  sign?: boolean;
  gpgKey?: string;
}

export interface ICommitAmendResponse {
  success: boolean;
  newCommit: ICommit;
  oldCommit: ICommit;
}

export interface ICommitResetRequest {
  repoPath: string;
  target: string;
  mode: "soft" | "mixed" | "hard";
  paths?: string[];
}

export interface ICommitResetResponse {
  success: boolean;
  newHead: string;
  affectedFiles: string[];
}

export interface ICommitResetBranchRequest {
  repoPath: string;
  branch: string;
  newCommit: string;
  force?: boolean;
}

export interface ICommitResetBranchResponse {
  success: boolean;
  branch: string;
  oldCommit: string;
  newCommit: string;
}
