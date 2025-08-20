/**
 * Branded Types for Git API
 * These provide stricter type safety by creating unique types for semantically different strings
 */

// Create a branded type utility
type Brand<K, T> = K & { __brand: T };

// Branded types for Git-specific values
export type TSha = Brand<string, "Sha">;
export type TBranch = Brand<string, "Branch">;
export type TPath = Brand<string, "Path">;
export type TAuthor = Brand<string, "Author">;
export type TEmail = Brand<string, "Email">;
export type TCommitMessage = Brand<string, "CommitMessage">;
export type TTagName = Brand<string, "TagName">;
export type TRepositoryName = Brand<string, "RepositoryName">;
export type TRepositoryId = Brand<string, "RepositoryId">;
export type TUserId = Brand<string, "UserId">;

// Utility functions to create branded types (for runtime validation)
export const asSha = (sha: string): TSha => sha as TSha;
export const asBranch = (branch: string): TBranch => branch as TBranch;
export const asPath = (path: string): TPath => path as TPath;
export const asAuthor = (author: string): TAuthor => author as TAuthor;
export const asEmail = (email: string): TEmail => email as TEmail;
export const asCommitMessage = (message: string): TCommitMessage => message as TCommitMessage;
export const asTagName = (tagName: string): TTagName => tagName as TTagName;
export const asRepositoryName = (name: string): TRepositoryName => name as TRepositoryName;
export const asRepositoryId = (id: string): TRepositoryId => id as TRepositoryId;
export const asUserId = (id: string): TUserId => id as TUserId;