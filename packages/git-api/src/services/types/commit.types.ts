/**
 * Commit API Types and Interfaces
 * Generated from packages/git-api/api-spec/commit-api.yml
 */

import type { TAuthor, TCommitMessage, TPath, TSha } from "./branded.types";
import type { ICommitAuthor, IPaginatedResponse } from "./shared.types";

// Request Types
export interface ICommitCreateRequest {
  message: TCommitMessage;
  tree?: TSha;
  parents?: TSha[];
  author?: ICommitAuthor;
  committer?: ICommitAuthor;
}

export interface ICommitUpdateRequest {
  message: string;
  force?: boolean;
}

// Response Types
export interface ICommit {
  sha: TSha;
  message: TCommitMessage;
  author: ICommitAuthor;
  committer: ICommitAuthor;
  tree: {
    sha: TSha;
    url: string;
  };
  parents: Array<{
    sha: TSha;
    url: string;
  }>;
  url: string;
  html_url: string;
  comments_url: string;
}

export interface ICommitDetails extends ICommit {
  files: ICommitFile[];
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export type TCommitFileStatus = "added" | "modified" | "removed" | "renamed" | "copied";

export interface ICommitFile {
  filename: string;
  status: TCommitFileStatus;
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
}

// Query Parameters
export interface IListCommitsOptions {
  page?: number;
  per_page?: number;
  sha?: TSha;
  path?: TPath;
  author?: TAuthor;
  since?: string;
  until?: string;
  sort?: "created" | "updated";
  order?: "asc" | "desc";
}

export type TResetMode = "soft" | "mixed" | "hard";

// Service Method Return Types
export type TListCommitsResult = IPaginatedResponse<ICommit>;

export type TCreateCommitResult = ICommit;
export type TGetCommitResult = ICommitDetails;
export type TUpdateCommitMessageResult = ICommit;
export type TRevertCommitResult = ICommit;
