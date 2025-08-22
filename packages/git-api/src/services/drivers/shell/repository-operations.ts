import os from "os";
import { CONFIG } from "../../../config";
import type {
  ICloneOptions,
  IRepository,
  IRepositoryDetails,
  IRepositoryUpdateRequest,
  IRepositoryUpdateResponse,
  TPath,
} from "../../types";
import type { TGitBackendType } from "../backend";
import { git, okGit } from "./helpers";

export class RepositoryOperations {
  // Repository operations
  async init(repoPath: TPath, config?: { defaultBranch?: string; isPrivate?: boolean; description?: string }) {
    return git(repoPath, ["status"]) // Check if the directory is already a git repository
      .then((result) => {
        if (!result.exitCode && !result.errors) throw new Error(`repo init [${repoPath}]: already initialized`);
        return okGit(repoPath, ["init"]); // init the git repo if fresh
      })
      .then(() => {
        // switch to the given branch, if any
        if (config?.defaultBranch) {
          return okGit(repoPath, ["checkout", "-b", config.defaultBranch]);
        }
      });
  }

  clone(url: string, path: TPath, options?: ICloneOptions) {
    const args = ["clone"];
    if (options?.bare) args.push("--bare");
    if (options?.branch) args.push("--branch", options.branch);
    if (options?.depth) args.push("--depth", options.depth.toString());
    if (options?.recursive) args.push("--recursive");
    args.push(url, path);
    return okGit(os.tmpdir() as TPath, args);
  }

  async open(repoPath: TPath): Promise<void> {
    // In shell backend, we don't need to explicitly open repositories
    // Git commands will work as long as the path is correct
    return;
  }

  async close(): Promise<void> {
    // In shell backend, there's no persistent connection to close
    return;
  }

  async listRepositories(): Promise<IRepository[]> {
    // This would require scanning the REPO_BASE directory
    // For now, returning empty array as this is typically handled at a higher level
    return [];
  }

  async getRepository(): Promise<IRepositoryDetails> {
    // This would require reading repository metadata
    // Returning a basic structure for now
    throw new Error("Not implemented");
  }

  async updateRepository(options: IRepositoryUpdateRequest): Promise<IRepositoryUpdateResponse> {
    // Repository-level updates like name, description, etc. are typically
    // handled at a higher level (e.g., in a database or service layer)
    // For git-specific settings, we could update config values

    // For now, let's return a basic response
    const repoDetails = await this.getRepository();
    const updatedRepo: IRepositoryUpdateResponse = {
      ...repoDetails,
      updated_at: new Date().toISOString(),
    };

    // If there are git-specific settings to update, we would do it here
    // For example:
    // if (options.default_branch) {
    //   await git(repoPath, ["symbolic-ref", "HEAD", `refs/heads/${options.default_branch}`]);
    // }

    return updatedRepo;
  }

  async deleteRepository(): Promise<void> {
    // In a shell backend, deleting a repository would typically involve
    // filesystem operations to remove the directory
    // However, since we don't have access to the filesystem operations here
    // and this is typically handled at a higher level, we'll leave this as a placeholder
    throw new Error("Repository deletion is not implemented in the shell backend");
  }

  getCurrentBackend(): TGitBackendType {
    return "shell";
  }
}
