/**
 * Diff API Types and Interfaces
 * Generated from packages/git-api/api-spec/diff-api.yml
 */

// Response Types
export interface IDiff {
  repo: string;
  from: string;
  to: string;
  files: IDiffFile[];
  stats: {
    total_files: number;
    total_additions: number;
    total_deletions: number;
    total_changes: number;
  };
  url: string;
  html_url: string;
}

export interface IDiffFile {
  filename: string;
  old_filename?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
  diff?: string;
  hunks?: IDiffHunk[];
}

export interface IDiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: IDiffLine[];
}

export interface IDiffLine {
  old_line?: number;
  new_line?: number;
  type: 'context' | 'added' | 'deleted';
  content: string;
  no_newline_at_end?: boolean;
}

// Query Parameters
export interface IGetDiffOptions {
  target?: string;
  path?: string;
  context_lines?: number;
  ignore_whitespace?: boolean;
  format?: 'unified' | 'json';
}

export interface ICompareCommitsOptions {
  path?: string;
  context_lines?: number;
  ignore_whitespace?: boolean;
  format?: 'unified' | 'json';
}

export interface IGetCommitDiffOptions {
  path?: string;
  context_lines?: number;
  ignore_whitespace?: boolean;
  format?: 'unified' | 'json';
}

// Service Method Return Types
export type TGetDiffResult = IDiff;
export type TCompareCommitsResult = IDiff;
export type TGetCommitDiffResult = IDiff;