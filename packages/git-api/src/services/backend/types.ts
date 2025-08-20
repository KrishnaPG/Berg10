/**
 * Backend abstraction types for Git API
 * Git backend interface and implementations
 */

export type GitBackendType = "libgit2" | "shell";

export interface IGitBackend {
  // Repository operations
  init(repoPath: string, config?: IRepositoryConfig): Promise<void>;
  clone(url: string, path: string, options?: any): Promise<void>;
  open(repoPath: string): Promise<void>;
  close(): Promise<void>;

  // Backend switching
  switchBackend(to: GitBackendType): void;
  getCurrentBackend(): GitBackendType;

  // Ref operations
  listRefs(type?: "branch" | "tag" | "all"): Promise<IRef[]>;
  getRef(name: string): Promise<IRef | null>;
  createRef(name: string, sha: string, type: "branch" | "tag"): Promise<void>;
  deleteRef(name: string): Promise<void>;
  renameRef(oldName: string, newName: string): Promise<void>;

  // Commit operations
  listCommits(options?: any): Promise<ICommit[]>;
  getCommit(sha: string): Promise<ICommit>;
  createCommit(options: any): Promise<ICommit>;
  cherryPick(sha: string, options?: any): Promise<ICommit>;
  revert(sha: string, options?: any): Promise<ICommit>;
  amendCommit(options: any): Promise<ICommit>;
  reset(target: string, mode: "soft" | "mixed" | "hard"): Promise<void>;

  // Tree operations
  listFiles(treeIsh: string, path?: string, recursive?: boolean): Promise<ITree>;
  getBlob(treeIsh: string, path: string): Promise<Buffer>;
  putBlob(path: string, content: Buffer, mode?: string): Promise<string>;
  deleteBlob(path: string): Promise<void>;
  moveFile(oldPath: string, newPath: string): Promise<void>;

  // Index operations
  listStaged(): Promise<IIndexEntry[]>;
  stageFile(path: string): Promise<void>;
  unstageFile(path: string): Promise<void>;
  stagePatch(path: string, patchText: string): Promise<void>;
  discardWorktree(path: string): Promise<void>;

  // Stash operations
  listStashes(): Promise<IStash[]>;
  saveStash(message?: string, includeUntracked?: boolean): Promise<IStash>;
  applyStash(index?: number): Promise<void>;
  dropStash(index?: number): Promise<void>;

  // Diff operations
  diffCommits(from: string, to: string, options?: any): Promise<IDiffEntry[]>;
  diffIndex(treeIsh?: string, cached?: boolean): Promise<IDiffEntry[]>;
  diffWorktree(path?: string): Promise<IDiffEntry[]>;

  // Log operations
  log(options?: any): Promise<ILogEntry[]>;
  blame(path: string, rev?: string): Promise<any>;

  // Merge/Rebase operations
  merge(branch: string, options?: any): Promise<any>;
  rebase(branch: string, options?: any): Promise<any>;
}

export interface IBackendConfig {
  type: GitBackendType;
  options?: Record<string, any>;
}

export interface IBackendSwitchRequest {
  to: GitBackendType;
  graceful?: boolean;
  timeout?: number;
}

export interface IBackendSwitchResponse {
  success: boolean;
  from: GitBackendType;
  to: GitBackendType;
  switchedAt: Date;
}

export interface IBackendStatus {
  current: GitBackendType;
  available: GitBackendType[];
  healthy: boolean;
  lastSwitch?: Date;
  metrics?: {
    requests: number;
    errors: number;
    avgLatency: number;
  };
}
