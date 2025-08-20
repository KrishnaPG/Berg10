# Git-Backend Driver Cache Design  
(Zero-code for implementers, automatic for every `IGitBackend`)

---

## 1.  What can be cached?

Git is an append-only Merkle tree, therefore everything that is **addressed by an
immutable SHA-1/256** is safe to cache forever.

| Git Object (key = SHA) | Cache-ability | Notes |
|------------------------|---------------|-------|
| `Blob` content         | **∞**         | Never changes once created. |
| `Tree` listing         | **∞**         | Same tree SHA always refers to same list. |
| `Commit` object        | **∞**         | Includes meta-data, message, parents. |
| `Tag` object           | **∞**         | Lightweight and annotated tags. |
| `Diff` (Commit-to-parent) | **∞**      | Deterministic once both commits exist. |
| `Blame` for a given `<path, rev>` | **∞** | Blame is deterministic for a fixed tree. |
| `File-history` for `<path>` | **very long** | New commits only *append* history. |
| `Index`                | **ephemeral** | Working-tree only. |
| `Working-tree diff`    | **no**        | Changes constantly. |

---

## 2.  High-level architecture

We keep the cache **completely outside** every concrete implementation so that
new drivers (`libgit2`, shell, nodegit, …) get caching “for free”.

```text
┌────────────┐
│  REST/GRP  │
│  GraphQL   │
└────┬───────┘
     │ (IGitBackend)
┌────┴───────┐
│  Cache     │  ← transparent, generic wrapper
│  Layer     │
└────┬───────┘
     │ (IGitBackend)
┌────┴───────┐
│ Concrete   │  libgit2 / shell / nodegit / …
│ Backend    │
└────────────┘
```

The wrapper implements the **exact same** `IGitBackend` interface, delegates
uncached calls to the real backend, and stores/retrieves immutable answers
without the backend knowing it.

---

## 3.  Cache-Key strategy

All keys are **deterministic** and **backend-agnostic**:

| Operation | Cache-Key | TTL |
|-----------|-----------|-----|
| `getCommit(sha)` | `commit:<sha>` | ∞ |
| `getBlob(treeish, path)` | `blob:<treeish>:<path>` | ∞ |
| `listFiles(treeish, path, recursive)` | `tree:<treeish>:<path>:<recursive>` | ∞ |
| `diffCommits(parent, child)` | `diff:<parent>..<child>` | ∞ |
| `getCommitDiff(sha, options?) ` | `cdiff:<sha>:<hash-of-options>` | ∞ |
| `blame(path, rev)` | `blame:<rev>:<path>` | ∞ |
| `fileHistory(path, {page,size})` | `history:<path>:<page>:<size>` | 1 h (append-only) |
| `listRefs(type)` | `refs:<type>` | 30 s (lightweight) |
| `getRef(name)` | `ref:<name>` | 30 s (tags are immutable, but branches can change) |

| `getIndex()` | `index:<repoPath>` | 0 (do not cache) |

---

## 4.  Transparent wrapper (TypeScript sketch)

```ts
import { IGitBackend } from "./types";
import { LRU } from "lru-cache";      // any cache store
import * as crypto from "crypto";

export class CachedGitBackend implements IGitBackend {
  private cache = new LRU<string, any>({
    max: 50_000,
    ttlAutopurge: true,
  });

  constructor(private backend: IGitBackend) {}

  /* ── Example: getCommit ─────────────────────────────── */
  async getCommit(sha: string) {
    const k = `commit:${sha}`;
    if (this.cache.has(k)) return this.cache.get(k);

    const c = await this.backend.getCommit(sha);
    this.cache.set(k, c);          // immutable
    return c;
  }

  /* ── Example: diffCommits ───────────────────────────── */
  async diffCommits(from: string, to: string) {
    const k = `diff:${from}..${to}`;
    if (this.cache.has(k)) return this.cache.get(k);

    const d = await this.backend.diffCommits(from, to);
    this.cache.set(k, d);
    return d;
  }

  /* ── All other methods follow the same pattern ──────── */
  /* … boiler-plate delegation … */
}
```

Nothing inside the concrete backend changes; the wrapper is injected one level
above:

```ts
const real = new LibGit2Backend();
const app  = new CachedGitBackend(real);   // <- transparent caching
```

---

## 5.  Elysia server integration

Elysia gives us two orthogonal caching layers:

| Layer | Scope | How |
|-------|-------|-----|
| **HTTP-level** (Elysia `cache`) | Client-side & CDN | `setHeaders({ "Cache-Control": "public, max-age=31536000, immutable" })` for SHA-addressed resources. |
| **In-process** (above wrapper) | Server memory | The `CachedGitBackend` shown above. |
| **Distributed** (Redis, Memcached) | Multi-instance | Swap the LRU with `ioredis`, `cache-manager`, or Elysia’s `RedisStore`. |

Example with Elysia:

```ts
import { Elysia } from "elysia";
import { CachedGitBackend } from "./CachedGitBackend";
import { ShellBackend } from "./ShellBackend";

const git = new CachedGitBackend(new ShellBackend());

const app = new Elysia()
  .get("/repos/:owner/:repo/commits/:sha", async ({ params }) => {
    const commit = await git.getCommit(params.sha);
    return commit;
  }, {
    // 1 year for immutable commit
    beforeHandle: ({ set }) => set.headers["Cache-Control"] =
      "public, max-age=31536000, immutable"
  })
  .listen(3000);
```

---

## 6.  Invalidation strategy

* **Immutable objects** → never evicted (SHA guarantees uniqueness).  
* **Mutable refs** (`refs/heads/*`, `refs/tags/*`) → short TTL (30 s) or
  pub/sub invalidation via `git push` hooks.  
* **Working-tree** → never cached.

When a ref is updated we simply broadcast a `del("refs:*")` pattern to Redis or
clear the LRU keys that start with `refs:`.

---

## 7.  Adding a new backend

1. Implement `IGitBackend` (libgit2, nodegit, …).  
2. Wrap with `CachedGitBackend` → caching appears automatically.  
3. Done. Zero additional code.

---

## 8.  Summary checklist

✅ 100 % transparent to backend authors  
✅ Backend-agnostic keys (SHA based)  
✅ Works with **LRU**, **Redis**, **Memcached**, or **Elysia cache**  
✅ HTTP-level caching headers for CDN friendliness  
✅ No manual invalidation for immutable data  
✅ Automatic for every new `IGitBackend` implementation