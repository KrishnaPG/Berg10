import { sha256 } from "@fict/crypto";
import { resolve } from "path";
import type { TFolderPath, TSHA256B58 } from "./types";
import type { TGitRepoRootPath } from "./types/git.types";

/**
 * Generates a SHA256 and Encodes it as Base58
 * @param str Stingified payload to be hashed
 * @returns Base58 encoded string
 */
export function hashNEncode(str: string): TSHA256B58 {
  return sha256(str).toBase58() as TSHA256B58;
}

export function maybeGitRepoRootPath(path: TFolderPath): Promise<TGitRepoRootPath | null> {
  // .git file or folder both ok for working dir
  return Bun.file(resolve(path, ".git"))
    .exists()
    .then((exists) => (exists ? (path as TGitRepoRootPath) : null));
}

/** Searches the parent folder hierarchy till a package.json is found
 *  Returns the first folder path that contains a package.json file.
 * @param currentDir the starting folder to start the search from
 */
export async function getPackageJsonFolder(
  currentDir: TFolderPath = import.meta.dir as TFolderPath,
): Promise<TFolderPath> {
  while (true) {
    const filePath = resolve(currentDir, "package.json");
    if (await Bun.file(filePath).exists()) return currentDir;
    currentDir = resolve(currentDir, "..") as TFolderPath;
  }
}
