/**
 * Merge/Rebase API Types and Interfaces
 * Generated from packages/git-api/api-spec/merge-rebase-api.yml
 */

import type { TBranch, TPath, TSha } from "./branded.types";
import type { ICommitAuthor, ICommitSummary } from "./shared.types";

// Request Types
export interface IMergeRequest {
  source: TBranch;
  target: TBranch;
  message?: string;
  commit_message?: string;
  strategy?: "merge" | "squash" | "rebase";
  async?: boolean;
}

export interface IRebaseRequest {
  source: TBranch;
  target: TBranch;
  async?: boolean;
  autosquash?: boolean;
  autosign?: boolean;
}

// Response Types
export interface IMergeResult {
  sha: TSha;
  merged: boolean;
  message: string;
  author: ICommitAuthor;
  committer: ICommitAuthor;
  url: string;
  html_url: string;
  stats: {
    additions: number;
    deletions: number;
    total: number;
    files_changed: number;
  };
}

export interface IRebaseResult {
  rebased: boolean;
  message: string;
  commits: ICommitSummary[];
  source: string;
  target: string;
}

export interface IMergeStatus {
  status: "pending" | "in_progress" | "completed" | "failed" | "aborted" | "conflict";
  message: string;
  sha?: string;
  progress?: number;
  started_at?: string;
  completed_at?: string;
  conflicts?: IMergeConflict[];
}

export interface IRebaseStatus {
  status: "pending" | "in_progress" | "completed" | "failed" | "aborted" | "conflict";
  message: string;
  progress?: number;
  started_at?: string;
  completed_at?: string;
  current_commit?: string;
  conflicts?: IRebaseConflict[];
}

export interface IMergeConflict {
  path: TPath;
  conflict_type:
    | "both_modified"
    | "both_added"
    | "both_deleted"
    | "added_by_them"
    | "added_by_us"
    | "deleted_by_them"
    | "deleted_by_us";
  message: string;
  base_content: string;
  source_content: string;
  target_content: string;
}

export interface IRebaseConflict {
  commit: TSha;
  path: TPath;
  conflict_type:
    | "both_modified"
    | "both_added"
    | "both_deleted"
    | "added_by_them"
    | "added_by_us"
    | "deleted_by_them"
    | "deleted_by_us";
  message: string;
  base_content: string;
  source_content: string;
  target_content: string;
}

// Service Method Return Types
export type TMergeBranchResult = IMergeResult | IMergeStatus;
export type TRebaseBranchResult = IRebaseResult | IRebaseStatus;
export type TGetMergeStatusResult = IMergeStatus;
export type TGetRebaseStatusResult = IRebaseStatus;
export type TAbortMergeResult = {
  message: string;
  status: string;
};
export type TAbortRebaseResult = {
  message: string;
  status: string;
};
