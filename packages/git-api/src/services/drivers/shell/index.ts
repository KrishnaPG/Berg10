import { join } from "path";
import type { Readable } from "stream";
import { CONFIG } from "../../../config";
import type {
  IBlameInfo,
  IBlob,
  IBranch,
  ICloneOptions,
  ICommit,
  ICommitCreateRequest,
  ICommitLogEntry,
  ICompareCommitsOptions,
  IDiff,
  IDirectoryContent,
  IFileContent,
  IFileCreateUpdateRequest,
  IFileDeleteRequest,
  IFileHistoryEntry,
  IGetCommitDiffOptions,
  IGetCommitLogOptions,
  IGetFileContentOptions,
  IGetFileHistoryOptions,
  IIndex,
  IIndexEntry,
  IIndexUpdateRequest,
  IListCommitsOptions,
  IMergeRequest,
  IMergeResult,
  IMergeStatus,
  IPaginatedResponse,
  IRebaseRequest,
  IRebaseResult,
  IRebaseStatus,
  IRef,
  IRefUpdateRequest,
  IRepository,
  IRepositoryDetails,
  IRepositoryUpdateRequest,
  IRepositoryUpdateResponse,
  IStash,
  ITag,
  ITagCreateRequest,
  ITree,
  ITreeCreateRequest,
  TBranch,
  TCommitMessage,
  TPath,
  TRefKind,
  TRepositoryName,
  TSha,
  TTagName,
} from "../../types";
import type { IGitBackend, TGitBackendType } from "../backend";
import { git, gitStream, parseRefLines } from "./helpers";

export class ShellBackend implements IGitBackend {
  // Repository operations
  async init(
    repoPath: TPath,
    config?: { defaultBranch?: string; isPrivate?: boolean; description?: string },
  ): Promise<void> {
    await git(repoPath, ["init"]);
    if (config?.defaultBranch) {
      await git(repoPath, ["checkout", "-b", config.defaultBranch]);
    }
  }

  async clone(url: string, path: TPath, options?: ICloneOptions): Promise<void> {
    const args = ["clone"];
    if (options?.bare) args.push("--bare");
    if (options?.branch) args.push("--branch", options.branch);
    if (options?.depth) args.push("--depth", options.depth.toString());
    if (options?.recursive) args.push("--recursive");
    args.push(url, join(CONFIG.REPO_BASE, path));
    await git(".", args);
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
    // Repository-level updates are typically handled outside of git commands
    throw new Error("Not implemented");
  }

  async deleteRepository(): Promise<void> {
    // This would require filesystem operations outside of git
    throw new Error("Not implemented");
  }

  getCurrentBackend(): TGitBackendType {
    return "shell";
  }

  // Ref operations
  async listRefs(type?: TRefKind | "all"): Promise<IRef[]> {
    const args = ["for-each-ref", "--format=%(refname:short) %(objectname) %(objecttype)"];

    if (type === "branch") args.push("refs/heads/");
    else if (type === "tag") args.push("refs/tags/");
    else args.push("refs/heads/", "refs/tags/");

    const refs: IRef[] = [];
    let chunk = "";
    for await (const data of gitStream(".", args)) {
      chunk += data;
      const lastNL = chunk.lastIndexOf("\n");
      if (lastNL === -1) continue;

      for (const [name, sha, type] of parseRefLines(chunk.slice(0, lastNL))) {
        refs.push({
          name,
          ref: sha as TSha,
          object: { type, sha: sha as TSha },
          url: "",
        });
      }
      chunk = chunk.slice(lastNL + 1);
    }
    return refs;
  }

  async getRef(name: string): Promise<IRef | null> {
    try {
      const out = await git(".", ["rev-parse", name]);
      const sha = out.trim() as TSha;
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
      await git(".", ["branch", name, sha]);
    } else {
      await git(".", ["tag", name, sha]);
    }
  }

  async deleteRef(name: string): Promise<void> {
    // Determine if it's a branch or tag
    if (name.startsWith("refs/heads/") || !name.includes("/")) {
      const branchName = name.replace("refs/heads/", "");
      await git(".", ["branch", "-D", branchName]);
    } else if (name.startsWith("refs/tags/")) {
      const tagName = name.replace("refs/tags/", "");
      await git(".", ["tag", "-d", tagName]);
    } else {
      // Try branch first, then tag
      try {
        await git(".", ["branch", "-D", name]);
      } catch {
        await git(".", ["tag", "-d", name]);
      }
    }
  }

  async renameRef(oldName: string, newName: string): Promise<void> {
    await git(".", ["branch", "-m", oldName, newName]);
  }

  async createBranch(name: TBranch, ref: TSha, startPoint?: TSha): Promise<IBranch> {
    await git(".", ["branch", name, startPoint || ref]);
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
    const args = ["tag"];
    if (options?.message) {
      args.push("-m", options.message);
    }
    if (options?.lightweight === false) {
      args.push("-a");
    }
    args.push(name, ref);
    await git(".", args);

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
    await git(".", ["update-ref", ref, options.ref]);
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
    const args = ["log", "--format=%H|%s|%an|%ae|%ad|%cn|%ce|%cd|%P", "--date=iso"];

    if (opts?.sha) args.push(opts.sha);
    if (opts?.path) args.push("--", opts.path);
    if (opts?.author) args.push("--author", opts.author);
    if (opts?.since) args.push("--since", opts.since);
    if (opts?.until) args.push("--until", opts.until);
    if (opts?.per_page) args.push(`-n${opts.per_page}`);
    else args.push("-n256"); // tuned for high-throughput

    const commits: ICommit[] = [];
    let buf = "";
    for await (const data of gitStream(".", args)) {
      buf += data;
      let idx: number;
      while ((idx = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, idx);
        const parts = line.split("|");
        const [sha, msg, an, ae, ad, cn, ce, cd, parents] = parts;

        commits.push({
          sha: sha as TSha,
          message: msg as TCommitMessage,
          author: { name: an, email: ae, date: ad },
          committer: { name: cn, email: ce, date: cd },
          tree: { sha: "" as TSha, url: "" },
          parents: parents
            .split(" ")
            .filter(Boolean)
            .map((p) => ({ sha: p as TSha, url: "" })),
          url: "",
          html_url: "",
          comments_url: "",
        });
        buf = buf.slice(idx + 1);
      }
    }
    return commits;
  }

  async getCommit(sha: TSha): Promise<ICommit> {
    const out = await git(".", ["show", "--format=%H|%s|%an|%ae|%ad|%cn|%ce|%cd|%T", "--no-patch", sha]);
    const [
      commitSha,
      message,
      authorName,
      authorEmail,
      authorDate,
      committerName,
      committerEmail,
      committerDate,
      treeSha,
    ] = out.trim().split("|");

    // Get parents
    const parentsOut = await git(".", ["rev-list", "--parents", "-n1", sha]);
    const parents = parentsOut
      .trim()
      .split(" ")
      .slice(1)
      .map((parentSha) => ({
        sha: parentSha as TSha,
        url: "",
      }));

    return {
      sha: commitSha as TSha,
      message: message as TCommitMessage,
      author: {
        name: authorName,
        email: authorEmail,
        date: authorDate,
      },
      committer: {
        name: committerName,
        email: committerEmail,
        date: committerDate,
      },
      tree: {
        sha: treeSha as TSha,
        url: "",
      },
      parents,
      url: "",
      html_url: "",
      comments_url: "",
    };
  }

  async createCommit(options: ICommitCreateRequest): Promise<ICommit> {
    // This is a simplified implementation
    // In practice, this would require more complex git operations
    throw new Error("Not implemented");
  }

  async updateCommitMessage(sha: TSha, message: TCommitMessage, force?: boolean): Promise<ICommit> {
    // This would typically require creating a new commit with amended message
    throw new Error("Not implemented");
  }

  async revert(sha: TSha): Promise<ICommit> {
    const out = await git(".", ["revert", "--no-edit", sha]);
    // Parse the output to get the new commit details
    const newSha = await git(".", ["rev-parse", "HEAD"]);
    return this.getCommit(newSha.trim() as TSha);
  }

  async reset(target: TSha, mode: "soft" | "mixed" | "hard"): Promise<void> {
    await git(".", ["reset", `--${mode}`, target]);
  }

  // Tree operations
  async listFiles(treeIsh: TSha, path?: TPath, recursive?: boolean): Promise<ITree> {
    const args = ["ls-tree", recursive ? "-r" : "", treeIsh];
    if (path) args.push(path);

    const out = await git(
      ".",
      args.filter((arg) => arg !== ""),
    );
    const entries = out
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        const [mode, type, sha, ...rest] = line.split(/\s/);
        const filePath = rest.join(" ");
        return {
          path: filePath as TPath,
          mode,
          type: type as "blob" | "tree",
          sha: sha as TSha,
          size: type === "blob" ? 0 : undefined, // Would need separate command to get size
          url: "",
        };
      });

    return {
      sha: treeIsh,
      url: "",
      tree: entries,
      truncated: false,
    };
  }

  async getBlob(treeIsh: TSha, path: TPath): Promise<Buffer> {
    const content = await git(".", ["show", `${treeIsh}:${path}`]);
    return Buffer.from(content, "utf-8");
  }

  async createTree(tree: ITreeCreateRequest): Promise<ITree> {
    // This is complex to implement with shell commands
    throw new Error("Not implemented");
  }

  async createBlob(content: string, encoding?: "utf-8" | "base64"): Promise<IBlob> {
    const args = ["hash-object", "-w", "--stdin"];
    const process = Bun.spawn({
      cmd: ["git", "-C", CONFIG.REPO_BASE, ...args],
      stdout: "pipe",
      stdin: "pipe",
    });

    await process.stdin.write(content);
    process.stdin.end();

    const sha = await new Response(process.stdout).text();
    return {
      sha: sha.trim() as TSha,
      content,
      encoding: encoding || "utf-8",
      size: Buffer.byteLength(content, encoding),
      url: "",
    };
  }

  async getFileContents(path: TPath, options?: IGetFileContentOptions): Promise<IFileContent | IDirectoryContent> {
    const ref = options?.ref || "HEAD";

    // Check if it's a directory
    try {
      const out = await git(".", ["ls-tree", ref, path]);
      if (
        out
          .trim()
          .split("\n")
          .some((line) => line.includes(" tree "))
      ) {
        // It's a directory
        const entries = await this.listFiles(ref as TSha, path, false);
        return {
          name: path.split("/").pop() || path,
          path,
          sha: ref as TSha,
          size: 0,
          url: "",
          html_url: "",
          git_url: "",
          download_url: null,
          type: "dir",
          _links: {
            git: "",
            self: "",
            html: "",
          },
        };
      }
    } catch {
      // Continue to file handling
    }

    // It's a file
    const content = await git(".", ["show", `${ref}:${path}`]);
    const sha = await git(".", ["rev-parse", `${ref}:${path}`]);

    return {
      name: path.split("/").pop() || path,
      path,
      sha: sha.trim() as TSha,
      size: Buffer.byteLength(content, "utf-8"),
      url: "",
      html_url: "",
      git_url: "",
      download_url: "",
      type: "file",
      content: Buffer.from(content).toString("base64"),
      encoding: "base64",
      _links: {
        git: "",
        self: "",
        html: "",
      },
    };
  }

  async createOrUpdateFile(path: TPath, options: IFileCreateUpdateRequest): Promise<IFileContent> {
    // Write content to file
    const args = ["hash-object", "-w", "--stdin"];
    const process = Bun.spawn({
      cmd: ["git", "-C", CONFIG.REPO_BASE, ...args],
      stdout: "pipe",
      stdin: "pipe",
    });

    await process.stdin.write(options.content);
    process.stdin.end();

    const sha = await new Response(process.stdout).text();

    // Stage the file
    await git(".", ["update-index", "--add", "--cacheinfo", "100644", sha.trim(), path]);

    // Commit if message is provided
    if (options.message) {
      const commitArgs = ["commit", "-m", options.message];
      if (options.author) {
        commitArgs.push("--author", `${options.author.name} <${options.author.email}>`);
      }
      await git(".", commitArgs);
    }

    return {
      name: path.split("/").pop() || path,
      path,
      sha: sha.trim() as TSha,
      size: Buffer.byteLength(options.content, "utf-8"),
      url: "",
      html_url: "",
      git_url: "",
      download_url: "",
      type: "file",
      content: Buffer.from(options.content).toString("base64"),
      encoding: "base64",
      _links: {
        git: "",
        self: "",
        html: "",
      },
    };
  }

  async deleteFile(path: TPath, options: IFileDeleteRequest): Promise<void> {
    // Remove from index
    await git(".", ["rm", "--cached", path]);

    // Commit if message is provided
    if (options.message) {
      const commitArgs = ["commit", "-m", options.message];
      if (options.author) {
        commitArgs.push("--author", `${options.author.name} <${options.author.email}>`);
      }
      await git(".", commitArgs);
    }
  }

  // Index operations
  async getIndex(): Promise<IIndexEntry[]> {
    const out = await git(".", ["diff", "--cached", "--name-status", "-z"]);
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
    await git(".", ["add", path]);
  }

  async removeFromIndex(path: TPath): Promise<void> {
    await git(".", ["rm", "--cached", path]);
  }

  async updateIndex(options: IIndexUpdateRequest): Promise<IIndex> {
    // This is a complex operation that would require multiple git commands
    throw new Error("Not implemented");
  }

  async stagePatch(path: TPath, patchText: string): Promise<void> {
    await git(".", ["apply", "--cached"], { stdin: patchText });
  }

  async discardWorktree(path: TPath): Promise<void> {
    await git(".", ["checkout", "--", path]);
  }

  // Stash operations
  async listStashes(): Promise<IStash[]> {
    const out = await git(".", ["stash", "list", "--format=%gd|%s|%an|%ae|%ad"]);
    return out
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        const [id, message, authorName, authorEmail, date] = line.split("|");
        return {
          id,
          message,
          created_at: date,
          branch: "" as TBranch, // Would need to parse from stash ref
          stats: {
            files_changed: 0,
            insertions: 0,
            deletions: 0,
          },
          url: "",
        };
      });
  }

  async saveStash(message?: TCommitMessage, includeUntracked?: boolean): Promise<IStash> {
    const args = ["stash", "create"];
    if (message) args.push("-m", message);
    if (includeUntracked) args.push("-u");

    const out = await git(".", args);
    const sha = out.trim();

    return {
      id: `stash@{0}`, // Simplified
      message: message || "WIP",
      created_at: new Date().toISOString(),
      branch: "" as TBranch, // Would need to determine current branch
      stats: {
        files_changed: 0,
        insertions: 0,
        deletions: 0,
      },
      url: "",
    };
  }

  async applyStash(index?: number): Promise<void> {
    const args = ["stash", "apply"];
    if (index !== undefined) args.push(`stash@{${index}}`);
    await git(".", args);
  }

  async dropStash(index?: number): Promise<void> {
    const args = ["stash", "drop"];
    if (index !== undefined) args.push(`stash@{${index}}`);
    await git(".", args);
  }

  // Diff operations
  async diffCommits(from: TSha, to: TSha, options?: ICompareCommitsOptions): Promise<IDiff[]> {
    const args = ["diff", `${from}..${to}`];
    if (options?.path) args.push("--", options.path);

    const out = await git(".", args);
    // Simplified parsing - in reality this would need more complex parsing
    return [
      {
        repo: "",
        from,
        to,
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
    const args = ["diff"];
    if (cached) args.push("--cached");
    if (treeIsh) args.push(treeIsh);

    const out = await git(".", args);
    // Simplified parsing
    return [
      {
        repo: "",
        from: "" as TSha,
        to: "" as TSha,
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
    const args = ["diff"];
    if (path) args.push("--", path);

    const out = await git(".", args);
    // Simplified parsing
    return [
      {
        repo: "",
        from: "" as TSha,
        to: "" as TSha,
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
    const args = ["show", sha];
    if (options?.path) args.push("--", options.path);

    const out = await git(".", args);
    // Simplified parsing
    return {
      repo: "",
      from: "" as TSha,
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
    const args = ["log", "--format=%H|%s|%an|%ae|%ad|%cn|%ce|%cd", "--date=iso"];

    if (options?.ref) args.push(options.ref);
    if (options?.path) args.push("--", options.path);
    if (options?.author) args.push("--author", options.author);
    if (options?.since) args.push("--since", options.since);
    if (options?.until) args.push("--until", options.until);
    if (options?.per_page) args.push(`-n${options.per_page}`);
    else args.push("-n30"); // Default limit

    const out = await git(".", args);
    const items = out
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        const [sha, message, authorName, authorEmail, authorDate, committerName, committerEmail, committerDate] =
          line.split("|");
        return {
          sha: sha as TSha,
          message,
          author: {
            name: authorName,
            email: authorEmail,
            date: authorDate,
          },
          committer: {
            name: committerName,
            email: committerEmail,
            date: committerDate,
          },
          timestamp: authorDate,
          url: "",
          html_url: "",
        };
      });

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
    const args = ["log", "--format=%H|%s|%an|%ae|%ad|%cn|%ce|%cd", "--date=iso", "--follow", "--", path];

    if (options?.ref) args.push(options.ref);
    if (options?.since) args.push("--since", options.since);
    if (options?.until) args.push("--until", options.until);
    if (options?.per_page) args.push(`-n${options.per_page}`);
    else args.push("-n30"); // Default limit

    const out = await git(".", args);
    const items: IFileHistoryEntry[] = out
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        const [sha, message, authorName, authorEmail, authorDate, committerName, committerEmail, committerDate] =
          line.split("|");
        return {
          sha: sha as TSha,
          message,
          author: {
            name: authorName,
            email: authorEmail,
            date: authorDate,
          },
          committer: {
            name: committerName,
            email: committerEmail,
            date: committerDate,
          },
          timestamp: authorDate,
          url: "",
          html_url: "",
          file: {
            path,
            status: "modified", // Simplified
            changes: {
              additions: 0,
              deletions: 0,
              total: 0,
            },
            blob_url: "",
            raw_url: "",
          },
        };
      });

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
    const args = ["blame", "--porcelain", path];
    if (rev) args.unshift(rev);

    const out = await git(".", args);
    // Simplified parsing - in reality this would need complex parsing of porcelain format
    return {
      file: {
        path,
        size: 0, // Would need separate command to get file size
        lines: 0, // Would need to count lines
      },
      ref: rev || ("HEAD" as TBranch),
      ranges: [],
      commits: {},
    };
  }

  // Merge/Rebase operations
  async merge(branch: TBranch, options?: IMergeRequest): Promise<IMergeResult | IMergeStatus> {
    const args = ["merge"];
    if (options?.strategy === "squash") args.push("--squash");
    if (options?.strategy === "rebase") args.push("--rebase");
    args.push(branch);

    try {
      const out = await git(".", args);
      // Parse output to determine if merge was successful
      const sha = await git(".", ["rev-parse", "HEAD"]);
      return {
        sha: sha.trim() as TSha,
        merged: true,
        message: out.trim(),
        author: { name: "", email: "", date: "" },
        committer: { name: "", email: "", date: "" },
        url: "",
        html_url: "",
        stats: {
          additions: 0,
          deletions: 0,
          total: 0,
          files_changed: 0,
        },
      };
    } catch (error: any) {
      return {
        status: "failed",
        message: error.message || "Merge failed",
      };
    }
  }

  async rebase(branch: TBranch, options?: IRebaseRequest): Promise<IRebaseResult | IRebaseStatus> {
    const args = ["rebase", branch];
    if (options?.autosquash) args.push("--autosquash");

    try {
      const out = await git(".", args);
      return {
        rebased: true,
        message: out.trim(),
        commits: [], // Would need separate command to get commit list
        source: branch,
        target: "", // Would need to determine current branch
      };
    } catch (error: any) {
      return {
        status: "failed",
        message: error.message || "Rebase failed",
      };
    }
  }

  async getMergeStatus(branch: TBranch): Promise<IMergeStatus> {
    // Check if there's an ongoing merge
    try {
      await git(".", ["rev-parse", "MERGE_HEAD"]);
      return {
        status: "in_progress",
        message: "Merge in progress",
      };
    } catch {
      return {
        status: "completed",
        message: "No merge in progress",
      };
    }
  }

  async getRebaseStatus(branch: TBranch): Promise<IRebaseStatus> {
    // Check if there's an ongoing rebase
    try {
      await git(".", ["rev-parse", "REBASE_HEAD"]);
      return {
        status: "in_progress",
        message: "Rebase in progress",
      };
    } catch {
      return {
        status: "completed",
        message: "No rebase in progress",
      };
    }
  }

  async abortMerge(branch: TBranch): Promise<void> {
    await git(".", ["merge", "--abort"]);
  }

  async abortRebase(branch: TBranch): Promise<void> {
    await git(".", ["rebase", "--abort"]);
  }
}
