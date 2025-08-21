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
  ICompareCommitsOptions,
  IDiff,
  IDirectoryContent,
  IFileContent,
  IFileCreateUpdateRequest,
  IFileDeleteRequest,
  IFileHistoryEntry,
  IGetCommitDiffOptions,
  IGetCommitLogOptions,
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
  TBranch,
  TCommitMessage,
  TPath,
  TRefKind,
  TResetMode,
  TSha,
  TTagName,
} from "../types";

// Repository configuration type
export interface IRepositoryConfig {
  defaultBranch?: string;
  isPrivate?: boolean;
  description?: string;
  // Add other repository configuration properties as needed
}

export type TGitBackendType = "libgit2" | "shell";

export interface IGitBackend {
  // Repository operations
  init(repoPath: TPath, config?: IRepositoryConfig): Promise<void>;
  clone(url: string, path: TPath, options?: ICloneOptions): Promise<void>;
  open(repoPath: TPath): Promise<void>;
  close(): Promise<void>;
  listRepositories(): Promise<IRepository[]>;
  getRepository(): Promise<IRepositoryDetails>;
  updateRepository(options: IRepositoryUpdateRequest): Promise<IRepositoryUpdateResponse>;
  deleteRepository(): Promise<void>;

  // Backend switching
  getCurrentBackend(): TGitBackendType;

  // Ref operations
  listRefs(type?: TRefKind | "all"): Promise<IRef[]>;
  getRef(name: string): Promise<IRef | null>;
  createRef(name: string, sha: TSha, type: TRefKind): Promise<void>;
  deleteRef(name: string): Promise<void>;
  renameRef(oldName: string, newName: string): Promise<void>;
  createBranch(name: TBranch, ref: TSha, startPoint?: TSha): Promise<IBranch>;
  createTag(name: TTagName, ref: TSha, options?: ITagCreateRequest): Promise<ITag>;
  updateRef(ref: string, options: IRefUpdateRequest): Promise<IRef>;

  // Commit operations
  listCommits(options?: IListCommitsOptions): Promise<ICommit[]>;
  getCommit(sha: TSha): Promise<ICommit>;
  createCommit(options: ICommitCreateRequest): Promise<ICommit>;
  updateCommitMessage(sha: TSha, message: TCommitMessage, force?: boolean): Promise<ICommit>;
  revert(sha: TSha): Promise<ICommit>;
  reset(target: TSha, mode: TResetMode): Promise<void>;

  // Tree operations
  listFiles(treeIsh: TSha, path?: TPath, recursive?: boolean): Promise<ITree>;
  getBlob(treeIsh: TSha, path: TPath): Promise<Buffer>;
  createTree(tree: ITreeCreateRequest): Promise<ITree>;
  createBlob(content: string, encoding?: "utf-8" | "base64"): Promise<IBlob>;
  getFileContents(path: TPath, options?: IGetFileContentOptions): Promise<IFileContent | IDirectoryContent>;
  createOrUpdateFile(path: TPath, options: IFileCreateUpdateRequest): Promise<IFileContent>;
  deleteFile(path: TPath, options: IFileDeleteRequest): Promise<void>;

  // Index operations
  getIndex(): Promise<IIndexEntry[]>;
  addToIndex(path: TPath): Promise<void>;
  removeFromIndex(path: TPath): Promise<void>;
  updateIndex(options: IIndexUpdateRequest): Promise<IIndex>;
  stagePatch(path: TPath, patchText: string): Promise<void>;
  discardWorktree(path: TPath): Promise<void>;

  // Stash operations
  listStashes(): Promise<IStash[]>;
  saveStash(message?: TCommitMessage, includeUntracked?: boolean): Promise<IStash>;
  applyStash(index?: number): Promise<void>;
  dropStash(index?: number): Promise<void>;

  // Diff operations
  diffCommits(from: TSha, to: TSha, options?: ICompareCommitsOptions): Promise<IDiff[]>;
  diffIndex(treeIsh?: TSha, cached?: boolean): Promise<IDiff[]>;
  diffWorktree(path?: TPath): Promise<IDiff[]>;
  getCommitDiff(sha: TSha, options?: IGetCommitDiffOptions): Promise<IDiff>;

  // Log operations
  getCommitLog(options?: IGetCommitLogOptions): Promise<IPaginatedResponse<ICommitLogEntry>>;
  getFileHistory(path: TPath, options?: IGetFileHistoryOptions): Promise<IPaginatedResponse<IFileHistoryEntry>>;
  blame(path: TPath, rev?: TSha): Promise<IBlameInfo>;

  // Merge/Rebase operations
  merge(branch: TBranch, options?: IMergeRequest): Promise<IMergeResult | IMergeStatus>;
  rebase(branch: TBranch, options?: IRebaseRequest): Promise<IRebaseResult | IRebaseStatus>;
  getMergeStatus(branch: TBranch): Promise<IMergeStatus>;
  getRebaseStatus(branch: TBranch): Promise<IRebaseStatus>;
  abortMerge(branch: TBranch): Promise<void>;
  abortRebase(branch: TBranch): Promise<void>;
}

export interface IBackendConfig {
  type: TGitBackendType;
  options?: Record<string, any>;
}

export interface IBackendSwitchRequest {
  to: TGitBackendType;
  graceful?: boolean;
  timeout?: number;
}

export interface IBackendSwitchResponse {
  success: boolean;
  from: TGitBackendType;
  to: TGitBackendType;
  switchedAt: Date;
}

export interface IBackendStatus {
  current: TGitBackendType;
  available: TGitBackendType[];
  healthy: boolean;
  lastSwitch?: Date;
  metrics?: {
    requests: number;
    errors: number;
    avgLatency: number;
  };
}
