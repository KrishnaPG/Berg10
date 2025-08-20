/**
 * Log/Blame API Types and Interfaces
 * Generated from packages/git-api/api-spec/log-blame-api.yml
 */

import type { ICommitAuthor, IPaginatedResponse } from "./shared.types";

// Response Types
export interface ICommitLogEntry {
  sha: string;
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
    path: string;
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
    path: string;
    size: number;
    lines: number;
  };
  ref: string;
  ranges: IBlameRange[];
  commits: Record<string, ICommitLogEntry>;
}

export interface IBlameRange {
  starting_line: number;
  ending_line: number;
  commit: string;
  author: ICommitAuthor;
  committer: ICommitAuthor;
  message: string;
  timestamp: string;
}

// Query Parameters
export interface IGetCommitLogOptions {
  page?: number;
  per_page?: number;
  ref?: string;
  path?: string;
  author?: string;
  since?: string;
  until?: string;
  sort?: "created" | "updated";
  order?: "asc" | "desc";
  with_stats?: boolean;
}

export interface IGetFileHistoryOptions {
  page?: number;
  per_page?: number;
  ref?: string;
  since?: string;
  until?: string;
  sort?: "created" | "updated";
  order?: "asc" | "desc";
  with_stats?: boolean;
}

export interface IGetBlameInfoOptions {
  ref?: string;
}

// Service Method Return Types
export type TGetCommitLogResult = IPaginatedResponse<ICommitLogEntry>;
export type TGetFileHistoryResult = IPaginatedResponse<IFileHistoryEntry>;
export type TGetBlameInfoResult = IBlameInfo;
