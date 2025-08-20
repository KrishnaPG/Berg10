/**
 * Index API Types and Interfaces
 * Generated from packages/git-api/api-spec/index-api.yml
 */

// Request Types
export interface IIndexAddRequest {
  paths: string[];
  pattern?: string;
  update?: boolean;
  add_all?: boolean;
}

export interface IIndexUpdateRequest {
  updates: Array<{
    path: string;
    content: string;
    encoding?: 'utf-8' | 'base64';
    mode?: string;
  }>;
}

export interface IIndexRemoveRequest {
  paths: string[];
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
  path: string;
  mode: string;
  blob: {
    sha: string;
    size: number;
    url: string;
  };
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unmodified';
  changes: {
    additions: number;
    deletions: number;
    total: number;
  };
  diff?: string;
}

// Query Parameters
export interface IGetIndexOptions {
  ref?: string;
}

// Service Method Return Types
export type TGetIndexResult = IIndex;
export type TAddToIndexResult = IIndex;
export type TUpdateIndexResult = IIndex;
export type TRemoveFromIndexResult = IIndex;