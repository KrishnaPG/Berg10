/**
 * GraphQL schema types for Git API
 * GraphQL type definitions
 */

export interface IGraphQLRepository {
  id: string;
  name: string;
  path: string;
  bare: boolean;
  branches: IGraphQLBranch[];
  tags: IGraphQLTag[];
  commits: IGraphQLCommit[];
  files: IGraphQLFile[];
  stashes: IGraphQLStash[];
}

export interface IGraphQLBranch {
  id: string;
  name: string;
  sha: string;
  isProtected: boolean;
  isHead: boolean;
  upstream?: {
    remote: string;
    branch: string;
  };
  commits: IGraphQLCommit[];
}

export interface IGraphQLTag {
  id: string;
  name: string;
  sha: string;
  type: 'lightweight' | 'annotated';
  message?: string;
  tagger?: {
    name: string;
    email: string;
    date: string;
  };
}

export interface IGraphQLCommit {
  id: string;
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  tree: string;
  parents: string[];
  files: IGraphQLFile[];
}

export interface IGraphQLFile {
  id: string;
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size: number;
  content?: string;
}

export interface IGraphQLStash {
  id: string;
  index: number;
  sha: string;
  message: string;
  branch: string;
  createdAt: string;
  files: IGraphQLFile[];
}

export interface IGraphQLDiff {
  id: string;
  from: string;
  to: string;
  entries: IGraphQLDiffEntry[];
  totalAdditions: number;
  totalDeletions: number;
  filesChanged: number;
}

export interface IGraphQLDiffEntry {
  fromFile: string;
  toFile: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed' | 'copied';
  hunks: IGraphQLDiffHunk[];
}

export interface IGraphQLDiffHunk {
  header: string;
  lines: IGraphQLDiffLine[];
  oldStart: number;
  oldLength: number;
  newStart: number;
  newLength: number;
}

export interface IGraphQLDiffLine {
  type: 'context' | 'addition' | 'deletion';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}