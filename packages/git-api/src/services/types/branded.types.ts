/**
 * Branded Types for Git API
 * These provide stricter type safety by creating unique types for semantically different strings
 */

// Create a branded type utility
declare const __brand: unique symbol;
type Brand<B> = { readonly [__brand]: B };
type Branded<K, T> = K & Brand<T>;

// Branded types for Git-specific values
export type TSha = Branded<string, "Sha">;
export type TBranch = Branded<string, "Branch">;
export type TPath = Branded<string, "Path">;
export type TAuthor = Branded<string, "Author">;
export type TEmail = Branded<string, "Email">;
export type TCommitMessage = Branded<string, "CommitMessage">;
export type TTagName = Branded<string, "TagName">;
export type TRepositoryName = Branded<string, "RepositoryName">;
export type TRepositoryId = Branded<string, "RepositoryId">;
export type TUserId = Branded<string, "UserId">;

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