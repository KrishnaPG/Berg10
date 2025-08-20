/**
 * Index API Types and Interfaces
 * Generated from packages/git-api/api-spec/index-api.yml
 */

import type { TBranch, TPath } from "./branded.types";

// Request Types
export interface IIndexAddRequest {
  paths: TPath[];
  pattern?: string;
  update?: boolean;
  add_all?: boolean;
}

export interface IIndexUpdateRequest {
  updates: Array<{
    path: TPath;
    content: string;
    encoding?: "utf-8" | "base64";
    mode?: string;
  }>;
}

export interface IIndexRemoveRequest {
  paths: TPath[];
  pattern?: string;
  cached?: boolean;
  recursive?: boolean;
}

// Response Types
export interface IIndex {
  repo: string;
  ref: string;
  entries: IIndexEntry[];
  stats: {
    staged_files: number;
    staged_additions: number;
    staged_modifications: number;
    staged_deletions: number;
  };
  tree: {
    sha: string;
    url: string;
  };
}

export interface IIndexEntry {
  path: TPath;
  mode: string;
  blob: {
    sha: string;
    size: number;
    url: string;
  };
  status: "added" | "modified" | "deleted" | "renamed" | "copied" | "unmodified";
  changes: {
    additions: number;
    deletions: number;
    total: number;
  };
  diff?: string;
}

// Query Parameters
export interface IGetIndexOptions {
  ref?: TBranch;
}

// Service Method Return Types
export type TGetIndexResult = IIndex;
export type TAddToIndexResult = IIndex;
export type TUpdateIndexResult = IIndex;
export type TRemoveFromIndexResult = IIndex;
