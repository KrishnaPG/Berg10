/**
 * Repository operation types for Git API
 * Ultra-high-performance repository management
 */

export interface IRepositoryConfig {
  bare?: boolean;
  shared?: boolean;
  template?: string;
  gitDir?: string;
  workTree?: string;
  core?: {
    autocrlf?: boolean;
    safecrlf?: boolean;
    eol?: "lf" | "crlf" | "native";
    filemode?: boolean;
    ignorecase?: boolean;
    precomposeunicode?: boolean;
    logallrefupdates?: boolean;
    repositoryformatversion?: number;
  };
  user?: {
    name?: string;
    email?: string;
    signingkey?: string;
  };
  remote?: Record<
    string,
    {
      url: string;
      fetch?: string[];
      push?: string[];
    }
  >;
}

export interface IRepositoryInitRequest {
  path: string;
  bare?: boolean;
  initialBranch?: string;
  config?: IRepositoryConfig;
}

export interface IRepositoryInitResponse {
  success: boolean;
  path: string;
  bare: boolean;
  initialBranch: string;
  createdAt: Date;
}

export interface IRepositoryDeleteRequest {
  path: string;
  force?: boolean;
}

export interface IRepositoryDeleteResponse {
  success: boolean;
  path: string;
  deletedAt: Date;
}

export interface IRepositoryCloneRequest {
  url: string;
  path: string;
  bare?: boolean;
  mirror?: boolean;
  branch?: string;
  depth?: number;
  singleBranch?: boolean;
  tags?: boolean;
  recursive?: boolean;
  config?: IRepositoryConfig;
}

export interface IRepositoryCloneResponse {
  success: boolean;
  path: string;
  url: string;
  clonedAt: Date;
  size: number;
  commitCount: number;
}

export interface IRepositoryMirrorRequest {
  url: string;
  path: string;
  bare?: boolean;
  mirrorFlags?: string[];
}

export interface IRepositoryMirrorResponse {
  success: boolean;
  path: string;
  url: string;
  mirroredAt: Date;
  refsSynced: number;
}

export interface IRepositoryGCRequest {
  path: string;
  aggressive?: boolean;
  prune?: "now" | "expire" | Date;
  quiet?: boolean;
}

export interface IRepositoryGCResponse {
  success: boolean;
  path: string;
  beforeSize: number;
  afterSize: number;
  reclaimed: number;
  objectsBefore: number;
  objectsAfter: number;
  packsBefore: number;
  packsAfter: number;
}

export interface IRepositoryConfigRequest {
  path: string;
  key?: string;
  value?: string;
  global?: boolean;
  local?: boolean;
  system?: boolean;
  file?: string;
  unset?: boolean;
  getAll?: boolean;
  add?: boolean;
  replaceAll?: boolean;
}

export interface IRepositoryConfigResponse {
  success: boolean;
  path: string;
  configs: Record<string, string | string[]>;
}

export interface IRepositoryInfo {
  path: string;
  bare: boolean;
  workTree: string;
  gitDir: string;
  branches: number;
  tags: number;
  remotes: string[];
  head: string;
  lastCommit: {
    sha: string;
    message: string;
    author: string;
    date: Date;
  };
  size: number;
  isShallow: boolean;
}

export interface ICloneOptions {
  url: string;
  directory: string;
  bare?: boolean;
  mirror?: boolean;
  branch?: string;
  depth?: number;
  recursive?: boolean;
  singleBranch?: boolean;
  noCheckout?: boolean;
}

export interface IMirrorOptions extends ICloneOptions {
  mirror: true;
}

export interface IGarbageCollectOptions {
  aggressive?: boolean;
  auto?: boolean;
  prune?: boolean;
  pruneExpire?: string;
  quiet?: boolean;
}

export interface IRemote {
  name: string;
  url: string;
  fetchRefspecs: string[];
  pushRefspecs: string[];
}