import { sha256 } from "@fict/crypto";
import fs from "fs/promises";
import path from "path";
import type { TFilePath, TFolderPath, TSHA256B58 } from "../types";
import type { TGitRepoRootPath } from "../types/git.types";

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
  return path.dirname(process.argv[1]) as TFolderPath;
}

/**
 * Crash-safe rename(2) using only promise-based APIs.
 * Returns a promise that resolves when both file data and the
 * directory entry are known to be on-disk.
 */
export async function atomicFileRename(oldFilePath: TFilePath, newFilePath: TFilePath) {
  // 1. Flush the *old* file’s data blocks.
  const fileH = await fs.open(oldFilePath, "r+");
  await fileH.sync(); // fsync
  await fileH.close();

  // 2. Atomic rename.
  await fs.rename(oldFilePath, newFilePath);

  // 3. Flush the *destination* directory.
  const dir = path.dirname(newFilePath);
  const dirH = await fs.open(dir, fs.constants.O_RDWR | fs.constants.O_DIRECTORY);
  await dirH.sync(); // fsync
  await dirH.close();
}

export function getRandomId(now: number = Date.now()) {
  return `${Math.random().toString(36).slice(2)}-${now.toString(36)}`;
}

export function isFileEmpty(file: Bun.BunFile): Promise<boolean> {
  return file.stat().then(({ size }) => size === 0);
}

/** replaces the file extension with a random suffixed temp
 * (e.g. `c:\\abc\\filename.parquet` -> `c:\\abc\\filename-a0tjh3jkw7c-mfvxm6fl-csv.tmp`)
 * */
const swapExt = (p: string, newExt: string) => p.replace(/\.[^.\\/:*?"<>|\r\n]+$/, newExt); // strip last dot–suffix
export function genTempFilePath(filePath: TFilePath, newExt: string = ".tmp") {
  return swapExt(filePath, `-${getRandomId()}${newExt}`) as TFilePath;
}
