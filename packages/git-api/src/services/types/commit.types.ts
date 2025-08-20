/**
 * Commit API Types and Interfaces
 * Generated from packages/git-api/api-spec/commit-api.yml
 */

import type { ICommitAuthor, IPaginatedResponse } from "./shared.types";

// Request Types
export interface ICommitCreateRequest {
  message: string;
  tree: string;
  parents?: string[];
  author?: ICommitAuthor;
  committer?: ICommitAuthor;
}

export interface ICommitUpdateRequest {
  message: string;
  force?: boolean;
}

// Response Types
export interface ICommit {
  sha: string;
  message: string;
  author: ICommitAuthor;
  committer: ICommitAuthor;
  tree: {
    sha: string;
    url: string;
  };
  parents: Array<{
    sha: string;
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

export interface ICommitFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed" | "copied";
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
  sha?: string;
  path?: string;
  author?: string;
  since?: string;
  until?: string;
  sort?: "created" | "updated";
  order?: "asc" | "desc";
}

// Service Method Return Types
export type TListCommitsResult = IPaginatedResponse<ICommit>;

export type TCreateCommitResult = ICommit;
export type TGetCommitResult = ICommitDetails;
export type TUpdateCommitMessageResult = ICommit;
export type TRevertCommitResult = ICommit;
