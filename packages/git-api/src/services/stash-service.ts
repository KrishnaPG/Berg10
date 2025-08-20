import { backend } from "../git/backend";
import type { IGitBackend } from "../git/base";

/**
 * Service class for handling stash operations
 * Implements API endpoints:
 * - GET    /v1/repos/:repo/stashes       # List stashes
 * - POST   /v1/repos/:repo/stashes      # Save stash
 * - POST   /v1/repos/:repo/stashes/:index/apply # Apply stash
 * - DELETE /v1/repos/:repo/stashes/:index # Drop stash
 */
export class StashService {
  private backend: IGitBackend;

  constructor() {
    this.backend = backend.current();
  }

  /**
   * List stashes in a repository
   * @param repo - Repository name or ID
   * @param options - Filtering and pagination options
   */
  async listStashes(repo: string, options?: {
    page?: number;
    perPage?: number;
  }): Promise<any[]> {
    // Implementation will be added
    return [];
  }

  /**
   * Create a new stash
   * @param repo - Repository name or ID
   * @param options - Stash creation options
   */
  async createStash(repo: string, options?: {
    message?: string;
    includeUntracked?: boolean;
  }): Promise<any> {
    const result = await this.backend.stashSave(repo, options?.message, options?.includeUntracked);
    return { id: result };
  }

  /**
   * Apply a stash
   * @param repo - Repository name or ID
   * @param stashIndex - Stash index
   */
  async applyStash(repo: string, stashIndex: string): Promise<void> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Drop a stash
   * @param repo - Repository name or ID
   * @param stashIndex - Stash index
   */
  async dropStash(repo: string, stashIndex: string): Promise<void> {
    // Implementation will be added
    throw new Error("Not implemented");
  }
}