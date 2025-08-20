/**
 * Log/Blame API Types and Interfaces
 * Generated from packages/git-api/api-spec/log-blame-api.yml
 */

import type { TAuthor, TBranch, TPath, TSha } from "./branded.types";
import type { ICommitAuthor, IPaginatedResponse } from "./shared.types";

// Response Types
export interface ICommitLogEntry {
  sha: TSha;
  message: string;
  author: ICommitAuthor;
  committer: ICommitAuthor;
  timestamp: string;
  url: string;
  html_url: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
    files_changed: number;
  };
}

export interface IFileHistoryEntry extends ICommitLogEntry {
  file: {
    path: TPath;
    status: "added" | "modified" | "deleted" | "renamed" | "copied";
    changes: {
      additions: number;
      deletions: number;
      total: number;
    };
    blob_url: string;
    raw_url: string;
  };
}

export interface IBlameInfo {
  file: {
    path: TPath;
    size: number;
    lines: number;
  };
  ref: TBranch;
  ranges: IBlameRange[];
  commits: Record<string, ICommitLogEntry>;
}

export interface IBlameRange {
  starting_line: number;
  ending_line: number;
  commit: TSha;
  author: ICommitAuthor;
  committer: ICommitAuthor;
  message: string;
  timestamp: string;
}

// Query Parameters
export interface IGetCommitLogOptions {
  page?: number;
  per_page?: number;
  ref?: TBranch;
  path?: TPath;
  author?: TAuthor;
  since?: string;
  until?: string;
  sort?: "created" | "updated";
  order?: "asc" | "desc";
  with_stats?: boolean;
}

export interface IGetFileHistoryOptions {
  page?: number;
  per_page?: number;
  ref?: TBranch;
  since?: string;
  until?: string;
  sort?: "created" | "updated";
  order?: "asc" | "desc";
  with_stats?: boolean;
}

export interface IGetBlameInfoOptions {
  ref?: TBranch;
}

// Service Method Return Types
export type TGetCommitLogResult = IPaginatedResponse<ICommitLogEntry>;
export type TGetFileHistoryResult = IPaginatedResponse<IFileHistoryEntry>;
export type TGetBlameInfoResult = IBlameInfo;
