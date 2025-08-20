import { backend } from "../git/backend";
import type { IGitBackend } from "../git/base";
import type {
  IIndex,
  IIndexAddRequest,
  IIndexRemoveRequest,
  IIndexUpdateRequest,
  TAddToIndexResult,
  TGetIndexResult,
  TRemoveFromIndexResult,
  TUpdateIndexResult,
} from "./types";

/**
 * Service class for handling index (staging) operations
 * Implements API endpoints:
 * - GET    /v1/repos/:repo/index         # List staged changes
 * - POST   /v1/repos/:repo/index/:path  # Stage file
 * - DELETE /v1/repos/:repo/index/:path  # Unstage file
 * - POST   /v1/repos/:repo/index/:path/patch # Stage patch
 * - POST   /v1/repos/:repo/index/:path/discard # Discard worktree changes
 */
export class IndexService {
  private backend: IGitBackend;

  constructor() {
    this.backend = backend.current();
  }

  /**
   * List staged changes in a repository
   * @param repo - Repository name or ID
   */
  async listStagedChanges(repo: string): Promise<TGetIndexResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Stage a file
   * @param repo - Repository name or ID
   * @param path - File path to stage
   */
  async stageFile(repo: string, path: string): Promise<void> {
    await this.backend.stageFile(repo, path);
  }

  /**
   * Unstage a file
   * @param repo - Repository name or ID
   * @param path - File path to unstage
   */
  async unstageFile(repo: string, path: string): Promise<void> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Stage a patch
   * @param repo - Repository name or ID
   * @param path - File path to stage patch for
   * @param patch - Patch content
   */
  async stagePatch(repo: string, path: string, patch: string): Promise<void> {
    await this.backend.stageFile(repo, path, patch);
  }

  /**
   * Discard worktree changes for a file
   * @param repo - Repository name or ID
   * @param path - File path to discard changes for
   */
  async discardWorktreeChanges(repo: string, path: string): Promise<void> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Add files to the index
   * @param repo - Repository name or ID
   * @param addRequest - Add request parameters
   */
  async addToIndex(repo: string, addRequest: IIndexAddRequest): Promise<TAddToIndexResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Update files in the index
   * @param repo - Repository name or ID
   * @param updateRequest - Update request parameters
   */
  async updateIndex(repo: string, updateRequest: IIndexUpdateRequest): Promise<TUpdateIndexResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }

  /**
   * Remove files from the index
   * @param repo - Repository name or ID
   * @param removeRequest - Remove request parameters
   */
  async removeFromIndex(repo: string, removeRequest: IIndexRemoveRequest): Promise<TRemoveFromIndexResult> {
    // Implementation will be added
    throw new Error("Not implemented");
  }
}