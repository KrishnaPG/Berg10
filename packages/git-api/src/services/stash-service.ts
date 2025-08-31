import { backend, type IGitBackend } from "../services/drivers";

import type {
  IListStashesOptions,
  IStashApplyRequest,
  IStashCreateRequest,
  TApplyStashResult,
  TCreateStashResult,
  TDropStashResult,
  TListStashesResult,
} from "./types";

/**
 * Service class for handling stash operations
 * Implements API endpoints:
 * - GET    /v1/repos/:repo/stashes       # List stashes
 * - POST   /v1/repos/:repo/stashes      # Save stash
 * - POST   /v1/repos/:repo/stashes/:index/apply # Apply stash
 * - DELETE /v1/repos/:repo/stashes/:index # Drop stash
 */
export class StashService {

  /**
   * List stashes in a repository
   * @param repo - Repository name or ID
   * @param options - Filtering and pagination options
   */
  async listStashes(repo: string, options?: IListStashesOptions): Promise<TListStashesResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Create a new stash
   * @param repo - Repository name or ID
   * @param options - Stash creation options
   */
  async createStash(repo: string, options?: IStashCreateRequest): Promise<TCreateStashResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Apply a stash
   * @param repo - Repository name or ID
   * @param stashIndex - Stash index
   * @param applyOptions - Apply options
   */
  async applyStash(repo: string, stashIndex: string, applyOptions?: IStashApplyRequest): Promise<TApplyStashResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Drop a stash
   * @param repo - Repository name or ID
   * @param stashIndex - Stash index
   */
  async dropStash(repo: string, stashIndex: string): Promise<TDropStashResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }
}
