/**
 * Diff operation types for Git API
 * Diff generation and comparison operations
 */

export interface IDiffEntry {
  fromFile: string;
  toFile: string;
  fromMode?: string;
  toMode?: string;
  fromSha?: string;
  toSha?: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed' | 'copied';
  similarity?: number;
  hunks: IDiffHunk[];
}

export interface IDiffHunk {
  header: string;
  lines: IDiffLine[];
  oldStart: number;
  oldLength: number;
  newStart: number;
  newLength: number;
}

export interface IDiffLine {
  type: 'context' | 'addition' | 'deletion';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface IDiffRequest {
  repoPath: string;
  from: string;
  to: string;
  contextLines?: number;
  renameThreshold?: number;
  findRenames?: boolean;
  findCopies?: boolean;
  format?: 'patch' | 'json' | 'stat';
  pathspec?: string[];
}

export interface IDiffResponse {
  diff: IDiffEntry[];
  format: string;
  from: string;
  to: string;
  totalAdditions: number;
  totalDeletions: number;
  filesChanged: number;
}

export interface IDiffIndexRequest {
  repoPath: string;
  treeIsh?: string;
  cached?: boolean;
  pathspec?: string[];
}

export interface IDiffWorktreeRequest {
  repoPath: string;
  path?: string;
}

export interface IDiffWorktreeResponse {
  diff: IDiffEntry[];
  path: string;
  status: string;
}