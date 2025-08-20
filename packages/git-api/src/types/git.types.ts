// Core Git identity and metadata types
export interface GitIdentity {
  name: string;
  email: string;
  date: string;
}

export interface GitSignature {
  name: string;
  email: string;
  timestamp: number;
  timezoneOffset: number;
}

// Core Git object types
export interface GitObject {
  sha: string;
  type: 'blob' | 'tree' | 'commit' | 'tag';
  size: number;
}

export interface GitBlob extends GitObject {
  type: 'blob';
  content: string;
  isBinary: boolean;
}

export interface GitTreeEntry {
  mode: string;
  type: string;
  sha: string;
  path: string;
  size?: number;
}

export interface GitTree extends GitObject {
  type: 'tree';
  entries: GitTreeEntry[];
}

export interface GitCommit extends GitObject {
  type: 'commit';
  tree: string;
  parents: string[];
  author: GitSignature;
  committer: GitSignature;
  message: string;
  encoding?: string;
}

export interface GitTag extends GitObject {
  type: 'tag';
  object: string;
  objectType: string;
  tag: string;
  tagger: GitSignature;
  message: string;
}