/**
 * File API Types and Interfaces
 * Generated from packages/git-api/api-spec/tree-file-api.yml
 */

import type { TBranch, TPath, TSha } from "./branded.types";
import type { ICommitAuthor } from "./shared.types";

// Request Types
export interface ITreeCreateRequest {
  base_tree?: TSha;
  tree: Array<{
    path: TPath;
    mode: string;
    type: "blob" | "tree";
    sha?: TSha;
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
  branch?: TBranch;
  sha?: TSha;
  author?: ICommitAuthor;
  committer?: ICommitAuthor;
}

export interface IFileDeleteRequest {
  message: string;
  sha: TSha;
  branch?: TBranch;
  author?: ICommitAuthor;
  committer?: ICommitAuthor;
}

// Response Types
export interface ITree {
  sha: TSha;
  url: string;
  tree: Array<{
    path: TPath;
    mode: string;
    type: "blob" | "tree";
    size?: number;
    sha: TSha;
    url: string;
  }>;
  truncated: boolean;
}

export interface IBlob {
  sha: TSha;
  content: string;
  encoding: string;
  size: number;
  url: string;
}

export interface IFileContent {
  name: string;
  path: TPath;
  sha: TSha;
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
  path: TPath;
  sha: TSha;
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
  sha: TSha;
  message: string;
  author: ICommitAuthor;
  committer: ICommitAuthor;
  url: string;
}

// Query Parameters
export interface IGetFileContentOptions {
  ref?: TBranch;
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
