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

// used by shell backend
export interface IGitCmdResult {
  output: string;
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
  // Repository operations
  init(repoPath: TPath, config?: IRepositoryConfig): Promise<void | IGitCmdResult>;
  clone(url: string, path: TPath, options?: ICloneOptions): Promise<void | IGitCmdResult>;
  open(repoPath: TPath): Promise<void | IGitCmdResult>;
  close(): Promise<void | IGitCmdResult>;
  listRepositories(): Promise<IRepository[]>;
  getRepository(): Promise<IRepositoryDetails>;
  updateRepository(options: IRepositoryUpdateRequest): Promise<IRepositoryUpdateResponse>;
  deleteRepository(): Promise<void | IGitCmdResult>;

  // Backend switching
  getCurrentBackend(): TGitBackendType;

  // Ref operations
  listRefs(type?: TRefKind | "all"): Promise<IRef[]>;
  getRef(name: string): Promise<IRef | null>;
  createRef(name: string, sha: TSha, type: TRefKind): Promise<void | IGitCmdResult>;
  deleteRef(name: string): Promise<void | IGitCmdResult>;
  renameRef(oldName: string, newName: string): Promise<void | IGitCmdResult>;
  createBranch(name: TBranch, ref: TSha, startPoint?: TSha): Promise<IBranch>;
  createTag(name: TTagName, ref: TSha, options?: ITagCreateRequest): Promise<ITag>;
  updateRef(ref: string, options: IRefUpdateRequest): Promise<IRef>;

  // Commit operations
  listCommits(options?: IListCommitsOptions): Promise<ICommit[]>;
  getCommit(sha: TSha): Promise<ICommit>;
  createCommit(options: ICommitCreateRequest): Promise<ICommit>;
  updateCommitMessage(sha: TSha, message: TCommitMessage, force?: boolean): Promise<ICommit>;
  revert(sha: TSha): Promise<ICommit>;
  reset(target: TSha, mode: TResetMode): Promise<void | IGitCmdResult>;

  // Tree operations
  listFiles(treeIsh: TSha, path?: TPath, recursive?: boolean): Promise<ITree>;
  getBlob(treeIsh: TSha, path: TPath): Promise<Buffer>;
  createTree(tree: ITreeCreateRequest): Promise<ITree>;
  createBlob(content: string, encoding?: "utf-8" | "base64"): Promise<IBlob>;
  getFileContents(path: TPath, options?: IGetFileContentOptions): Promise<IFileContent | IDirectoryContent>;
  createOrUpdateFile(path: TPath, options: IFileCreateUpdateRequest): Promise<IFileContent>;
  deleteFile(path: TPath, options: IFileDeleteRequest): Promise<void | IGitCmdResult>;

  // Index operations
  getIndex(repo: TPath): Promise<IIndexEntry[]>;
  addToIndex(repo: TPath, path: TPath): Promise<void | IGitCmdResult>;
  removeFromIndex(repo: TPath, path: TPath): Promise<void | IGitCmdResult>;
  updateIndex(repo: TPath, options: IIndexUpdateRequest): Promise<IIndex>;
  stagePatch(repo: TPath, path: TPath, patchText: string): Promise<void | IGitCmdResult>;
  discardWorktree(repo: TPath, path?: TPath): Promise<IGitCmdResult | void>;

  // Stash operations
  listStashes(): Promise<IStash[]>;
  saveStash(message?: TCommitMessage, includeUntracked?: boolean): Promise<IStash>;
  applyStash(index?: number): Promise<void | IGitCmdResult>;
  dropStash(index?: number): Promise<void | IGitCmdResult>;

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
  abortMerge(branch: TBranch): Promise<void | IGitCmdResult>;
  abortRebase(branch: TBranch): Promise<void | IGitCmdResult>;
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
