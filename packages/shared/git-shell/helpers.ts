import type { TFilePath } from "@shared/types";
import type { TFsVCSDotGitPath } from "@shared/types/fs-vcs.types";
import type { TGitDirPath, TGitRepoRootPath } from "@shared/types/git.types";
import fs from "fs-extra";
import path from "path";
import { Writable } from "stream";

// Custom Error Types
export class NotAGitRepo extends Error {
  constructor(message: string, cause?: ErrorOptions) {
    super(message, cause); // Call the parent Error constructor
    this.name = "NotAGitRepo"; // Set a specific name for the error
    // Ensure correct prototype chain for instanceof checks after transpilation
    Object.setPrototypeOf(this, NotAGitRepo.prototype);
  }
}
export class InvalidGitRepo extends Error {
  constructor(message: string, cause?: ErrorOptions) {
    super(message, cause); // Call the parent Error constructor
    this.name = "InvalidGitRepo"; // Set a specific name for the error
    // Ensure correct prototype chain for instanceof checks after transpilation
    Object.setPrototypeOf(this, InvalidGitRepo.prototype);
  }
}
export class InvalidWorkTree extends Error {
  constructor(message: string, cause?: ErrorOptions) {
    super(message, cause); // Call the parent Error constructor
    this.name = "InvalidWorkTree"; // Set a specific name for the error
    // Ensure correct prototype chain for instanceof checks after transpilation
    Object.setPrototypeOf(this, InvalidWorkTree.prototype);
  }
}

function getGitDirFromFile(gitFilePath: TFilePath): Promise<TGitDirPath> {
  return fs.readFile(gitFilePath).then((buf) => {
    const content = buf.toString();
    const match = content.match(/^gitdir:\s*(.*)$/m); // Regex to find 'gitdir: <path>'
    if (match?.[1]) {
      const relativeGitDir = match[1].trim();
      // Resolve the path relative to the directory containing the .git file
      return path.resolve(path.dirname(gitFilePath), relativeGitDir) as TGitDirPath;
    }
    throw new InvalidGitRepo(`"${gitFilePath}" is not a valid .git file`);
  });
}

/** Asserts if a given GitRepoPath contains .git file/folder or not */
export function assertRepo(gitRepo: TGitRepoRootPath): Promise<TGitDirPath> {
  const gitEntityPath = path.resolve(gitRepo, ".git");
  return fs
    .exists(gitEntityPath)
    .catch((ex) => {
      throw new NotAGitRepo(`"${gitRepo}" Not a Git Repo. ${(ex as Error).message}`);
    })
    .then(() => fs.stat(gitEntityPath))
    .then((stat) => {
      if (stat.isDirectory()) return gitEntityPath as TGitDirPath;
      if (stat.isFile()) return getGitDirFromFile(gitEntityPath as TFilePath);
      throw new InvalidGitRepo(`"${gitEntityPath}" is not a valid .git folder nor repo`);
    });
}

/** ------ Stream Helpers ---------- */
export const syncSink  = (w: (b: string[]) => void) =>
  new Writable({
    objectMode: true,
    write(batch, _enc, cb) {
      try { w(batch); cb(); } catch (e) { cb(e as Error); }
    }
  });

export const asyncSink = (w: (b: string[]) => Promise<unknown>) =>
  new Writable({
    objectMode: true,
    write(batch, _enc, cb) { w(batch).then(() => cb(), cb); }
  });