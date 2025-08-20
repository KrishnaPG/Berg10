/**
 * File API Types and Interfaces
 * Generated from packages/git-api/api-spec/tree-file-api.yml
 */

import type { ICommitAuthor } from "./shared.types";

// Request Types
export interface ITreeCreateRequest {
  base_tree?: string;
  tree: Array<{
    path: string;
    mode: string;
    type: "blob" | "tree";
    sha?: string;
  }>;
}

export interface IBlobCreateRequest {
  content: string;
  encoding?: "utf-8" | "base64";
}

export interface IFileCreateUpdateRequest {
  message: string;
  content: string;
  encoding?: "utf-8" | "base64";
  branch?: string;
  sha?: string;
  author?: ICommitAuthor;
  committer?: ICommitAuthor;
}

export interface IFileDeleteRequest {
  message: string;
  sha: string;
  branch?: string;
  author?: ICommitAuthor;
  committer?: ICommitAuthor;
}

// Response Types
export interface ITree {
  sha: string;
  url: string;
  tree: Array<{
    path: string;
    mode: string;
    type: "blob" | "tree";
    size?: number;
    sha: string;
    url: string;
  }>;
  truncated: boolean;
}

export interface IBlob {
  sha: string;
  content: string;
  encoding: string;
  size: number;
  url: string;
}

export interface IFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: "file";
  content: string;
  encoding: string;
  _links: {
    git: string;
    self: string;
    html: string;
  };
}

export interface IDirectoryContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: null;
  type: "dir";
  _links: {
    git: string;
    self: string;
    html: string;
  };
}

// Supporting Types
export interface IFileCommit {
  sha: string;
  message: string;
  author: ICommitAuthor;
  committer: ICommitAuthor;
  url: string;
}

// Query Parameters
export interface IGetFileContentOptions {
  ref?: string;
}

export interface IGetTreeOptions {
  recursive?: boolean;
}

// Service Method Return Types
export type TGetTreeResult = ITree;
export type TCreateTreeResult = ITree;
export type TGetBlobResult = IBlob;
export type TCreateBlobResult = IBlob;
export type TGetFileContentResult = IFileContent | IDirectoryContent;
export type TCreateOrUpdateFileResult = IFileContent;
export type TDeleteFileResult = {
  commit: IFileCommit;
  content: {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string;
    type: string;
    _links: {
      git: string;
      self: string;
      html: string;
    };
  };
};
export type TMoveFileResult = IFileContent;
