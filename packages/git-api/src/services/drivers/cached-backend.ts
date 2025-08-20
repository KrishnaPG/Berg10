import { sha256 } from "@fict/crypto";
import { LRUCache } from "lru-cache";
import { CONFIG } from "../../config";
import type { IGitBackend } from "./backend";

/**
 * We wrap the drivers (such as libgit2, shell etc.) with transparent cache.
 * All calls are delegated to wrapped real backend subject to cached content.
 * 
 * Because every method on `IGitBackend` already has a unique name, we can
    - enumerate the interface at compile-time (via mapped types),
    - decide per-method whether it is cachable and build its key,
    - auto-generate the wrapper so that only the cachable ones go through the
    - shared cache helper, while the rest are plain delegates.
   No repetitious hand-written wrappers, no accidental caching of mutable data.
 */

type TUncachable =
  | "close"
  | "switchBackend"
  | "getCurrentBackend"
  | "listRepositories"
  | "getIndex"
  | "addToIndex"
  | "removeFromIndex"
  | "updateIndex"
  | "stagePatch"
  | "discardWorktree"
  | "saveStash"
  | "applyStash"
  | "dropStash"
  | "listCommits"
  | "listRefs"
  | "merge"
  | "rebase"
  | "getFileHistory"
  | "getMergeStatus"
  | "getRebaseStatus"
  | "getRef"
  | "abortMerge"
  | "abortRebase"
  | "diffIndex"
  | "diffWorktree"
  | "init"
  | "clone"
  | "open"
  | "deleteRepository"
  | "updateRepository";
/* All other IGitBackend keys are treated as cachable */

type Args<F> = F extends (...a: infer A) => unknown ? A : never;

// returns the cacheKey for a given method of IGitBackend
function cacheKey<K extends keyof IGitBackend>(method: K, ...args: Args<IGitBackend[K]>): string | undefined {
  switch (method) {
    /* immutable objects */
    case "getCommit":
      return `commit:${args[0]}`;
    case "getBlob":
      return `blob:${args[0]}:${args[1]}`;
    case "listFiles":
      return `tree:${args[0]}:${args[1] ?? ""}:${args[2] ?? false}`;
    case "diffCommits":
      return `diff:${hashArgs(...args)}`;
    case "getCommitDiff":
      return `cdiff:${hashArgs(...args)}`;
    case "blame":
      return `blame:${args[1] ?? "HEAD"}:${args[0]}`;
    /* add more as needed */
    default:
      return undefined; // not cachable
  }
}

const lruCacheOptions = { max: CONFIG.CACHE_MAX_ITEMS, allowStale: true /** serve stale before removing */ };

/**
 * Creates a cache wrapper around the given IGitBackend driver
 * @param backend the real IGitBackend object
 * @param store the Cache store
 * @returns wrapped IGitBackend object that has built-in cache
 * 
 * @example
 *  import { LibGit2Backend } from "./libgit2";
    const git = createCachedBackend(new LibGit2Backend());
    
    git.getCommit("abc123") → cached
    git.getIndex()          → direct delegate
    git.saveStash()         → direct delegate

    const git2 = createCachedBackend(new NodeGitBackend());
 */
export function createCachedBackend<T extends IGitBackend>(
  backend: T,
  store = new LRUCache<string, any>(lruCacheOptions),
): T {
  return new Proxy(backend, {
    get(target, prop: keyof IGitBackend) {
      const fn = target[prop];
      if (typeof fn !== "function") return fn;

      return async (...args: Args<IGitBackend>) => {
        const k = cacheKey(prop, ...args);
        if (k === undefined) {
          // not cachable → direct delegate
          return (fn as any).apply(target, args);
        }
        // return cached value if it exists
        if (store.has(k)) return store.get(k);
        // call the real backend and cache the result for future use
        const res = await (fn as any).apply(target, args);
        store.set(k, res);
        return res;
      };
    },
  }) as T;
}

function hashArgs<K extends keyof IGitBackend>(...args: Args<IGitBackend[K]>) {
  const argsStr = JSON.stringify(args);
  return sha256(argsStr).toBase58();
}
