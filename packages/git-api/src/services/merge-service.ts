import { backend, type IGitBackend } from "../services/drivers";

import type {
  IMergeRequest,
  IRebaseRequest,
  TAbortMergeResult,
  TAbortRebaseResult,
  TGetMergeStatusResult,
  TGetRebaseStatusResult,
  TMergeBranchResult,
  TRebaseBranchResult,
} from "./types";

/**
 * Service class for handling merge and rebase operations
 * Implements API endpoints:
 * - POST   /v1/repos/:repo/merge         # Merge branch
 * - POST   /v1/repos/:repo/rebase        # Rebase branch
 */
export class MergeService {
  /**
   * Merge a branch
   * @param repo - Repository name or ID
   * @param mergeData - Merge parameters
   */
  async mergeBranch(repo: string, mergeData: IMergeRequest): Promise<TMergeBranchResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Rebase a branch
   * @param repo - Repository name or ID
   * @param rebaseData - Rebase parameters
   */
  async rebaseBranch(repo: string, rebaseData: IRebaseRequest): Promise<TRebaseBranchResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Get merge status
   * @param repo - Repository name or ID
   * @param branch - Branch name
   */
  async getMergeStatus(repo: string, branch: string): Promise<TGetMergeStatusResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Get rebase status
   * @param repo - Repository name or ID
   * @param branch - Branch name
   */
  async getRebaseStatus(repo: string, branch: string): Promise<TGetRebaseStatusResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Abort an in-progress merge
   * @param repo - Repository name or ID
   * @param branch - Branch name
   */
  async abortMerge(repo: string, branch: string): Promise<TAbortMergeResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Abort an in-progress rebase
   * @param repo - Repository name or ID
   * @param branch - Branch name
   */
  async abortRebase(repo: string, branch: string): Promise<TAbortRebaseResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }
}