/**
 * Branded Types for Domain API
 * These provide stricter type safety by creating unique types for semantically different strings
 */

// Create a branded type utility
export declare const __brand: unique symbol;

// The brand stores both the root base-type and the accumulated tags
export type Brand<Root, Tags extends string> = {
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
export type TEMail = Branded<string, "EMail">;

export type TSize = Branded<number, "Size">;
export type TCount = Branded<number, "Count">;
export type TIndexPos = Branded<number, "IndexPos">;

// time types
export type TMSSinceEpoch = Branded<number, "MSSinceEpoch">;


// basic file/folder path types
export type TFilePath = Branded<string, "FilePath">;
export type TFolderPath = Branded<string, "FolderPath">;
export type TFileHandle = Branded<number, "FileHandler">;

// Encoded Strings
export type TB58String = Branded<string, "B58String">;
export type TB64String = Branded<string, "B64String">;
export type THexString = Branded<string, "HexString">;

// SHA256
export type TSHA256B58 = Branded<TB58String, "sha256 base58 string">;
export type TSHA256B64 = Branded<TB64String, "sha256 base64 string">;
export type TSHA256Hex = Branded<TB58String, "sha256 hex string">;

// Time String
export type TISOString = Branded<string, "ISO Time String">

// SQL String
export type TSQLString = Branded<string, "SQL">;