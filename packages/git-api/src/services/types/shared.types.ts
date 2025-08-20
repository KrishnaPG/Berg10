/**
 * Shared Types and Interfaces
 * Common types used across multiple service types
 */

// User and Permission Types
export interface IUser {
  id: string;
  name: string;
  email: string;
}

export interface IPermissions {
  admin: boolean;
  push: boolean;
  pull: boolean;
}

// Commit Related Types
export interface ICommitAuthor {
  name: string;
  email: string;
  date: string;
}

export interface IPaginatedResponse<T> {
  pagination: {
    total_items: number;
    total_pages: number;
    current_page: number;
    per_page: number;
  };
  items: T[];
}

export interface ICommitSummary {
  sha: string;
  message: string;
  author: ICommitAuthor;
  committer: ICommitAuthor;
  timestamp: string;
  url: string;
}