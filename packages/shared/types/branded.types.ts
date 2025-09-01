/**
 * Branded Types for Domain API
 * These provide stricter type safety by creating unique types for semantically different strings
 */

// Create a branded type utility
declare const __brand: unique symbol;
type Brand<B> = { readonly [__brand]: B };
export type Branded<K, T> = K & Brand<T>;

// basic types
export type TName = Branded<string, "Generic Name">;

// basic file/folder path types
export type TFilePath = Branded<string, "FilePath">;
export type TFolderPath = Branded<string, "FolderPath">;

// the folder that contains .git folder (i.e. root of git repo)
export type TGitRepoRootPath = Branded<string, "GitRepoRoot">;
