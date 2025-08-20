/**
 * Stash API Types and Interfaces
 * Generated from packages/git-api/api-spec/stash-api.yml
 */

import type { TBranch } from "./branded.types";
import { ICommitAuthor, type ICommitSummary, type IPaginatedResponse } from "./shared.types";

// Request Types
export interface IStashCreateRequest {
  message?: string;
  include_untracked?: boolean;
  include_ignored?: boolean;
  keep_index?: boolean;
}

export interface IStashApplyRequest {
  reinstate_index?: boolean;
  quiet?: boolean;
}

// Response Types
export interface IStash {
  id: string;
  message: string;
  created_at: string;
  branch: TBranch;
  stats: {
    files_changed: number;
    insertions: number;
    deletions: number;
  };
  url: string;
}

export interface IStashDetails extends IStash {
  commit: ICommitSummary;
  files: IStashFile[];
}

export interface IStashFile {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "copied";
  changes: {
    additions: number;
    deletions: number;
    total: number;
  };
  diff?: string;
  blob_url: string;
}

// Query Parameters
export interface IListStashesOptions {
  page?: number;
  per_page?: number;
  sort?: "created" | "updated";
  order?: "asc" | "desc";
}

// Service Method Return Types
export type TListStashesResult = IPaginatedResponse<IStash>;
export type TCreateStashResult = IStash;
export type TGetStashResult = IStashDetails;
export type TApplyStashResult = {
  message: string;
  stash: IStash;
};
export type TPopStashResult = {
  message: string;
  stash: IStash;
};
export type TDropStashResult = void;
