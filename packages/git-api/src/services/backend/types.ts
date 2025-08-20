/**
 * Backend abstraction types for Git API
 * Git backend interface and implementations
 */
import type {
  IBlameInfo,
  IBlob,
  IBranch,
  ICloneOptions,
  ICommit,
  ICommitCreateRequest,
  ICommitLogEntry,
  IDiff,
  IDirectoryContent,
  IFileContent,
  IFileCreateUpdateRequest,
  IFileDeleteRequest,
  IFileHistoryEntry,
  IGetBlameInfoOptions,
  IGetCommitDiffOptions,
  IGetFileContentOptions,
  IGetFileHistoryOptions,
  IIndex,
  IIndexEntry,
  IIndexUpdateRequest,
  IListCommitsOptions,
  IMergeRequest,
  IMergeResult,
  IMergeStatus,
  IPaginatedResponse,
  IRebaseRequest,
  IRebaseResult,
  IRebaseStatus,
  IRef,
  IRefUpdateRequest,
  IRepository,
  IRepositoryDetails,
  IRepositoryUpdateRequest,
  IRepositoryUpdateResponse,
  IStash,
  ITag,
  ITagCreateRequest,
  ITree,
  ITreeCreateRequest,
} from "../types";

// Repository configuration type
export interface IRepositoryConfig {
  defaultBranch?: string;
  isPrivate?: boolean;
  description?: string;
  // Add other repository configuration properties as needed
}

export type GitBackendType = "libgit2" | "shell";

export interface IGitBackend {
  // Repository operations
  init(repoPath: string, config?: IRepositoryConfig): Promise<void>;
  clone(url: string, path: string, options?: ICloneOptions): Promise<void>;
  open(repoPath: string): Promise<void>;
  close(): Promise<void>;
  listRepositories(): Promise<IRepository[]>;
  getRepository(): Promise<IRepositoryDetails>;
  updateRepository(options: IRepositoryUpdateRequest): Promise<IRepositoryUpdateResponse>;
  deleteRepository(): Promise<void>;

  // Backend switching
  switchBackend(to: GitBackendType): void;
  getCurrentBackend(): GitBackendType;

  // Ref operations
  listRefs(type?: "branch" | "tag" | "all"): Promise<IRef[]>;
  getRef(name: string): Promise<IRef | null>;
  createRef(name: string, sha: string, type: "branch" | "tag"): Promise<void>;
  deleteRef(name: string): Promise<void>;
  renameRef(oldName: string, newName: string): Promise<void>;
  createBranch(name: string, ref: string, startPoint?: string): Promise<IBranch>;
  createTag(name: string, ref: string, options?: ITagCreateRequest): Promise<ITag>;
  updateRef(ref: string, options: IRefUpdateRequest): Promise<IRef>;

  // Commit operations
  listCommits(options?: IListCommitsOptions): Promise<ICommit[]>;
  getCommit(sha: string): Promise<ICommit>;
  createCommit(options: ICommitCreateRequest): Promise<ICommit>;
  updateCommitMessage(sha: string, message: string, force?: boolean): Promise<ICommit>;
  revert(sha: string): Promise<ICommit>;
  reset(target: string, mode: "soft" | "mixed" | "hard"): Promise<void>;

  // Tree operations
  listFiles(treeIsh: string, path?: string, recursive?: boolean): Promise<ITree>;
  getBlob(treeIsh: string, path: string): Promise<Buffer>;
  createTree(tree: ITreeCreateRequest): Promise<ITree>;
  createBlob(content: string, encoding?: "utf-8" | "base64"): Promise<IBlob>;
  getFileContents(path: string, options?: IGetFileContentOptions): Promise<IFileContent | IDirectoryContent>;
  createOrUpdateFile(path: string, options: IFileCreateUpdateRequest): Promise<IFileContent>;
  deleteFile(path: string, options: IFileDeleteRequest): Promise<void>;

  // Index operations
  getIndex(): Promise<IIndexEntry[]>;
  addToIndex(path: string): Promise<void>;
  removeFromIndex(path: string): Promise<void>;
  updateIndex(options: IIndexUpdateRequest): Promise<IIndex>;
  stagePatch(path: string, patchText: string): Promise<void>;
  discardWorktree(path: string): Promise<void>;

  // Stash operations
  listStashes(): Promise<IStash[]>;
  saveStash(message?: string, includeUntracked?: boolean): Promise<IStash>;
  applyStash(index?: number): Promise<void>;
  dropStash(index?: number): Promise<void>;

  // Diff operations
  diffCommits(from: string, to: string, options?: any): Promise<IDiff[]>;
  diffIndex(treeIsh?: string, cached?: boolean): Promise<IDiff[]>;
  diffWorktree(path?: string): Promise<IDiff[]>;
  getCommitDiff(sha: string, options?: IGetCommitDiffOptions): Promise<IDiff>;

  // Log operations
  getCommitLog(options?: any): Promise<IPaginatedResponse<ICommitLogEntry>>;
  getFileHistory(path: string, options?: IGetFileHistoryOptions): Promise<IPaginatedResponse<IFileHistoryEntry>>;
  blame(path: string, rev?: string): Promise<IBlameInfo>;

  // Merge/Rebase operations
  merge(branch: string, options?: IMergeRequest): Promise<IMergeResult | IMergeStatus>;
  rebase(branch: string, options?: IRebaseRequest): Promise<IRebaseResult | IRebaseStatus>;
  getMergeStatus(branch: string): Promise<IMergeStatus>;
  getRebaseStatus(branch: string): Promise<IRebaseStatus>;
  abortMerge(branch: string): Promise<void>;
  abortRebase(branch: string): Promise<void>;
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
