/**
 * Merge/Rebase operation types for Git API
 * Merge and rebase operations with conflict resolution
 */

export interface IMergeRequest {
  repoPath: string;
  branch: string;
  message?: string;
  fastForward?: 'ff' | 'no-ff' | 'only';
  strategy?: 'recursive' | 'resolve' | 'octopus' | 'ours' | 'subtree';
  strategyOption?: string;
  squash?: boolean;
  noCommit?: boolean;
  sign?: boolean;
  gpgKey?: string;
  author?: {
    name: string;
    email: string;
    date?: Date;
  };
  committer?: {
    name: string;
    email: string;
    date?: Date;
  };
}

export interface IMergeResponse {
  success: boolean;
  result: {
    sha: string;
    message: string;
    parents: string[];
    branch: string;
    fastForward: boolean;
    conflicts?: string[];
  };
}

export interface IRebaseRequest {
  repoPath: string;
  branch: string;
  onto?: string;
  interactive?: boolean;
  preserveMerges?: boolean;
  strategy?: 'recursive' | 'resolve' | 'octopus' | 'ours' | 'subtree';
  strategyOption?: string;
  sign?: boolean;
  gpgKey?: string;
  author?: {
    name: string;
    email: string;
    date?: Date;
  };
  committer?: {
    name: string;
    email: string;
    date?: Date;
  };
}

export interface IRebaseResponse {
  success: boolean;
  result: {
    originalBranch: string;
    newBranch: string;
    commits: string[];
    conflicts?: string[];
    interactive?: boolean;
  };
}

export interface IConflict {
  path: string;
  ours: string;
  theirs: string;
  base?: string;
  status: 'bothAdded' | 'bothModified' | 'bothDeleted' | 'addedByUs' | 'addedByThem' | 'deletedByUs' | 'deletedByThem';
}

export interface IConflictResolution {
  path: string;
  resolution: 'ours' | 'theirs' | 'base' | 'merge';
  content?: string;
}

export interface IConflictListRequest {
  repoPath: string;
}

export interface IConflictListResponse {
  conflicts: IConflict[];
}

export interface IConflictResolveRequest {
  repoPath: string;
  path: string;
  resolution: 'ours' | 'theirs' | 'base' | 'merge';
  content?: string;
}

export interface IConflictResolveResponse {
  success: boolean;
  path: string;
  resolution: string;
}