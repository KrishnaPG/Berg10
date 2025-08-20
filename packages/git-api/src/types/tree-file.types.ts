/**
 * Tree/File operation types for Git API
 * File and directory management within git trees
 */

export interface IFileEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size: number;
  content?: string | Buffer;
  encoding?: 'utf8' | 'binary' | 'base64';
}

export interface ITree {
  sha: string;
  entries: IFileEntry[];
  isRecursive?: boolean;
}

export interface IFileListRequest {
  repoPath: string;
  treeIsh: string;
  path?: string;
  recursive?: boolean;
  includeContent?: boolean;
  maxDepth?: number;
  limit?: number;
  offset?: number;
}

export interface IFileListResponse {
  files: IFileEntry[];
  tree: ITree;
  total: number;
  hasMore: boolean;
}

export interface IFileGetRequest {
  repoPath: string;
  treeIsh: string;
  path: string;
  encoding?: 'utf8' | 'binary' | 'base64';
}

export interface IFileGetResponse {
  file: IFileEntry;
  content: string | Buffer;
}

export interface IFilePutRequest {
  repoPath: string;
  path: string;
  content: string | Buffer;
  mode?: string;
  encoding?: 'utf8' | 'binary' | 'base64';
  treeIsh?: string;
  message?: string;
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
  sign?: boolean;
  gpgKey?: string;
}

export interface IFilePutResponse {
  success: boolean;
  file: IFileEntry;
  commit?: {
    sha: string;
    message: string;
  };
}

export interface IFileDeleteRequest {
  repoPath: string;
  path: string;
  treeIsh?: string;
  message?: string;
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
  sign?: boolean;
  gpgKey?: string;
}

export interface IFileDeleteResponse {
  success: boolean;
  deletedPath: string;
  commit?: {
    sha: string;
    message: string;
  };
}

export interface IFileMoveRequest {
  repoPath: string;
  oldPath: string;
  newPath: string;
  treeIsh?: string;
  message?: string;
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
  sign?: boolean;
  gpgKey?: string;
}

export interface IFileMoveResponse {
  success: boolean;
  oldPath: string;
  newPath: string;
  commit?: {
    sha: string;
    message: string;
  };
}

export interface IFileStats {
  path: string;
  size: number;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  lastModified: Date;
  isExecutable: boolean;
  isSymlink: boolean;
}