import { backend, type IGitBackend } from "../services/drivers";

import type {
  ICompareCommitsOptions,
  IGetCommitDiffOptions,
  IGetDiffOptions,
  TCompareCommitsResult,
  TGetCommitDiffResult,
  TGetDiffResult,
} from "./types";

/**
 * Service class for handling diff operations
 * Implements API endpoints:
 * - GET    /v1/repos/:repo/diff          # Compare commits
 * - GET    /v1/repos/:repo/diff/index    # Compare index with working tree
 * - GET    /v1/repos/:repo/diff/worktree # Show working tree changes
 * - GET    /v1/repos/:repo/diff/:id      # Format diff output
 */
export class DiffService {

  /**
   * Get diff between commits or working tree
   * @param repo - Repository name or ID
   * @param options - Diff options
   */
  async getDiff(repo: string, options?: IGetDiffOptions): Promise<TGetDiffResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Compare two commits
   * @param repo - Repository name or ID
   * @param commit1 - First commit SHA
   * @param commit2 - Second commit SHA
   * @param options - Diff options
   */
  async compareCommits(
    repo: string,
    commit1: string,
    commit2: string,
    options?: ICompareCommitsOptions,
  ): Promise<TCompareCommitsResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Get diff of a specific commit
   * @param repo - Repository name or ID
   * @param commit - Commit SHA
   * @param options - Diff options
   */
  async getCommitDiff(
    repo: string,
    commit: string,
    options?: IGetCommitDiffOptions,
  ): Promise<TGetCommitDiffResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Compare index with working tree
   * @param repo - Repository name or ID
   */
  async diffIndexWithWorkingTree(repo: string): Promise<TGetDiffResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Show working tree changes
   * @param repo - Repository name or ID
   */
  async showWorkingTreeChanges(repo: string): Promise<TGetDiffResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }
}