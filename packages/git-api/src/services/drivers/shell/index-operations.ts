import type { IIndex, IIndexEntry, IIndexUpdateRequest, TPath } from "../../types";
import type { IGitCmdResult } from "../backend";
import { git, IRepoBase, okGit } from "./helpers";

export class IndexOperations extends IRepoBase {
  // Index operations
  async getIndex(): Promise<IIndexEntry[]> {
    const { output: out } = await okGit(this.repoPath, ["diff", "--cached", "--name-status", "-z"]);
    return out
      .trim()
      .split("\0")
      .filter((line) => line.length > 0)
      .map((line) => {
        const [status, filePath] = line.split("\t");
        return {
          path: filePath as TPath,
          mode: "", // Would need separate command to get mode
          blob: {
            sha: "", // Would need separate command to get sha
            size: 0,
            url: "",
          },
          status: status as any,
          changes: {
            additions: 0,
            deletions: 0,
            total: 0,
          },
        };
      });
  }

  async addToIndex(path: TPath): Promise<void> {
    await okGit(this.repoPath, ["add", path]);
  }

  async removeFromIndex(path: TPath): Promise<void> {
    await okGit(this.repoPath, ["rm", "--cached", path]);
  }

  async updateIndex(options: IIndexUpdateRequest): Promise<IIndex> {
    // Update index with the provided content
    for (const update of options.updates) {
      // Write the content to the file
      // Note: This is a simplified implementation that would need filesystem access
      // In a real implementation, we would write the content to the file system
      // and then add it to the index

      // For now, we'll just add the file to the index
      await okGit(this.repoPath, ["add", update.path]);
    }

    // Return the updated index
    const entries = await this.getIndex();
    return {
      repo: "",
      ref: "",
      entries,
      stats: {
        staged_files: entries.length,
        staged_additions: 0,
        staged_modifications: 0,
        staged_deletions: 0,
      },
      tree: {
        sha: "",
        url: "",
      },
    };
  }

  async stagePatch(path: TPath, patchText: string): Promise<void> {
    await git(this.repoPath, ["apply", "--cached"], { stdin: Buffer.from(patchText) });
  }

  async discardWorktree(path?: TPath): Promise<void | IGitCmdResult> {
    // if a single file needs to be reverted back to its HEAD commit state
    if (path) return okGit(this.repoPath, ["checkout", "--", path]);
    // discard all the local changes
    okGit(this.repoPath, ["switch", "--discard-changes", "--recurse-submodules"]);
  }
}
