import { sha256 } from "@fict/crypto";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import type { TFilePath, TFolderPath, TSHA256B58 } from "./types";
import type { TGitRepoRootPath } from "./types/git.types";

/**
 * Generates a SHA256 and Encodes it as Base58
 * @param str Stingified payload to be hashed
 * @returns Base58 encoded string
 */
export function hashNEncode(str: string): TSHA256B58 {
  return sha256(str).toBase58() as TSHA256B58;
}

export function maybeGitRepoRootPath(folderPath: TFolderPath): Promise<TGitRepoRootPath | null> {
  // .git file or folder both ok for working dir
  return Bun.file(path.resolve(folderPath, ".git"))
    .exists()
    .then((exists) => (exists ? (folderPath as TGitRepoRootPath) : null));
}

/** Searches the parent folder hierarchy till a package.json is found
 *  Returns the first folder path that contains a package.json file.
 * @param currentDir the starting folder to start the search from
 */
export async function getPackageJsonFolder(currentDir: TFolderPath = getMainScriptDirectory()): Promise<TFolderPath> {
  while (true) {
    const filePath = path.resolve(currentDir, "package.json");
    if (await Bun.file(filePath).exists()) return currentDir;
    currentDir = path.resolve(currentDir, "..") as TFolderPath;
  }
}

export function getMainScriptDirectory(): TFolderPath {
  const mainScriptPath = fileURLToPath(process.argv[1]);
  return path.dirname(mainScriptPath) as TFolderPath;
}

export function atomicFileRename(oldFilePath: TFilePath, newFilePath: TFilePath) {
  // 1. fsync the file
  const fd = fs.openSync(oldFilePath, "r+");
  fs.fsyncSync(fd);
  fs.closeSync(fd);

  // 2. fsync the *directory* so the inode entry is durable
  const dirPath = path.resolve(newFilePath, "..");
  const dirFd = fs.openSync(dirPath, "r");
  fs.fsyncSync(dirFd);
  fs.closeSync(dirFd);

  // 3. atomic rename
  return fs.renameSync(oldFilePath, newFilePath);
}
