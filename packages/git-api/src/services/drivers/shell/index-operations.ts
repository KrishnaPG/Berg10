import type { IIndex, IIndexEntry, IIndexUpdateRequest, TPath } from "../../types";
import { git, type IGitCmdResult, okGit } from "./helpers";

export class IndexOperations {
  // Index operations
  async getIndex(repo: TPath): Promise<IIndexEntry[]> {
    const { output: out } = await okGit(repo, ["diff", "--cached", "--name-status", "-z"]);
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

  async addToIndex(repo: TPath, path: TPath): Promise<void> {
    await okGit(repo, ["add", path]);
  }

  async removeFromIndex(repo: TPath, path: TPath): Promise<void> {
    await okGit(repo, ["rm", "--cached", path]);
  }

  async updateIndex(repo: TPath, options: IIndexUpdateRequest): Promise<IIndex> {
    // Update index with the provided content
    for (const update of options.updates) {
      // Write the content to the file
      // Note: This is a simplified implementation that would need filesystem access
      // In a real implementation, we would write the content to the file system
      // and then add it to the index

      // For now, we'll just add the file to the index
      await okGit(repo, ["add", update.path]);
    }

    // Return the updated index
    const entries = await this.getIndex(repo);
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

  async stagePatch(repo: TPath, path: TPath, patchText: string): Promise<void> {
    await git(repo, ["apply", "--cached"], { stdin: Buffer.from(patchText) });
  }

  async discardWorktree(repo: TPath, path?: TPath): Promise<void | IGitCmdResult> {
    // if a single file needs to be reverted back to its HEAD commit state
    if (path) return okGit(repo, ["checkout", "--", path]);
    // discard all the local changes
    okGit(repo, ["switch", "--discard-changes", "--recurse-submodules"]);
  }
}
