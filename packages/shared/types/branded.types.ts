/**
 * Branded Types for Domain API
 * These provide stricter type safety by creating unique types for semantically different strings
 */

// Create a branded type utility
declare const __brand: unique symbol;

// The brand stores both the root base-type and the accumulated tags
type Brand<Root, Tags extends string> = {
  readonly [__brand]: {
    root: Root;
    tags: Record<Tags, true>;
  };
};

// Accumulate brands and preserve root
export type Branded<Base, Tag extends string> =
  Base extends { readonly [__brand]: { root: infer R; tags: infer T } }
    ? R & Brand<R, keyof T & string | Tag> // merge existing tags + new tag
    : Base & Brand<Base, Tag>;

/**
 * Type extraction helpers
 * @example
 *  ```ts
      type RootType = RootOf<TGitRepoRootPath>; // string
      type AllTags = TagsOf<TGitRepoRootPath>; // "FolderPath" | "GitRepoRoot"
 *  ```
 */
export type RootOf<T> = T extends { readonly [__brand]: { root: infer R } } ? R : never;
export type TagsOf<T> = T extends { readonly [__brand]: { tags: Record<infer K, true> } } ? K : never;


// basic types
export type TName = Branded<string, "Generic Name">;

// basic file/folder path types
export type TFilePath = Branded<string, "FilePath">;
export type TFolderPath = Branded<string, "FolderPath">;

/** The working directory that contains `.git` file/folder (i.e. root of a git repo) */
export type TGitRepoRootPath = Branded<TFolderPath, "GitRepoRoot">;

// Base58
export type TB58String = Branded<string, "B58String">;

// SHA256
export type TSHA256B58 = Branded<TB58String, "sha256 base58 string">;

export type TISOString = Branded<string, "ISO Time String">