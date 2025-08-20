/**
 * Refs API Types and Interfaces
 * Generated from packages/git-api/api-spec/refs-api.yml
 */

import type { TBranch, TSha, TTagName } from "./branded.types";
import type { ICommitAuthor, ICommitSummary, IPaginatedResponse } from "./shared.types";

// Request Types
export interface IBranchCreateRequest {
  name: TBranch;
  ref: TSha;
  start_point?: TSha;
}

export interface ITagCreateRequest {
  name: TTagName;
  ref: TSha;
  message?: string;
  lightweight?: boolean;
}

export interface IRefUpdateRequest {
  ref: TSha;
  force?: boolean;
}

// Response Types
export interface IRef {
  name: string;
  ref: TSha;
  object: {
    type: string;
    sha: TSha;
  };
  url: string;
}

export interface IBranch extends IRef {
  type: "branch";
  protected?: boolean;
  default_branch?: boolean;
  commit: ICommitSummary;
  merged?: boolean;
  ahead_by?: number;
  behind_by?: number;
}

export interface ITag extends IRef {
  type: "tag";
  tagger?: ICommitAuthor;
  message?: string;
  lightweight?: boolean;
  commit: ICommitSummary;
}

// Query Parameters
export interface IListRefsOptions {
  page?: number;
  per_page?: number;
  sort?: "name" | "created" | "updated";
  order?: "asc" | "desc";
  filter?: string;
}

export interface IListBranchesOptions {
  page?: number;
  per_page?: number;
  sort?: "name" | "created" | "updated";
  order?: "asc" | "desc";
  filter?: string;
}

export interface IListTagsOptions {
  page?: number;
  per_page?: number;
  sort?: "name" | "created" | "updated";
  order?: "asc" | "desc";
  filter?: string;
}

// Service Method Return Types
export type TListAllRefsResult = IPaginatedResponse<IRef>;
export type TListBranchesResult = IPaginatedResponse<IBranch>;
export type TListTagsResult = IPaginatedResponse<ITag>;
export type TCreateBranchResult = IBranch;
export type TCreateTagResult = ITag;
export type TGetRefResult = IBranch | ITag;
export type TUpdateRefResult = IBranch | ITag;
export type TDeleteRefResult = void;
