/**
 * Refs (branch/tag) operation types for Git API
 * Branch and tag management with protection
 */

export interface IRef {
  name: string;
  type: 'branch' | 'tag';
  sha: string;
  target: string;
  isProtected: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: {
    name: string;
    email: string;
    date: Date;
  };
  committer: {
    name: string;
    email: string;
    date: Date;
  };
  message: string;
  parents: string[];
}

export interface IBranch extends IRef {
  type: 'branch';
  upstream?: {
    remote: string;
    branch: string;
  };
  ahead: number;
  behind: number;
  isHead: boolean;
}

export interface ITag extends IRef {
  type: 'tag';
  tagType: 'lightweight' | 'annotated';
  tagger?: {
    name: string;
    email: string;
    date: Date;
  };
  tagMessage?: string;
}

export interface IRefListRequest {
  repoPath: string;
  type?: 'branch' | 'tag' | 'all';
  pattern?: string;
  sort?: 'name' | 'date' | 'author' | 'committer';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface IRefListResponse {
  refs: IRef[];
  total: number;
  hasMore: boolean;
}

export interface IRefGetRequest {
  repoPath: string;
  name: string;
}

export interface IRefGetResponse {
  ref: IRef;
}

export interface IRefCreateRequest {
  repoPath: string;
  name: string;
  type: 'branch' | 'tag';
  startPoint?: string;
  force?: boolean;
  message?: string;
  tagType?: 'lightweight' | 'annotated';
}

export interface IRefCreateResponse {
  success: boolean;
  ref: IRef;
}

export interface IRefDeleteRequest {
  repoPath: string;
  name: string;
  force?: boolean;
}

export interface IRefDeleteResponse {
  success: boolean;
  deletedAt: Date;
}

export interface IRefRenameRequest {
  repoPath: string;
  oldName: string;
  newName: string;
  force?: boolean;
}

export interface IRefRenameResponse {
  success: boolean;
  ref: IRef;
}

export interface IRefProtectRequest {
  repoPath: string;
  name: string;
  protect: boolean;
  rules?: {
    requiredReviews?: number;
    requiredStatusChecks?: string[];
    enforceAdmins?: boolean;
    dismissStaleReviews?: boolean;
    requireCodeOwnerReviews?: boolean;
  };
}

export interface IRefProtectResponse {
  success: boolean;
  ref: IRef;
  protectionRules?: IRefProtectRequest['rules'];
}

export interface IRefUnprotectRequest {
  repoPath: string;
  name: string;
}

export interface IRefUnprotectResponse {
  success: boolean;
  ref: IRef;
}