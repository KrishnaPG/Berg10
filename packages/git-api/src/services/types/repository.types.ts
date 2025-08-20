/**
 * Repository API Types and Interfaces
 * Generated from packages/git-api/api-spec/repository-api.yml
 */

import type { TBranch, TRepositoryId, TRepositoryName, TUserId } from "./branded.types";
import type { IPaginatedResponse, IPermissions, IUser } from "./shared.types";

// Request Types
export interface IRepositoryCreateRequest {
  name: TRepositoryName;
  description?: string;
  default_branch?: TBranch;
  is_private?: boolean;
  initialize_with_readme?: boolean;
  gitignore_template?: string;
  license_template?: string;
}

export interface IRepositoryUpdateRequest {
  name?: TRepositoryName;
  description?: string;
  default_branch?: TBranch;
  is_private?: boolean;
  has_issues?: boolean;
  has_wiki?: boolean;
  has_downloads?: boolean;
  default_merge_style?: "merge" | "squash" | "rebase";
  allow_squash_merge?: boolean;
  allow_rebase_merge?: boolean;
  allow_merge_commits?: boolean;
  archived?: boolean;
}

// Response Types
export interface IRepository {
  id: TRepositoryId;
  name: TRepositoryName;
  description?: string;
  default_branch: TBranch;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  clone_url: string;
  ssh_url: string;
  size: number;
  owner: IUser;
}

export interface IRepositoryDetails extends IRepository {
  disk_usage: number;
  languages: Array<{
    name: string;
    percentage: number;
  }>;
  contributors_count: number;
  branches_count: number;
  tags_count: number;
  commits_count: number;
  permissions: IPermissions;
}

export interface IRepositoryUpdateResponse extends IRepository {
  updated_at: string;
}

// Query Parameters
export interface IListRepositoriesOptions {
  page?: number;
  per_page?: number;
  sort?: string;
  order?: "asc" | "desc";
  type?: "all" | "owner" | "member";
  search?: string;
}

// Error Types
export interface IApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export interface ICloneOptions {
  bare?: boolean;
  branch?: TBranch;
  depth?: number;
  recursive?: boolean;
}

// Service Method Return Types
export type TCreateRepositoryResult = IRepository;
export type TListRepositoriesResult = IPaginatedResponse<IRepository>;
export type TGetRepositoryResult = IRepositoryDetails;
export type TUpdateRepositoryResult = IRepositoryUpdateResponse;
export type TDeleteRepositoryResult = {
  message: string;
  repository_id: string;
  repository_name: string;
};
