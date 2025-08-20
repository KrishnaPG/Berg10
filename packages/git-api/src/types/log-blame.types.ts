/**
 * Log/Blame operation types for Git API
 * Commit history and file annotation operations
 */

export interface ILogEntry {
  sha: string;
  tree: string;
  parents: string[];
  author: {
    name: string;
    email: string;
    date: Date;
  };
  committer: {
    name: string;
    email: string;
    date: Date;
  };
  message: string;
  refs: string[];
}

export interface ILogRequest {
  repoPath: string;
  range?: string;
  path?: string;
  limit?: number;
  offset?: number;
  since?: Date;
  until?: Date;
  author?: string;
  committer?: string;
  grep?: string;
  all?: boolean;
  firstParent?: boolean;
  reverse?: boolean;
}

export interface ILogResponse {
  commits: ILogEntry[];
  total: number;
  hasMore: boolean;
  range: string;
}

export interface IBlameEntry {
  line: number;
  commit: string;
  author: string;
  authorEmail: string;
  authorDate: Date;
  committer: string;
  committerEmail: string;
  committerDate: Date;
  summary: string;
  boundary?: boolean;
}

export interface IBlameRequest {
  repoPath: string;
  path: string;
  rev?: string;
  follow?: boolean;
  showEmail?: boolean;
  showName?: boolean;
  showNumber?: boolean;
  showDate?: boolean;
  showSummary?: boolean;
}

export interface IBlameResponse {
  blame: IBlameEntry[];
  path: string;
  rev: string;
  totalLines: number;
}