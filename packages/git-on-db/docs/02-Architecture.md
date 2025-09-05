# Architectural Specification  
**Git → DuckLake Parquet WAL Mirror**  
*Runtime: Bun (TypeScript)*  
*Target: DuckDB-compatible parquet lake (DuckLake specification v1.0)*  

---

## Background
Think of Git, but instead of maintaining the git internal data in files, we do it in DuckDB (DuckLake) database.

All the commit, branch, tags, list of files/objects data has to stay in the database.

When an existing git repo (which uses .git folder for its internal files) is ported onto our system, we should be able to read the git repo internal files  and convert them into DuckDB compatible parquet files with accurate information, and our new db should work like exact replica of the original git repo (since duckdb can directly query from parquet files). All basic operations (such as file staging, commits, reverts, diff etc.) that the original git repo can do, we should be able to do on our database.

The whole operation should be idempotent. Performance is important, and reliability (if the app crashes/pauses in between git->parquet transformation, it should be able to safely resume from where it left-off). It may also need to be run frequently to keep the parquet files in sync with latest changes to git repo internal files (which means, our mechanism should detect the changes pending and only do incremental transform to parquet files and not everything).

Most important: at any given point, our DB (i.e. parquet files) should be in a consistent state. ie. transactional transform semantics are needed.


This is our core design: `Git-native WAL → Parquet WAL`. Core idea:
- Treat Git itself as a **write-ahead log** (objects, refs, index).  
- Mirror that log into a **parquet WAL** that DuckDB can read directly.  
- Keep a “last-seen” Git-commit SHA in DuckDB; on every run replay only the missing objects.

Runtime pipeline:
1. `git rev-list --objects --since <last-seen>` → list of new objects.  
2. Stream those objects through `git cat-file --batch` → Arrow record-batches → parquet files  
   (one file per Git object type: commit, tree, blob, tag; partitioned by `hash[0:2]`).  
3. Append to **immutable** parquet files; never mutate existing files.  
4. Update a tiny “_sync_state” parquet file (single row: last-seen SHA, timestamp, txn-id).  
5. Wrap 2-4 in a single **DuckDB transaction** (`BEGIN; COPY …; UPDATE _sync_state; COMMIT`).  
   Crash → on restart read _sync_state and resume from that SHA.


## 0. Glossary & Non-functional Requirements

| Term               | Meaning |
|--------------------|---------|
| **Idempotent**     | Re-running the same binary with identical Git state produces **zero** new parquet files and **identical** DuckLake content. |
| **Restart-safe**   | `kill -9` at any instant never leaves DuckLake or LMDB in an inconsistent state; next run continues **exactly** where previous stopped. |
| **Incremental**    | Only objects added since last successful run are processed (O(Δ) time). |
| **Transactionally-consistent** | Readers either see **all** or **none** of the new objects committed in one run. |
| **Enterprise-grade** | Single binary, zero external services, CPU-bound throughput ≥ 1 GB/s on NVMe, memory ceiling 512 MB, supports repos ≥ 5 TB, POSIX & Windows. |

---

## 1. High-level Flow (exact order, no deviation)

```
┌--------------┐
│  1.  Lock    │  file-system advisory lock on `.git_duck_sync/lock`
└------┬-------┘
       │
┌------┴-------┐
│  2.  LMDB    │  read last checkpoint (reflog-seq, commit-sha, parquet-sn)
└------┬-------┘
       │
┌------┴-------┐
│  3.  Git     │  `git rev-list --objects --reflog --since-order=<reflog-seq>
└------┬-------┘
       │
┌------┴-------┐
│  4.  Stream  │  `git cat-file --batch` → Arrow IPC → parquet (tmp file)
└------┬-------┘
       │
┌------┴-------┐
│  5.  Rename  │  tmp → final deterministic path (hash based)
└------┬-------┘
       │
┌------┴-------┐
│  6.  LMDB    │  update checkpoint (atomic txn)
└------┬-------┘
       │
┌------┴-------┐
│  7.  Unlock  │
└--------------┘
```

---

## 2. Directory Layout (immutable contract)

```
repo/
├─ .git/
└─ .git_duck_sync/
   ├─ lock                      # advisory lock (flock)
   ├─ lmdb/                     # LMDB environment, two dbs:
   │   ├─ checkpoint            # single key → msgpack blob
   │   └─ blob_cache            # sha256 → {size, reflog_seq}
   ├─ v2/                       # DuckLake root
   │  ├─ _sync_state.parquet    # DuckDB readable checkpoint (single row)
   │  ├─ commit/
   │  │  └─ part_hash=ab/
   │  │     └─ ab1c2d3e…f.parquet
   │  ├─ tree/
   │  ├─ blob/
   │  └─ tag/
   └─ tmp/                      # staging area for in-flight files (cleaned on start)
```

---

## 3. Configuration Schema (single JSON file)

`.git_duck_sync/config.json` (must be validated on start against TypeScript type):

```json
{
  "version": 1,
  "parquet": {
    "targetRowGroupSize": 134217728,   // 128 MiB uncompressed
    "compression": "zstd",
    "pageChecksum": true,
    "maxOpenFiles": 64
  },
  "sync": {
    "reflogLookbackHours": 24,
    "workers": 0,                       // 0 == os.cpus().length
    "channelCapacity": 10000,
    "memoryLimitMiB": 512
  },
  "logging": {
    "level": "info",                    // trace | debug | info | warn | error
    "file": ".git_duck_sync/log.jsonl"  // JSON-L, rotatable
  }
}
```

---

## 4. Component Breakdown (SOLID, single responsibility)

| Component | File | Responsibility |
|-----------|------|----------------|
| **Locker** | `src/locker.ts` | Advisory lock, timeout 30 s, automatic stale lock break (PID based). |
| **ConfigLoader** | `src/config.ts` | Load & validate JSON, provide singleton `Config` object. |
| **GitCli** | `src/git.ts` | Typed wrappers around `git` child-process, streaming parsers. |
| **LmdbStore** | `src/lmdb.ts` | Checkpoint & blob-cache CRUD, atomic transactions. |
| **ParquetWriter** | `src/parquet.ts` | Arrow → parquet with deterministic path, page checksums, fsync. |
| **ObjectStreamer** | `src/streamer.ts` | Coordinate `git cat-file --batch`, back-pressure, back-fill blob-cache. |
| **Coordinator** | `src/coordinator.ts` | Orchestrate the 7-step flow, handle errors, retries, metrics. |
| **DuckStateUpdater** | `src/duckstate.ts` | Append `_sync_state.parquet` row inside DuckDB transaction. |
| **EntryPoint** | `src/main.ts` | CLI parser, signal handlers, graceful shutdown. |

---

## 5. TypeScript Interfaces (copy–paste ready)

```typescript
// src/types.ts
export type ObjectType = 'commit' | 'tree' | 'blob' | 'tag';

export interface GitObject {
  readonly sha: string;          // 64 hex
  readonly type: ObjectType;
  readonly size: number;         // bytes
  readonly data: Uint8Array;     // full uncompressed bytes from cat-file
}

export interface Checkpoint {
  readonly reflogSeq: number;    // uint64
  readonly lastCommitSha: string;
  readonly parquetSn: number;    // monotonic
  readonly txnId: string;        // uuid v4
  readonly ts: bigint;           // epoch ms
}

export interface Config {
  readonly version: 1;
  readonly parquet: {
    readonly targetRowGroupSize: number;  // uncompressed bytes
    readonly compression: 'zstd' | 'snappy' | 'gzip';
    readonly pageChecksum: boolean;
    readonly maxOpenFiles: number;
  };
  readonly sync: {
    readonly reflogLookbackHours: number;
    readonly workers: number;
    readonly channelCapacity: number;
    readonly memoryLimitMiB: number;
  };
  readonly logging: {
    readonly level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    readonly file: string;
  };
  readonly ingestMode: IngestMode;   // default = FULL
}

export enum IngestMode {
  FULL        = 'full',        // original behaviour
  META_ONLY   = 'meta_only',   // commits, tags, trees, **no blob data**
  COMMIT_ONLY = 'commit_only'  // commits + tags only
}
```

---

## 6. Component Specifications

### 6.1 Locker

```typescript
export class Locker {
  constructor(private lockFile: string) {}
  async acquire(): Promise<void>   // throws after 30 s
  async release(): Promise<void>
}
```

- Uses `fs.open(lockFile, 'wx')` then `flock(fd, LOCK_EX | LOCK_NB)` via `bun:ffi` (`libc.flock`).  
- On `EAGAIN` read stored PID; if PID dead → unlink & retry once.  
- `release()` must be called in `finally` block.

---

### 6.2 ConfigLoader

```typescript
export function loadConfig(path: string): Config {
  // Typebox schema validation, throws on mismatch
}
```

---

### 6.3 GitCli

```typescript
export class GitCli {
  constructor(private repoPath: string) {}

  // Returns stream of lines  "<sha> [<path>]"
  revList(args: string[]): ReadableStream<Uint8Array>

  // Returns duplex stream: write "sha\n", read GitObject
  catFileBatch(): TransformStream<string, GitObject>

  // Current reflog sequence number (git reflog | wc -l)
  async reflogSeq(): Promise<number>
}
```

- Uses `spawn` with `stdio: ['pipe', 'pipe', 'inherit']`.  
- Parses `cat-file --batch` output:  
  `<sha> <type> <size>\n<data>`  
  Size verified, data sliced exactly.

---

### 6.4 LmdbStore

```typescript
export class LmdbStore {
  constructor(private env: LMDB.Environment) {}

  async getCheckpoint(): Promise<Checkpoint | null>
  async putCheckpoint(cp: Checkpoint): Promise<void>  // atomic txn
  async hasBlob(sha: string): Promise<boolean>
  async putBlob(sha: string, size: number, reflogSeq: number): Promise<void>
}
```

- LMDB maxdbs = 2 (`checkpoint`, `blob_cache`).  
- All methods return `Promise` but run on a dedicated worker thread to avoid blocking event loop (Bun worker + NAPI-RS style native addon).

---

### 6.5 ParquetWriter

Implementation of the `ParquetWriter` layer must:
- stream `git cat-file --batch` objects straight into Arrow record-batches  
- flush when **byte threshold** is reached (no row count)  
- produce **one parquet file per (object-type, partition)** per run  
- use deterministic file names (`batch_sn=<n>__<minSHA>-<maxSHA>.parquet`)  
- never mutates existing files → idempotent & restart-safe  
- keep **peak memory ≤ 512 MiB** (configurable)

```typescript
export class ParquetWriter {
  constructor(private config: Config) {}

  // Deterministic final path
  private finalPath(type: ObjectType, sn: number, minSha: string, maxSha: string): string {
    const prefix = obj.sha.slice(0, 2);
    return `batch_sn=${sn}__${minSha.slice(0, 7)}-${maxSha.slice(0, 7)}.parquet`;;
  }

  // Writes to tmp, renames to final, fsync dir
  async append(obj: GitObject): Promise<void>;
  async flushAll(): Promise<void>;
  private async flushType(type: ObjectType): Promise<void> 
}
```

- Uses `apache-arrow` JS bindings.  
- Schema per type:

```
commit:  sha string, author string, committer string, message string, tree string, parents list<string>
tree:    sha string, entries list<struct{name:string,sha:string,mode:int32}>
blob:    sha string, size int64, data binary
tag:     sha string, object string, type string, tag string, tagger string, message string
```

- Row group size = `config.parquet.targetRowGroupSize`.  
- After `close()`, call `fs.fsync(tmpFd)` then `fs.renameSync(tmp, final)` then `fs.fsync(dirFd)`.

Usage contract inside `Coordinator`:
```ts
const shas = await collectShasSince(checkpoint);

for await (const obj of gitObjectStreamer(repoPath, shas)) {
  await writer.append(obj);
}

await writer.flushAll(); // ensure last < 128 MiB group is persisted
```

---

### 6.6 ObjectStreamer

```typescript
export class ObjectStreamer {
  constructor(
    private git: GitCli,
    private writer: ParquetWriter,
    private lmdb: LmdbStore,
    private config: Config
  ) {}

  // Main method
  async stream(newShas: string[]): Promise<{written: number, bytes: bigint}>
}
```

- Creates `catFileBatch()` transform stream.  
- Workers (pooled) pull from channel, call `writer.writeObject()`.  
- Before writing, check `lmdb.hasBlob(sha)` → skip if present (idempotency).  
- Back-pressure: when channel reaches `config.sync.channelCapacity` → pause Git stdout via `flowControl`.

Inside `ObjectStreamer.stream(...)` immediately after reading the `GitObject` from `cat-file`:
```ts
// --- idempotency gate -------------------------------------------------
if (await this.lmdb.hasBlob(obj.sha)) continue;
// --- content gate -----------------------------------------------------
if (this.config.ingestMode === 'commit_only' &&
    (obj.type === 'blob' || obj.type === 'tree')) continue;

if (this.config.ingestMode === 'meta_only' && obj.type === 'blob') continue;
// ----------------------------------------------------------------------
```

---

### 6.7 Coordinator

```typescript
export class Coordinator {
  async run(): Promise<void>
}
```

Exact sequence (must be implemented as single async function, no early returns):

1. `Locker.acquire()`  
2. `ConfigLoader.loadConfig()` → `config`  
3. `LmdbStore` open db file  
4. `GitCli` init  
5. `cp = lmdb.getCheckpoint()`  
6. `reflogSeqNow = await git.reflogSeq()`  
7. If `cp && cp.reflogSeq === reflogSeqNow` → log info ‘already up-to-date’ → goto 14.  
8. `revList = git.revList(['--objects','--reflog','--since-order='+cp?.reflogSeq||0])`  
9. Collect SHA list (memory safe: push to temp file if > 1 M entries).  
10. `ParquetWriter` init  
11. `ObjectStreamer.stream(shaList)` → metrics  
12. New `Checkpoint` object:  
    `{ reflogSeq: reflogSeqNow, lastCommitSha: headSha, parquetSn: cp.parquetSn+1, txnId: crypto.randomUUID(), ts: Date.now() }`  
13. `lmdb.putCheckpoint(newCp)`  
14. `DuckStateUpdater.append(newCp)` (optional, can be no-op if not needed)  
15. `Locker.release()`  

Error handling:  
- Any throw → log fatal → `Locker.release()` → process.exit(1).  
- Bun `SIGINT` handler calls `Coordinator.gracefulShutdown()` → wait for current step to finish → exit 0.

---

### 6.8 DuckStateUpdater

```typescript
export class DuckStateUpdater {
  async append(cp: Checkpoint): Promise<void>
}
```

- Opens in-memory DuckDB instance, attaches `_sync_state.parquet` (create if absent).  
- Executes:

```sql
BEGIN;
INSERT INTO _sync_state SELECT ? as last_commit_sha, ? as txn_id, ? as ts;
COMMIT;
```

- Uses DuckDB WASM bundled inside Bun via `duckdb-async` wasm build.

---

## 7. CLI Contract

```
$ bun run src/main.ts [--repo <path>] [--config <path>] [--once]

Options:
--repo     defaults to `process.cwd()`
--config   defaults to `<repo>/.git_duck_sync/config.json`
--once     run single sync and exit (for cron)
```

Exit codes:  
0 = success, up-to-date  
1 = error  
2 = lock held by other process

---

## 8. Observability (exact JSON-L schema)

Every component logs to `config.logging.file` with Bun `pino`:

```json
{"level":30,"time":1712345678901,"component":"Coordinator","msg":"start","repo":"/repo","checkpoint":{"reflogSeq":1234}}
{"level":30,"time":1712345679001,"component":"ObjectStreamer","msg":"progress","written":50000,"bytes":104857600}
{"level":30,"time":1712345679101,"component":"LmdbStore","msg":"checkpoint","txnId":"a1b2c3..."}
```

Metrics endpoint (optional): expose Prometheus text on `0.0.0.0:9090/metrics` via `bun-prometheus`.

---

## 9. Test Harness (deliver with code)

```
tests/
├─ unit/
│  ├─ locker.test.ts
│  ├─ parquet.test.ts
│  └─ lmdb.test.ts
├─ integration/
│  ├─ idempotent.test.ts        // run twice, assert zero new files
│  ├─ crash.test.ts             // kill -9 mid-run, assert resume
│  └─ huge.test.ts              // 1 M commit repo, 500 GB, < 5 min
```

Use `bun test` runner.  
Each test gets isolated temp repo created with `git init --bare` + `git fast-import` stream.

---

## 10. Packaging & Deployment

- Single executable: `bun build --compile src/main.ts --outfile git-duck-sync`  
- Docker image: `distroless/cc`, copy binary + `libgit2.so` (if native addon used).  
- Helm chart provided (readiness = lock held, liveness = metric timestamp < 120 s).

---

## 11. Extensibility Hooks (future proof)

```typescript
export interface Plugin {
  name: string;
  beforeWrite?(obj: GitObject): GitObject | null; // return null to skip
  afterCheckpoint?(cp: Checkpoint): void;
}
```

Coordinator accepts `--plugin ./myPlugin.ts` loaded via `import.meta.resolve`.

---

## 12. Reference Implementation Checklist

- [ ] All files above created under `src/`  
- [ ] `bun run src/main.ts --once` exits 0 on empty repo  
- [ ] Re-run immediately exits 0 and writes 0 bytes  
- [ ] `kill -9` during step 11 → restart continues from same reflog seq  
- [ ] Parquet files match DuckLake layout & schema  
- [ ] Memory stays < 512 MiB (tested with 100 k objects)  
- [ ] 100 % unit-test coverage on `ParquetWriter`, `LmdbStore`, `Locker`  

---
