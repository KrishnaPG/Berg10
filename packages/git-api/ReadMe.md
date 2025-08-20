# Ultra-High-Performance Git-Repo Management API v2 

- **Tech-Stack**: C (libgit2 / shell-git) + Bun (Elysia) + Protobuf/gRPC + GraphQL  
- **Goal**: p99 read ≤ 1 ms, p99 write ≤ 50 ms, hot-swap backend at runtime, 99.9 % uptime

---
1. API Surface (v2 – full CRUD & porcelain)

- Repository  
  - Init, Delete, Clone, Mirror, GC, Config (key/value)
  
- Refs (branch / tag)  
  - List, Get, Create, Delete, Rename, Protect, Unprotect
  
- Commit  
  - List, Get, Create (lightweight + signed), Cherry-pick, Revert, Amend, Reset (--soft/--mixed/--hard)
  
- Tree / File  
  - ListFiles(tree-ish, path, recursive)  
  - GetBlob(tree-ish, path)  
  - PutBlob(path, content, mode)  
  - DeleteBlob(path)  
  - Move/Rename(oldPath, newPath)
  
- Index (staging)  
  - ListStaged  
  - StageFile(path)  
  - UnstageFile(path)  
  - StagePatch(path, patchText)  
  - DiscardWorktree(path)
  
- Stash  
  - ListStashes  
  - SaveStash(message, includeUntracked)  
  - ApplyStash(index)  
  - DropStash(index)
  
- Diff  
  - DiffCommits(from, to, contextLines, renameThreshold)  
  - DiffIndex(tree-ish, cached)  
  - DiffWorktree(path)  
  - FormatDiff(diffId, format=patch|json|stat)
  
- Log / Blame  
  - Log(range, path, limit, offset)  
  - Blame(path, rev)
  
- Merge / Rebase  
  - Merge(branch, fastForward, message)  
  - Rebase(branch, onto, interactive)

---
1. Data + Compute Layer

Backend Abstraction  
```ts
  interface GitBackend {  
    init(repoPath: string): Promise<void>  
    switchBackend(to: 'libgit2' | 'shell'): void  
    // …all CRUD methods…  
  }
```
Implementations  
  - LibGit2Backend (NodeGit or C native addon via N-API)  
    - Zero-copy buffer sharing between JS/C via ArrayBuffer.  
    - Thread-safe, pooled libgit2 objects.  
  - ShellGitBackend (spawn git)  
    - Streaming stdout via Bun.file() + ReadableStream.  
    - Fallback for exotic porcelain not yet in libgit2.

Hot-swap  
  - Config file + env var GIT_BACKEND=(libgit2|shell).  
  - Graceful zero-downtime switch via atomic pointer swap; in-flight requests drain.

Cache & Index  
  - L1: Bun shared mmap cache for packfile indexes (lmdb).  
  - L2: Redis for ref advertisement & diff cache (etag = sha256(diff)).  
  - Bloom filter for “does this path exist in this tree” before I/O.

Concurrency  
  - Each repo has one async RW lock (futex-backed).  
  - Background thread pool (C) for expensive ops: repack, diff, blame.

Observability  
  - OpenTelemetry-C bridge → Prometheus.  
  - Bun built-in perf hooks exported as histograms.  
  - Canary test: randomly switch backend on 1% of requests.

---
1. API Layer

Elysia (Bun)  
  - HTTP/2 auto via Bun.serve().  
  - Typebox validation for JSON payloads.  
  - WebSocket stream for live log/blame.  

Routes (REST)  
```
  GET    /v1/repos/:repo/files?rev=<tree-ish>&path=<dir>&recursive=1  
  POST   /v1/repos/:repo/stage  {path, patch?}  
  POST   /v1/repos/:repo/stash  {message, includeUntracked}  
  PATCH  /v1/repos/:repo/commits/:sha/revert  
  GET    /v1/repos/:repo/diff?from=a&to=b&format=patch  
```
GraphQL  
```graphql
  type Query {  
    files(repo: ID!, rev: String!, path: String, recursive: Boolean): [File!]!  
    diff(repo: ID!, from: String!, to: String!, contextLines: Int): Diff!  
    stashes(repo: ID!): [Stash!]!  
  }  
  type Mutation {  
    stage(repo: ID!, path: String!, patch: String): Boolean!  
    stashSave(repo: ID!, message: String, includeUntracked: Boolean): Stash!  
    revertCommit(repo: ID!, sha: String!): Commit!  
  }
```
Streaming  
  - SSE `/graphql/subscribe` for “repo events” (new commit, ref move).  

---
1. Implementation Notes (C vs Shell)

Commit
```  
  libgit2: git_signature_new + git_commit_create  
  shell: git commit-tree + git update-ref
```
Revert  
```
  libgit2: git_revert_commit (creates new commit)  
  shell: git revert --no-edit <sha>
```
Stash  
```
  libgit2: git_stash_save / git_stash_apply  
  shell: git stash push -m <msg>
```
Diff  
```
  libgit2: git_diff_tree_to_tree → git_patch_to_buf  
  shell: git diff-tree --patch
```
Hot-swap guard  
  - When `backend == 'shell'`, spawn with `Bun.spawn({ cmd: ['git', ...], stdout: "pipe" })`.  
  - When `backend == 'libgit2'`, call C addon directly.
