import type {
  IMergeRequest,
  IMergeResult,
  IMergeStatus,
  IRebaseRequest,
  IRebaseResult,
  IRebaseStatus,
  TBranch,
  TSha,
} from "../../types";
import { IRepoBase, okGit } from "./helpers";

export class MergeRebaseOperations extends IRepoBase {
  // Merge/Rebase operations
  async merge(branch: TBranch, options?: IMergeRequest): Promise<IMergeResult | IMergeStatus> {
    const args = ["merge"];
    if (options?.strategy === "squash") args.push("--squash");
    if (options?.strategy === "rebase") args.push("--rebase");
    args.push(branch);

    try {
      const { output: out } = await okGit(this.repoPath, args);
      // Parse output to determine if merge was successful
      const { output: sha } = await okGit(this.repoPath, ["rev-parse", "HEAD"]);
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
      const { output: out } = await okGit(this.repoPath, args);
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
      await okGit(this.repoPath, ["rev-parse", "MERGE_HEAD"]);
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
      await okGit(this.repoPath, ["rev-parse", "REBASE_HEAD"]);
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
    await okGit(this.repoPath, ["merge", "--abort"]);
  }

  async abortRebase(branch: TBranch): Promise<void> {
    await okGit(this.repoPath, ["rebase", "--abort"]);
  }
}
