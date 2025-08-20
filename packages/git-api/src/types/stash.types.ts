/**
 * Stash operation types for Git API
 * Stash management for temporary storage
 */

export interface IStash {
  index: number;
  sha: string;
  message: string;
  branch: string;
  createdAt: Date;
  author: {
    name: string;
    email: string;
    date: Date;
  };
  files: {
    modified: string[];
    added: string[];
    deleted: string[];
  };
  isDirty: boolean;
}

export interface IStashListRequest {
  repoPath: string;
  limit?: number;
  offset?: number;
  grep?: string;
  all?: boolean;
}

export interface IStashListResponse {
  stashes: IStash[];
  total: number;
  hasMore: boolean;
}

export interface IStashSaveRequest {
  repoPath: string;
  message?: string;
  includeUntracked?: boolean;
  keepIndex?: boolean;
  patch?: boolean;
}

export interface IStashSaveResponse {
  success: boolean;
  stash: IStash;
}

export interface IStashApplyRequest {
  repoPath: string;
  index?: number;
  keepIndex?: boolean;
  noIndex?: boolean;
}

export interface IStashApplyResponse {
  success: boolean;
  applied: boolean;
}

export interface IStashDropRequest {
  repoPath: string;
  index?: number;
}

export interface IStashDropResponse {
  success: boolean;
  dropped: boolean;
}