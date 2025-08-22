import type { ICommit, ICommitCreateRequest, IListCommitsOptions, TCommitMessage, TSha } from "../../types";
import { gitStream, IRepoBase, okGit } from "./helpers";

export class CommitOperations extends IRepoBase {
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
    for await (const data of gitStream(this.repoPath, args)) {
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
    const { output: out } = await okGit(this.repoPath, [
      "show",
      "--format=%H|%s|%an|%ae|%ad|%cn|%ce|%cd|%T",
      "--no-patch",
      sha,
    ]);
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
    const { output: parentsOut } = await okGit(this.repoPath, ["rev-list", "--parents", "-n1", sha]);
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
    // For a shell-based implementation that matches the API:
    // 1. Create a tree object from the provided tree SHA
    // 2. Create the commit object with git commit-tree
    // 3. Update the HEAD reference to point to the new commit

    // First, let's create the commit using git commit-tree
    const args = ["commit-tree", options.tree];

    // Add parent commits if provided
    if (options.parents) {
      for (const parent of options.parents) {
        args.push("-p", parent);
      }
    }

    // Add author if specified
    if (options.author) {
      args.push("--author", `${options.author.name} <${options.author.email}>`);
    }

    // Execute commit-tree with message from stdin
    const { output: commitSha } = await okGit(this.repoPath, args, { stdin: Buffer.from(options.message) });

    // Update HEAD to point to the new commit
    await okGit(this.repoPath, ["update-ref", "HEAD", commitSha.trim()]);

    // Return the commit details
    return this.getCommit(commitSha as TSha);
  }

  async updateCommitMessage(sha: TSha, message: TCommitMessage, force?: boolean): Promise<ICommit> {
    // To update a commit message, we can use git commit --amend
    // However, this only works for the HEAD commit
    // For a more general solution, we would need to use git filter-branch or similar

    // For now, let's implement a simple version that works for HEAD
    const { output: headSha } = await okGit(this.repoPath, ["rev-parse", "HEAD"]);
    if (headSha.trim() === sha) {
      // Amend the HEAD commit
      await okGit(this.repoPath, ["commit", "--amend", "-m", message]);
      const { output: newSha } = await okGit(this.repoPath, ["rev-parse", "HEAD"]);
      return this.getCommit(newSha.trim() as TSha);
    } else {
      // For non-HEAD commits, this is more complex
      // We would need to rebase or use filter-branch
      throw new Error("Updating commit message for non-HEAD commits is not implemented");
    }
  }

  async revert(sha: TSha): Promise<ICommit> {
    const { output: out } = await okGit(this.repoPath, ["revert", "--no-edit", sha]);
    // Parse the output to get the new commit details
    const { output: newSha } = await okGit(this.repoPath, ["rev-parse", "HEAD"]);
    return this.getCommit(newSha.trim() as TSha);
  }

  async reset(target: TSha, mode: "soft" | "mixed" | "hard"): Promise<void> {
    await okGit(this.repoPath, ["reset", `--${mode}`, target]);
  }
}
