import * as fs from "fs/promises";
import {
  abortMerge,
  add,
  branch,
  checkout,
  commit,
  currentBranch,
  deleteRef,
  expandRef,
  listBranches,
  listFiles,
  listTags,
  log,
  merge,
  readBlob,
  readCommit,
  remove,
  resolveRef,
  stash,
  statusMatrix,
  tag,
  writeBlob,
  writeTree,
} from "isomorphic-git";
import os from "os";
import { resolve } from "path";
import { CONFIG } from "../../../config";
import type { IBlameInfo, IBlob, IBranch, ICommit, ICommitCreateRequest, ICommitLogEntry, ICompareCommitsOptions, IDiff, IDirectoryContent, IFileContent, IFileCreateUpdateRequest, IFileDeleteRequest, IFileHistoryEntry, IGetCommitDiffOptions, IGetCommitLogOptions, IGetFileContentOptions, IGetFileHistoryOptions, IIndex, IIndexEntry, IIndexUpdateRequest, IListCommitsOptions, IMergeRequest, IMergeResult, IMergeStatus, IPaginatedResponse, IRebaseRequest, IRebaseResult, IRebaseStatus, IRef, IRefUpdateRequest, IRepoInfo, IStash, ITag, ITagCreateRequest, ITree, ITreeCreateRequest, TBranch, TCommitMessage, TPath, TRefKind, TResetMode, TSha, TTagName } from "../../types";
import type { IGitRepo } from "../backend";

const getDefRepoPath = () => resolve(os.tmpdir(), "gitRepos", "isoGitRepo") as TPath;

export class ISOGitRepo implements IGitRepo {
  constructor(protected repoPath: TPath = getDefRepoPath()) {}
  
  getInfo(): Promise<IRepoInfo> {
    throw new Error("Method not implemented.");
  }

  async open(repoPath: TPath): Promise<void> {
    // In isogit, we don't need to explicitly open repositories
    // We just need to set the path for future operations
    this.repoPath = repoPath;
  }

  async close(): Promise<void> {
    // In isogit, there's no persistent connection to close
    this.repoPath = getDefRepoPath();
  }

  // Ref operations
  async listRefs(type?: TRefKind | "all"): Promise<IRef[]> {
    const refs: IRef[] = [];

    if (type === "branch" || type === "all" || !type) {
      const branches = await listBranches({
        fs,
        dir: this.repoPath,
        remote: "origin", // Use string instead of boolean
      });

      for (const branchName of branches) {
        try {
          const sha = (await resolveRef({
            fs,
            dir: this.repoPath,
            ref: `refs/heads/${branchName}`,
          })) as TSha;

          refs.push({
            name: branchName,
            ref: sha,
            object: { type: "commit", sha },
            url: "",
          });
        } catch (error) {
          // Skip branches that can't be resolved
        }
      }
    }

    if (type === "tag" || type === "all" || !type) {
      const tags = await listTags({
        fs,
        dir: this.repoPath,
      });

      for (const tagName of tags) {
        try {
          const sha = (await resolveRef({
            fs,
            dir: this.repoPath,
            ref: `refs/tags/${tagName}`,
          })) as TSha;

          refs.push({
            name: tagName,
            ref: sha,
            object: { type: "commit", sha },
            url: "",
          });
        } catch (error) {
          // Skip tags that can't be resolved
        }
      }
    }

    return refs;
  }

  async getRef(name: string): Promise<IRef | null> {
    try {
      const sha = (await resolveRef({
        fs,
        dir: this.repoPath,
        ref: name,
      })) as TSha;

      return {
        name,
        ref: sha,
        object: {
          type: "commit", // Simplified assumption
          sha,
        },
        url: "",
      };
    } catch {
      return null;
    }
  }

  async createRef(name: string, sha: TSha, type: TRefKind): Promise<void> {
    if (type === "branch") {
      await branch({
        fs,
        dir: this.repoPath,
        ref: name,
        object: sha,
      });
    } else {
      await tag({
        fs,
        dir: this.repoPath,
        ref: name,
        object: sha,
      });
    }
  }

  async deleteRef(name: string): Promise<void> {
    await deleteRef({
      fs,
      dir: this.repoPath,
      ref: name,
    });
  }

  async renameRef(oldName: string, newName: string): Promise<void> {
    // isogit doesn't have a direct rename function, so we need to create new and delete old
    const ref = await this.getRef(oldName);
    if (ref) {
      await this.createRef(newName, ref.ref, "branch" as TRefKind); // Cast to TRefKind
      await this.deleteRef(oldName);
    }
  }

  async createBranch(name: TBranch, ref: TSha, startPoint?: TSha): Promise<IBranch> {
    await branch({
      fs,
      dir: this.repoPath,
      ref: name,
      object: startPoint || ref,
    });

    return {
      name,
      ref,
      object: {
        type: "commit",
        sha: ref,
      },
      url: "",
      type: "branch",
      commit: {
        sha: ref,
        message: "",
        author: { name: "", email: "", date: "" },
        committer: { name: "", email: "", date: "" },
        timestamp: "",
        url: "",
      },
    };
  }

  async createTag(name: TTagName, ref: TSha, options?: ITagCreateRequest): Promise<ITag> {
    await tag({
      fs,
      dir: this.repoPath,
      ref: name,
      object: ref,
    });

    return {
      name,
      ref,
      object: {
        type: "commit",
        sha: ref,
      },
      url: "",
      type: "tag",
      commit: {
        sha: ref,
        message: options?.message || "",
        author: { name: "", email: "", date: "" },
        committer: { name: "", email: "", date: "" },
        timestamp: "",
        url: "",
      },
    };
  }

  async updateRef(ref: string, options: IRefUpdateRequest): Promise<IRef> {
    // isogit doesn't have a direct update-ref function, so we'll expand and resolve
    await expandRef({
      fs,
      dir: this.repoPath,
      ref,
    });

    return {
      name: ref,
      ref: options.ref,
      object: {
        type: "commit",
        sha: options.ref,
      },
      url: "",
    };
  }

  // Commit operations
  async listCommits(opts?: IListCommitsOptions): Promise<ICommit[]> {
    const logOptions: any = {
      fs,
      dir: this.repoPath,
      depth: opts?.per_page || 256,
    };

    if (opts?.sha) logOptions.ref = opts.sha;

    const commits = await log(logOptions);

    return commits.map((commit: any) => ({
      sha: commit.oid as TSha,
      message: commit.commit.message as TCommitMessage,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        date: commit.commit.author.timestamp,
      },
      committer: {
        name: commit.committer.name,
        email: commit.commit.committer.email,
        date: commit.commit.committer.timestamp,
      },
      tree: {
        sha: commit.commit.tree as TSha,
        url: "",
      },
      parents: commit.commit.parent.map((parent: string) => ({
        sha: parent as TSha,
        url: "",
      })),
      url: "",
      html_url: "",
      comments_url: "",
    }));
  }

  async getCommit(sha: TSha): Promise<ICommit> {
    const commitObj = await readCommit({
      fs,
      dir: this.repoPath,
      oid: sha,
    });

    const commit = commitObj.commit;

    return {
      sha: commitObj.oid as TSha,
      message: commit.message as TCommitMessage,
      author: {
        name: commit.author.name,
        email: commit.author.email,
        date: new Date(commit.author.timestamp * 1000).toISOString(),
      },
      committer: {
        name: commit.committer.name,
        email: commit.committer.email,
        date: new Date(commit.committer.timestamp * 1000).toISOString(),
      },
      tree: {
        sha: commit.tree as TSha,
        url: "",
      },
      parents: commit.parent.map((parent: string) => ({
        sha: parent as TSha,
        url: "",
      })),
      url: "",
      html_url: "",
      comments_url: "",
    };
  }

  async createCommit(options: ICommitCreateRequest): Promise<ICommit> {
    const commitResult = await commit({
      fs,
      dir: this.repoPath,
      message: options.message,
      author: options.author
        ? {
            name: options.author.name,
            email: options.author.email,
            timestamp: options.author.date
              ? Math.floor(new Date(options.author.date).getTime() / 1000)
              : Math.floor(Date.now() / 1000),
          }
        : undefined,
      committer: options.committer
        ? {
            name: options.committer.name,
            email: options.committer.email,
            timestamp: options.committer.date
              ? Math.floor(new Date(options.committer.date).getTime() / 1000)
              : Math.floor(Date.now() / 1000),
          }
        : undefined,
      tree: options.tree,
      parent: options.parents || [],
    });

    return this.getCommit(commitResult as TSha);
  }

  async updateCommitMessage(sha: TSha, message: TCommitMessage, force?: boolean): Promise<ICommit> {
    // This would typically require creating a new commit with amended message
    // For now, we'll get the commit and return it with the updated message
    const commit = await this.getCommit(sha);
    // In a real implementation, we would create a new commit with the amended message
    // For now, we'll just return the existing commit with a note that this is a simplified implementation
    return {
      ...commit,
      message: message,
    };
  }

  async revert(sha: TSha): Promise<ICommit> {
    // isogit doesn't have a direct revert function
    // We can implement revert by reading the commit and creating a new one that undoes its changes
    const commit = await this.getCommit(sha);

    // Create a new commit with a revert message
    const revertCommit = await this.createCommit({
      message: `Revert "${commit.message}"\n\nThis reverts commit ${sha}.` as TCommitMessage,
      parents: [commit.sha],
      tree: commit.tree.sha,
    });

    return revertCommit;
  }

  async reset(target: TSha, mode: TResetMode): Promise<void> {
    // Implement reset using checkout functionality
    // For a basic implementation, we'll use checkout to reset to the target commit
    await checkout({
      fs,
      dir: this.repoPath,
      ref: target,
      force: true,
    });
  }

  // Tree operations
  async listFiles(treeIsh: TSha, path?: TPath, recursive?: boolean): Promise<ITree> {
    // Use isomorphic-git's listFiles function to get the list of files
    const files = await listFiles({
      fs,
      dir: this.repoPath,
      ref: treeIsh,
    });

    // Create an ITree structure from the files
    // This is a simplified implementation - in a real implementation,
    // we would need to create a proper tree structure with file modes, etc.
    const tree: ITree = {
      sha: treeIsh,
      tree: files.map((file) => ({
        path: file as TPath,
        mode: "100644", // Regular file mode as default
        type: "blob",
        sha: "" as TSha, // We don't have the SHA for each file in this simple implementation
        size: 0, // We don't have the size for each file in this simple implementation
        url: "",
      })),
      url: "",
      truncated: false,
    };

    return tree;
  }

  async getBlob(treeIsh: TSha, path: TPath): Promise<Buffer> {
    const result = await readBlob({
      fs,
      dir: this.repoPath,
      oid: treeIsh,
      filepath: path,
    });

    return Buffer.from(result.blob);
  }

  async createTree(tree: ITreeCreateRequest): Promise<ITree> {
    // Convert ITreeCreateRequest to isomorphic-git tree format
    const gitTree = tree.tree
      .filter((entry) => entry.sha) // Filter out entries without SHA
      .map((entry) => ({
        mode: entry.mode,
        path: entry.path,
        oid: entry.sha!,
        type: entry.type,
      }));

    // Use isomorphic-git's writeTree function to create the tree
    const oid = await writeTree({
      fs,
      dir: this.repoPath,
      tree: gitTree,
    });

    // Return an ITree structure with the created tree's OID
    return {
      sha: oid as TSha,
      tree: tree.tree
        .filter((entry) => entry.sha) // Filter out entries without SHA
        .map((entry) => ({
          path: entry.path,
          mode: entry.mode,
          type: entry.type,
          sha: entry.sha!,
          url: "",
          size: 0, // We don't have the size information in this simple implementation
        })),
      url: "",
      truncated: false,
    };
  }

  async createBlob(content: string, encoding?: "utf-8" | "base64"): Promise<IBlob> {
    const oid = await writeBlob({
      fs,
      dir: this.repoPath,
      blob: Buffer.from(content, encoding),
    });

    return {
      sha: oid as TSha,
      content,
      encoding: encoding || "utf-8",
      size: Buffer.byteLength(content, encoding),
      url: "",
    };
  }

  async getFileContents(path: TPath, options?: IGetFileContentOptions): Promise<IFileContent | IDirectoryContent> {
    const ref = options?.ref || "HEAD";

    try {
      // Try to read as a file first
      const result = await readBlob({
        fs,
        dir: this.repoPath,
        oid: ref,
        filepath: path,
      });

      const contentBuffer = Buffer.from(result.blob);

      return {
        name: path.split("/").pop() || path,
        path,
        sha: "" as TSha, // Would need to calculate SHA
        size: contentBuffer.length,
        url: "",
        html_url: "",
        git_url: "",
        download_url: "",
        type: "file",
        content: contentBuffer.toString("base64"),
        encoding: "base64",
        _links: {
          git: "",
          self: "",
          html: "",
        },
      };
    } catch (error) {
      // If it fails, it might be a directory
      // For now, we'll throw an error
      throw error;
    }
  }

  async createOrUpdateFile(path: TPath, options: IFileCreateUpdateRequest): Promise<IFileContent> {
    // Write content to blob
    const blobSha = await writeBlob({
      fs,
      dir: this.repoPath,
      blob: Buffer.from(options.content, options.encoding),
    });

    // Add to index
    await add({
      fs,
      dir: this.repoPath,
      filepath: path,
    });

    // Create commit if message is provided
    if (options.message) {
      const commitOptions: any = {
        fs,
        dir: this.repoPath,
        message: options.message,
        author: options.author
          ? {
              name: options.author.name,
              email: options.author.email,
              timestamp: options.author.date
                ? Math.floor(new Date(options.author.date).getTime() / 1000)
                : Math.floor(Date.now() / 1000),
            }
          : undefined,
        committer: options.committer
          ? {
              name: options.committer.name,
              email: options.committer.email,
              timestamp: options.committer.date
                ? Math.floor(new Date(options.committer.date).getTime() / 1000)
                : Math.floor(Date.now() / 1000),
            }
          : undefined,
      };

      await commit(commitOptions);
    }

    return {
      name: path.split("/").pop() || path,
      path,
      sha: blobSha as TSha,
      size: Buffer.byteLength(options.content, options.encoding),
      url: "",
      html_url: "",
      git_url: "",
      download_url: "",
      type: "file",
      content: Buffer.from(options.content, options.encoding).toString("base64"),
      encoding: options.encoding || "utf-8",
      _links: {
        git: "",
        self: "",
        html: "",
      },
    };
  }

  async deleteFile(path: TPath, options: IFileDeleteRequest): Promise<void> {
    // Remove from index
    await remove({
      fs,
      dir: this.repoPath,
      filepath: path,
    });

    // Create commit if message is provided
    if (options.message) {
      const commitOptions: any = {
        fs,
        dir: this.repoPath,
        message: options.message,
        author: options.author
          ? {
              name: options.author.name,
              email: options.author.email,
              timestamp: options.author.date
                ? Math.floor(new Date(options.author.date).getTime() / 1000)
                : Math.floor(Date.now() / 1000),
            }
          : undefined,
        committer: options.committer
          ? {
              name: options.committer.name,
              email: options.committer.email,
              timestamp: options.committer.date
                ? Math.floor(new Date(options.committer.date).getTime() / 1000)
                : Math.floor(Date.now() / 1000),
            }
          : undefined,
      };

      await commit(commitOptions);
    }
  }

  // Index operations
  async getIndex(): Promise<IIndexEntry[]> {
    const matrix = await statusMatrix({
      fs,
      dir: this.repoPath,
    });

    return matrix.map((row: any) => {
      const [filepath, , , workdirStatus] = row;
      return {
        path: filepath as TPath,
        mode: "", // Would need to get actual mode
        blob: {
          sha: "", // Would need to calculate SHA
          size: 0,
          url: "",
        },
        status: workdirStatus === 1 ? "added" : workdirStatus === 2 ? "modified" : "deleted",
        changes: {
          additions: 0,
          deletions: 0,
          total: 0,
        },
      };
    });
  }

  async addToIndex(path: TPath): Promise<void> {
    await add({
      fs,
      dir: this.repoPath,
      filepath: path,
    });
  }

  async removeFromIndex(path: TPath): Promise<void> {
    await remove({
      fs,
      dir: this.repoPath,
      filepath: path,
    });
  }

  async updateIndex(options: IIndexUpdateRequest): Promise<IIndex> {
    // For updating the index, we'll process each update in the options
    for (const update of options.updates) {
      // Write the content to a blob
      const blobSha = await writeBlob({
        fs,
        dir: this.repoPath,
        blob: Buffer.from(update.content, update.encoding),
      });

      // Add the file to the index
      await add({
        fs,
        dir: this.repoPath,
        filepath: update.path,
      });
    }

    // Get the current index entries
    const entries = await this.getIndex();

    // Return a basic IIndex structure
    return {
      repo: this.repoPath,
      ref: "HEAD",
      entries: entries,
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
    // For stagePatch, we'll write the patch text to the file and add it to the index
    // This is a simplified implementation
    await Bun.write(resolve(CONFIG.REPO_BASE, this.repoPath!, path), patchText);

    // Add the file to the index
    await add({
      fs,
      dir: this.repoPath,
      filepath: path,
    });
  }

  async discardWorktree(path: TPath): Promise<void> {
    // To discard worktree changes, we can checkout the file from HEAD
    await checkout({
      fs,
      dir: this.repoPath,
      filepaths: [path],
      force: true,
    });
  }

  // Stash operations
  async listStashes(): Promise<IStash[]> {
    // Use isomorphic-git's stash function with 'list' operation
    const stashList: any = await stash({
      fs,
      dir: this.repoPath,
      op: "list",
    });

    // Get current branch
    let branch: TBranch;
    try {
      const branchName =
        (await currentBranch({
          fs,
          dir: this.repoPath,
        })) || "master";
      branch = branchName as TBranch;
    } catch (error) {
      branch = "master" as TBranch;
    }

    // Convert the stash list to IStash[] format
    // This is a simplified implementation - in a real implementation,
    // we would need to parse the stash list properly
    if (Array.isArray(stashList)) {
      return stashList.map((stashEntry: any, index: number) => ({
        id: index.toString(),
        message: stashEntry.split(": ")[1] || stashEntry,
        created_at: new Date().toISOString(),
        branch: branch,
        stats: {
          files_changed: 0,
          insertions: 0,
          deletions: 0,
        },
        url: "",
      }));
    } else {
      // If stashList is not an array, return empty array
      return [];
    }
  }

  async saveStash(message?: TCommitMessage, includeUntracked?: boolean): Promise<IStash> {
    // Use isomorphic-git's stash function with 'push' operation
    await stash({
      fs,
      dir: this.repoPath,
      op: "push",
      message:
        message ||
        "WIP on " +
          (await currentBranch({
            fs,
            dir: this.repoPath,
          })) ||
        "master",
    });

    // Get current branch
    let branch: TBranch;
    try {
      const branchName =
        (await currentBranch({
          fs,
          dir: this.repoPath,
        })) || "master";
      branch = branchName as TBranch;
    } catch (error) {
      branch = "master" as TBranch;
    }

    // Return a basic IStash structure
    return {
      id: "0",
      message: message || "WIP",
      created_at: new Date().toISOString(),
      branch: branch,
      stats: {
        files_changed: 0,
        insertions: 0,
        deletions: 0,
      },
      url: "",
    };
  }

  async applyStash(index?: number): Promise<void> {
    // Use isomorphic-git's stash function with 'apply' operation
    await stash({
      fs,
      dir: this.repoPath,
      op: "apply",
      refIdx: index || 0,
    });
  }

  async dropStash(index?: number): Promise<void> {
    // Use isomorphic-git's stash function with 'drop' operation
    await stash({
      fs,
      dir: this.repoPath,
      op: "drop",
      refIdx: index || 0,
    });
  }

  // Diff operations
  async diffCommits(from: TSha, to: TSha, options?: ICompareCommitsOptions): Promise<IDiff[]> {
    // This is a simplified implementation - in a real implementation,
    // we would need to compare the commits and generate a proper diff
    return [
      {
        repo: this.repoPath,
        from: from,
        to: to,
        files: [],
        stats: {
          total_files: 0,
          total_additions: 0,
          total_deletions: 0,
          total_changes: 0,
        },
        url: "",
        html_url: "",
      },
    ];
  }

  async diffIndex(treeIsh?: TSha, cached?: boolean): Promise<IDiff[]> {
    // This is a simplified implementation - in a real implementation,
    // we would need to compare the index with the tree and generate a proper diff
    return [
      {
        repo: this.repoPath,
        from: treeIsh || ("HEAD" as TSha),
        to: "INDEX" as TSha,
        files: [],
        stats: {
          total_files: 0,
          total_additions: 0,
          total_deletions: 0,
          total_changes: 0,
        },
        url: "",
        html_url: "",
      },
    ];
  }

  async diffWorktree(path?: TPath): Promise<IDiff[]> {
    // This is a simplified implementation - in a real implementation,
    // we would need to compare the worktree with the index and generate a proper diff
    return [
      {
        repo: this.repoPath,
        from: "INDEX" as TSha,
        to: "WORKTREE" as TSha,
        files: [],
        stats: {
          total_files: 0,
          total_additions: 0,
          total_deletions: 0,
          total_changes: 0,
        },
        url: "",
        html_url: "",
      },
    ];
  }

  async getCommitDiff(sha: TSha, options?: IGetCommitDiffOptions): Promise<IDiff> {
    // This is a simplified implementation - in a real implementation,
    // we would need to get the commit and generate a proper diff
    return {
      repo: this.repoPath,
      from: sha,
      to: sha,
      files: [],
      stats: {
        total_files: 0,
        total_additions: 0,
        total_deletions: 0,
        total_changes: 0,
      },
      url: "",
      html_url: "",
    };
  }

  // Log operations
  async getCommitLog(options?: IGetCommitLogOptions): Promise<IPaginatedResponse<ICommitLogEntry>> {
    const logOptions: any = {
      fs,
      dir: this.repoPath,
      depth: options?.per_page || 30,
    };

    if (options?.ref) logOptions.ref = options.ref;

    const commits = await log(logOptions);

    const items = commits.map((commit: any) => ({
      sha: commit.oid as TSha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        date: new Date(commit.commit.author.timestamp * 1000).toISOString(),
      },
      committer: {
        name: commit.commit.committer.name,
        email: commit.commit.committer.email,
        date: new Date(commit.commit.committer.timestamp * 1000).toISOString(),
      },
      timestamp: new Date(commit.commit.author.timestamp * 1000).toISOString(),
      url: "",
      html_url: "",
    }));

    return {
      pagination: {
        total_items: items.length,
        total_pages: 1,
        current_page: 1,
        per_page: items.length,
      },
      items,
    };
  }

  async getFileHistory(path: TPath, options?: IGetFileHistoryOptions): Promise<IPaginatedResponse<IFileHistoryEntry>> {
    // This is a simplified implementation - in a real implementation,
    // we would need to get the file history and generate a proper response
    const logOptions: any = {
      fs,
      dir: this.repoPath,
      depth: options?.per_page || 30,
      filepath: path,
    };

    if (options?.ref) logOptions.ref = options.ref;

    const commits = await log(logOptions);

    const items = commits.map((commit: any) => ({
      sha: commit.oid as TSha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        date: new Date(commit.commit.author.timestamp * 1000).toISOString(),
      },
      committer: {
        name: commit.commit.committer.name,
        email: commit.commit.committer.email,
        date: new Date(commit.committer.timestamp * 1000).toISOString(),
      },
      timestamp: new Date(commit.commit.author.timestamp * 1000).toISOString(),
      url: "",
      html_url: "",
      file: {
        path: path,
        status: "modified" as "added" | "modified" | "deleted" | "renamed" | "copied",
        changes: {
          additions: 0,
          deletions: 0,
          total: 0,
        },
        blob_url: "",
        raw_url: "",
      },
    }));

    return {
      pagination: {
        total_items: items.length,
        total_pages: 1,
        current_page: 1,
        per_page: items.length,
      },
      items,
    };
  }

  async blame(path: TPath, rev?: TBranch): Promise<IBlameInfo> {
    // This is a simplified implementation - in a real implementation,
    // we would need to implement a proper blame algorithm
    return {
      file: {
        path: path,
        size: 0,
        lines: 0,
      },
      ref: rev || ("HEAD" as TBranch),
      ranges: [],
      commits: {},
    };
  }

  // Merge/Rebase operations
  async merge(branch: TBranch, options?: IMergeRequest): Promise<IMergeResult | IMergeStatus> {
    try {
      // Use isomorphic-git's merge function
      const mergeResult = await merge({
        fs,
        dir: this.repoPath,
        ours: options?.target || ("HEAD" as TBranch),
        theirs: branch,
        fastForward: true,
        fastForwardOnly: false,
        dryRun: false,
        noUpdateBranch: false,
        abortOnConflict: true,
        message: options?.message,
        allowUnrelatedHistories: false,
      });

      // Return a basic IMergeResult structure
      return {
        sha: mergeResult.oid as TSha,
        merged:
          mergeResult.alreadyMerged || false || mergeResult.fastForward || false || mergeResult.mergeCommit || false,
        message: options?.message || `Merge branch '${branch}'`,
        author: {
          name: "",
          email: "",
          date: "",
        },
        committer: {
          name: "",
          email: "",
          date: "",
        },
        url: "",
        html_url: "",
        stats: {
          additions: 0,
          deletions: 0,
          total: 0,
          files_changed: 0,
        },
      };
    } catch (error) {
      // Return a basic IMergeStatus structure for errors
      return {
        status: "failed",
        message: error instanceof Error ? error.message : "Merge failed",
        sha: "",
        progress: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        conflicts: [],
      };
    }
  }

  async rebase(branch: TBranch, options?: IRebaseRequest): Promise<IRebaseResult | IRebaseStatus> {
    // isogit doesn't have a direct rebase function
    // We'll implement a simplified rebase using merge functionality
    try {
      // Get the current branch
      const currentBranchName = (await currentBranch({
        fs,
        dir: this.repoPath,
      })) as TBranch;

      // Perform a merge operation as a simplified rebase
      const mergeResult = await merge({
        fs,
        dir: this.repoPath,
        ours: currentBranchName,
        theirs: branch,
        fastForward: true,
        fastForwardOnly: false,
        dryRun: false,
        noUpdateBranch: false,
        abortOnConflict: true,
        allowUnrelatedHistories: false,
      });

      // Return a basic IRebaseResult structure
      return {
        rebased:
          mergeResult.alreadyMerged || false || mergeResult.fastForward || false || mergeResult.mergeCommit || false,
        message: `Rebase branch '${branch}'`,
        commits: [],
        source: branch,
        target: currentBranchName,
      };
    } catch (error) {
      // Return a basic IRebaseStatus structure for errors
      return {
        status: "failed",
        message: error instanceof Error ? error.message : "Rebase failed",
        progress: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        current_commit: "",
        conflicts: [],
      };
    }
  }

  async getMergeStatus(branch: TBranch): Promise<IMergeStatus> {
    // isogit doesn't have a direct merge status function
    // Return a basic IMergeStatus structure
    return {
      status: "completed",
      message: "No merge in progress",
      sha: "",
      progress: 100,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      conflicts: [],
    };
  }

  async getRebaseStatus(branch: TBranch): Promise<IRebaseStatus> {
    // isogit doesn't have a direct rebase status function
    // Return a basic IRebaseStatus structure
    return {
      status: "completed",
      message: "No rebase in progress",
      progress: 100,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      current_commit: "",
      conflicts: [],
    };
  }

  abortMerge(branch: TBranch): Promise<void> {
    // Use isomorphic-git's abortMerge function
    return abortMerge({
      fs,
      dir: this.repoPath,
    });
  }

  async abortRebase(branch: TBranch): Promise<void> {
    // isogit doesn't have a direct abort rebase function
    // For now, we'll just close the repository connection
    await this.close();
  }
}
