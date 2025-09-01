/**
 * Semantc-Repo Types
 */
import type { Branded, TFilePath, TFolderPath, TName } from "./branded.types";

// The home folder which contains .berg10, usually same as user home folder
export type TSemanticReposHomePath = Branded<TFolderPath, "SRepos Home Path">;

// a semantic repo == .berg10 folder, contains {vcs, dbRoot, groups, index, entities ...} folders
export type TSemanticRepoRootPath = Branded<TFolderPath, "SemanticRepoRoot">;
