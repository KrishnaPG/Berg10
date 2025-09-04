import type { Branded, TCount, TEMail, TIndexPos, TISOString, TName, TSHA256Hex, TSize } from "./branded.types";

// Git Object Types
export type TGitObjectId = Branded<TSHA256Hex, "GitObjectId">;
export type TCommitHash = Branded<TGitObjectId, "CommitHash">;
export type TTreeHash = Branded<TGitObjectId, "TreeHash">;
export type TBlobHash = Branded<TGitObjectId, "BlobHash">;
export type TTagHash = Branded<TGitObjectId, "TagHash">;

// Git Reference Types
export type TRefName = Branded<TName, "RefName">;
export type TBranchName = Branded<TRefName, "BranchName">;
export type TTagName = Branded<TRefName, "TagName">;
export type TRemoteName = Branded<TName, "RemoteName">;

// Author/Commit Types
export type TAuthorName = Branded<TName, "AuthorName">;
export type TAuthorEmail = Branded<TEMail, "AuthorEmail">;
export type TCommitMessage = Branded<string, "CommitMessage">;

// Time Types
export type TCommitTimestamp = Branded<TISOString, "CommitTimestamp">;
export type TAuthorTimestamp = Branded<TISOString, "AuthorTimestamp">;

// Size Types
export type TFileSize = Branded<TSize, "FileSizeBytes">;
export type TTreeEntryCount = Branded<TCount, "TreeEntryCount">;

// Index Types
export type TIndexPosition = TIndexPos;
export type TIndexEntryCount = Branded<TCount, "IndexEntryCount">;
