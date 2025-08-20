import { LRUCache } from "lru-cache";
import { CONFIG } from "../../config";
import type { TBranch, TCommitMessage, TPath, TSha, TTagName } from "../types";
import type { IGitBackend } from "./backend";

export class CachedGitBackend implements IGitBackend {
  private cache = new LRUCache<string, any>({
    max: CONFIG.CACHE_MAX_ITEMS,
    allowStale: true, // serve stale when removing
  });

  constructor(private backend: IGitBackend) {}

  async getCommit(sha: TSha) {
    const k = `commit:${sha}`;
    if (this.cache.has(k)) return this.cache.get(k);

    const c = await this.backend.getCommit(sha);
    this.cache.set(k, c); // immutable
    return c;
  }

  async diffCommits(from: TSha, to: TSha, options?: any) {
    const k = `diff:${from}..${to}`;
    if (this.cache.has(k)) return this.cache.get(k);

    const d = await this.backend.diffCommits(from, to, options);
    this.cache.set(k, d);
    return d;
  }

  /* ── All other methods follow the same pattern ──────── */
  /* … boiler-plate delegation … */
}
