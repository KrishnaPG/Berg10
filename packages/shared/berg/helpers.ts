import type { TGitRepoRootPath } from "@shared/types/git.types";
import fs from "fs-extra";
import path from "path";

/** Asserts if a given GitRepoPath contains .git file/folder or not */
export function assertRepo(gitRepo: TGitRepoRootPath): Promise<boolean> {
  return fs.pathExists(path.resolve(gitRepo, ".git"));
}

// Custom Error Types
export class InvalidGitRepo extends Error {
  constructor(message: string, cause?: ErrorOptions) {
    super(message, cause); // Call the parent Error constructor
    this.name = "InvalidGitRepo"; // Set a specific name for the error
    // Ensure correct prototype chain for instanceof checks after transpilation
    Object.setPrototypeOf(this, InvalidGitRepo.prototype);
  }
}
