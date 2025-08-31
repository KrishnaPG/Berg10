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
  IRepoInfo,
  IRepository,
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

// used by shell backend
export type IShellOutput = string;

export interface IGitCmdResult {
  output: IShellOutput;
  errors: string;
  exitCode: number;
  cmd: string[];
}

// Repository configuration type
export interface IRepositoryConfig {
  defaultBranch?: string;
  isPrivate?: boolean;
  description?: string;
  // Add other repository configuration properties as needed
}

export type TGitBackendType = "libgit2" | "shell" | "isogit";

export interface IGitBackend {
  init(repoPath: TPath, config?: IRepositoryConfig): Promise<IGitRepo>;
  open(repoPath: TPath): Promise<IGitRepo> ;
  clone(url: string, path: TPath, options?: ICloneOptions): Promise<void | string>;
  // listRepositories(): Promise<IRepository[]>;
  // updateRepository(options: IRepositoryUpdateRequest): Promise<IRepositoryUpdateResponse>;
  // deleteRepository(): Promise<void | IGitCmdResult>;

  // Backend switching
  getCurrentBackend(): TGitBackendType;
}

export interface IGitRepo {
  getInfo(): Promise<IRepoInfo>;
  close(): Promise<unknown>;

  // Ref operations
  listRefs(type?: TRefKind | "all"): Promise<IRef[]>;
  getRef(name: string): Promise<IRef | null>;
  createRef(name: string, sha: TSha, type: TRefKind): Promise<unknown>;
  deleteRef(name: string): Promise<unknown>;
  renameRef(oldName: string, newName: string): Promise<unknown>;
  createBranch(name: TBranch, ref: TSha, startPoint?: TSha): Promise<IBranch>;
  createTag(name: TTagName, ref: TSha, options?: ITagCreateRequest): Promise<unknown>;
  updateRef(ref: string, options: IRefUpdateRequest): Promise<IRef>;

  // Commit operations
  listCommits(options?: IListCommitsOptions): Promise<ICommit[]>;
  getCommit(sha: TSha): Promise<ICommit>;
  createCommit(options: ICommitCreateRequest): Promise<unknown>;
  updateCommitMessage(sha: TSha, message: TCommitMessage, force?: boolean): Promise<ICommit>;
  revert(sha: TSha): Promise<ICommit>;
  reset(target: TSha, mode: TResetMode): Promise<unknown>;

  // Tree operations
  listFiles(treeIsh: TSha, path?: TPath, recursive?: boolean): Promise<ITree>;
  getBlob(treeIsh: TSha, path: TPath): Promise<Buffer>;
  createTree(tree: ITreeCreateRequest): Promise<ITree>;
  createBlob(content: string, encoding?: "utf-8" | "base64"): Promise<IBlob>;
  getFileContents(path: TPath, options?: IGetFileContentOptions): Promise<IFileContent | IDirectoryContent>;
  createOrUpdateFile(path: TPath, options: IFileCreateUpdateRequest): Promise<IFileContent>;
  deleteFile(path: TPath, options: IFileDeleteRequest): Promise<unknown>;

  // Index operations
  getIndex(): Promise<IIndexEntry[]>;
  addToIndex(path: TPath): Promise<unknown>;
  removeFromIndex(path: TPath): Promise<unknown>;
  updateIndex(options: IIndexUpdateRequest): Promise<IIndex>;
  stagePatch(path: TPath, patchText: string): Promise<unknown>;
  discardWorktree(path?: TPath): Promise<unknown>;

  // Stash operations
  listStashes(): Promise<IStash[]>;
  saveStash(message?: TCommitMessage, includeUntracked?: boolean): Promise<IStash>;
  applyStash(index?: number): Promise<unknown>;
  dropStash(index?: number): Promise<unknown>;

  // Diff operations
  diffCommits(from: TSha, to: TSha, options?: ICompareCommitsOptions): Promise<IDiff[]>;
  diffIndex(treeIsh?: TSha, cached?: boolean): Promise<IDiff[]>;
  diffWorktree(path?: TPath): Promise<IDiff[]>;
  getCommitDiff(sha: TSha, options?: IGetCommitDiffOptions): Promise<IDiff>;

  // Log operations
  getCommitLog(options?: IGetCommitLogOptions): Promise<IPaginatedResponse<ICommitLogEntry>>;
  getFileHistory(path: TPath, options?: IGetFileHistoryOptions): Promise<IPaginatedResponse<IFileHistoryEntry>>;
  blame(path: TPath, rev?: TBranch): Promise<IBlameInfo>;

  // Merge/Rebase operations
  merge(branch: TBranch, options?: IMergeRequest): Promise<IMergeResult | IMergeStatus>;
  rebase(branch: TBranch, options?: IRebaseRequest): Promise<IRebaseResult | IRebaseStatus>;
  getMergeStatus(branch: TBranch): Promise<IMergeStatus>;
  getRebaseStatus(branch: TBranch): Promise<IRebaseStatus>;
  abortMerge(branch: TBranch): Promise<unknown>;
  abortRebase(branch: TBranch): Promise<unknown>;
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
