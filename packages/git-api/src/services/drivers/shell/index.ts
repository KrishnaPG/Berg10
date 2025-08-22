import os from "os";
import type {
  ICloneOptions,
  IRepository,
  IRepositoryUpdateRequest,
  IRepositoryUpdateResponse,
  TPath,
} from "../../types";
import type { IGitBackend, IGitRepo, TGitBackendType } from "../backend";
import { CommitOperations } from "./commit-operations";
import { DiffOperations } from "./diff-operations";
import { git, okGit } from "./helpers";
import { IndexOperations } from "./index-operations";
import { LogOperations } from "./log-operations";
import { MergeRebaseOperations } from "./merge-rebase-operations";
import { RefOperations } from "./ref-operations";
import { RepositoryOperations } from "./repository-operations";
import { StashOperations } from "./stash-operations";
import { TreeOperations } from "./tree-operations";

// Export a class that implements IGitBackend by delegating to the operation classes
export class ShellBackend implements IGitBackend {
  init(
    repoPath: TPath,
    config?: { defaultBranch?: string; isPrivate?: boolean; description?: string },
  ): Promise<IGitRepo> {
    // First, Check if the directory is already a git repository
    return git(repoPath, ["status"])
      .then((result) => {
        // if already initialized throw error
        if (!result.exitCode && !result.errors) throw new Error(`repo init [${repoPath}]: already initialized`);
        // init the git repo if fresh
        return okGit(repoPath, ["init"]);
      })
      .then(() => this.open(repoPath))
      .then((gitRepo) => {
        // switch to the given branch, if any
        if (config?.defaultBranch) {
          return okGit(repoPath, ["checkout", "-b", config.defaultBranch]).then(() => gitRepo);
        }
        return gitRepo;
      });
  }

  // Repository operations
  clone(url: string, path: TPath, options?: ICloneOptions) {
    const args = ["clone"];
    if (options?.bare) args.push("--bare");
    if (options?.branch) args.push("--branch", options.branch);
    if (options?.depth) args.push("--depth", options.depth.toString());
    if (options?.recursive) args.push("--recursive");
    args.push(url, path);
    return okGit(os.tmpdir() as TPath, args);
  }

  async open(repoPath: TPath): Promise<IGitRepo> {
    // Create instances of all operation classes
    const repoOps = new RepositoryOperations(repoPath);
    const refOps = new RefOperations(repoPath);
    const commitOps = new CommitOperations(repoPath);
    const treeOps = new TreeOperations(repoPath);
    const indexOps = new IndexOperations(repoPath);
    const stashOps = new StashOperations(repoPath);
    const diffOps = new DiffOperations(repoPath);
    const logOps = new LogOperations(repoPath);
    const mergeRebaseOps = new MergeRebaseOperations(repoPath);
    return {
      close: async () => {
        /** in shell based backend nothing to close */
      },
      getInfo: repoOps.getInfo.bind(repoOps),

      // Ref operations
      listRefs: refOps.listRefs.bind(refOps),
      getRef: refOps.getRef.bind(refOps),
      createRef: refOps.createRef.bind(refOps),
      deleteRef: refOps.deleteRef.bind(refOps),
      renameRef: refOps.renameRef.bind(refOps),
      createBranch: refOps.createBranch.bind(refOps),
      createTag: refOps.createTag.bind(refOps),
      updateRef: refOps.updateRef.bind(refOps),

      // Commit operations
      listCommits: commitOps.listCommits.bind(commitOps),
      getCommit: commitOps.getCommit.bind(commitOps),
      createCommit: commitOps.createCommit.bind(commitOps),
      updateCommitMessage: commitOps.updateCommitMessage.bind(commitOps),
      revert: commitOps.revert.bind(commitOps),
      reset: commitOps.reset.bind(commitOps),

      // Tree operations
      listFiles: treeOps.listFiles.bind(treeOps),
      getBlob: treeOps.getBlob.bind(treeOps),
      createTree: treeOps.createTree.bind(treeOps),
      createBlob: treeOps.createBlob.bind(treeOps),
      getFileContents: treeOps.getFileContents.bind(treeOps),
      createOrUpdateFile: treeOps.createOrUpdateFile.bind(treeOps),
      deleteFile: treeOps.deleteFile.bind(treeOps),

      // Index operations
      getIndex: indexOps.getIndex.bind(indexOps),
      addToIndex: indexOps.addToIndex.bind(indexOps),
      removeFromIndex: indexOps.removeFromIndex.bind(indexOps),
      updateIndex: indexOps.updateIndex.bind(indexOps),
      stagePatch: indexOps.stagePatch.bind(indexOps),
      discardWorktree: indexOps.discardWorktree.bind(indexOps),

      // Stash operations
      listStashes: stashOps.listStashes.bind(stashOps),
      saveStash: stashOps.saveStash.bind(stashOps),
      applyStash: stashOps.applyStash.bind(stashOps),
      dropStash: stashOps.dropStash.bind(stashOps),

      // Diff operations
      diffCommits: diffOps.diffCommits.bind(diffOps),
      diffIndex: diffOps.diffIndex.bind(diffOps),
      diffWorktree: diffOps.diffWorktree.bind(diffOps),
      getCommitDiff: diffOps.getCommitDiff.bind(diffOps),

      // Log operations
      getCommitLog: logOps.getCommitLog.bind(logOps),
      getFileHistory: logOps.getFileHistory.bind(logOps),
      blame: logOps.blame.bind(logOps),

      // Merge/Rebase operations
      merge: mergeRebaseOps.merge.bind(mergeRebaseOps),
      rebase: mergeRebaseOps.rebase.bind(mergeRebaseOps),
      getMergeStatus: mergeRebaseOps.getMergeStatus.bind(mergeRebaseOps),
      getRebaseStatus: mergeRebaseOps.getRebaseStatus.bind(mergeRebaseOps),
      abortMerge: mergeRebaseOps.abortMerge.bind(mergeRebaseOps),
      abortRebase: mergeRebaseOps.abortRebase.bind(mergeRebaseOps),
    };
  }

  async listRepositories(): Promise<IRepository[]> {
    // This would require scanning the REPO_BASE directory
    // For now, returning empty array as this is typically handled at a higher level
    return [];
  }

  async updateRepository(options: IRepositoryUpdateRequest): Promise<IRepositoryUpdateResponse> {
    throw new Error("Not Implemented");
    // Repository-level updates like name, description, etc. are typically
    // handled at a higher level (e.g., in a database or service layer)
    // For git-specific settings, we could update config values

    // For now, let's return a basic response
    // const repoDetails = await this.getRepository();
    // const updatedRepo: IRepositoryUpdateResponse = {
    //   ...repoDetails,
    //   updated_at: new Date().toISOString(),
    // };

    // If there are git-specific settings to update, we would do it here
    // For example:
    // if (options.default_branch) {
    //   await git(repoPath, ["symbolic-ref", "HEAD", `refs/heads/${options.default_branch}`]);
    // }

    // return updatedRepo;
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

export type { IGitRepo };
