#  Git on DB

## 1. The Requirement
Think of Git, but instead of maintaining the git internal data in file, we do it in DuckDB database.

All the commit, branch, tags, list of files/objects data has to be stay in the database.

When an existing git repo (which uses .git folder for its internal files) is ported onto our system, we should be able to walk the git repo (with shell git executable commands or libgit2 libraries) and fill our database with accurate information, and our new db should work like exact replica of the original git repo. All basic operations (such as file staging, commits, reverts, diff etc.) that the original git repo can do, we should be able to do on our database.

Attached the DuckDB sql code for the database. You now need to create the import function to ingest any given folder based git repo into our database. The function should accept a `TGitRepoRootPath` type input param (refer the attached branded type definitions) and replicate all the git internal data into our DB so that user can run any query/method that they can do on the native git folder repo.

Before that few things to consider:
  1. let us use Bun: we need more typesafe and less code to write.
  2. Think of very large git repo. Ingesting all that should happen at low latency. Stream based async implementation is needed. The git shell commands return streams and if we properly arrange the return field order and names, we can directly pass that line to sql insert as values to be batched without having to parse the line.
  3. The whole operation should be idempotent, and reliable. If the app crashes or pauses in-between should be able to restart/resume. Our db insert operations should be `batched` and `transactional` (either all or nothing semantics). Our DB should be always in a consistent state.

When we are importing a git folder, new commits may come to it, and we should not be worried about them. They can be imported later in the next run. Hence when the import starts the ingest method may have to check if the DB is up-to-date, or if any previous ingestion was pending, etc.

ForeignKey Violations must be addressed. Git writes to disk in bottom-up order: `blob → tree → commit → tag` . We have to follow the identical order so that every foreign-key reference already exists.

Our code should be modular and extensible. Think through step-by-step all the methods needed and their parameters, and comeup with the file structure, and what are all reusable methods we can define. The code implementation should be easy to read and maintainble and try to keep it minimal without bloating. Avoid blocking `await`s if `Promise.all()` or `Promise.any()` can parallelize them. Before writing the code for the method, lets discuss, what all design choices we have for highly performant, reliable, fail-proof, stream-based, async .git folder -> db ingestion mechanism.

## 2. The Design
Below is a **design-first** discussion.  The goal is a **single public API**:

```ts
export async function importGitFolder(
  repoRoot: TGitRepoRootPath,
  db: DuckDBClient,          // thin wrapper around DuckDB
  opts?: ImportOptions
): Promise<ImportReport>
```

that is

*   idempotent & resumable  
*   streaming & batched (low latency, constant RAM)  
*   parallel where possible, serial only where FK order demands  
*   crash-safe (transaction-per-batch)  
*   never leaves the DB in a half-written state

--------------------------------------------------------------------
1.  High-level data flow
--------------------------------------------------------------------

```
        ┌--------------┐
        │  git folder  │
        └------┬-------┘
               │  1. discover objects reachable from refs
               ▼
        ┌--------------┐
        │  topo sort   │  (memory bounded, streaming)
        └------┬-------┘
               │  2. emit objects in FK-safe order
               ▼
        ┌--------------┐
        │ batcher      │  size & time based
        └------┬-------┘
               │  3. COPY … FROM … (DuckDB streaming insert)
               ▼
        ┌--------------┐
        │  DB tables   │
        └--------------┘
```

Every stage is **restartable** because we persist the last
successfully-written object id in a tiny helper table
`gitImportCursor(repoRoot, objectId, stage)`.

--------------------------------------------------------------------
2.  FK order & table insert order
--------------------------------------------------------------------

Git on-disk order is **bottom-up**:

1.  blob  
2.  tree  
3.  commit  
4.  tag  

We **must** insert in the same order to satisfy FK constraints.
We therefore keep **four separate cursors** (one per table) and
**four independent streaming pipelines** that run in parallel
but **never insert out of order** inside their own table.

--------------------------------------------------------------------
3.  Stream source – which git command?
--------------------------------------------------------------------

We need **stable, parseable, streaming** output.

| object | git command | format string |
|---|---|---|
| blob | `git cat-file --batch-check --batch-all-objects` | `%(objectname) blob %(objectsize)` |
| tree | `git ls-tree -r -t <rev>` | `%(objectmode) %(objecttype) %(objectname) %(objectsize) %(path)` |
| commit | `git log --all --format=...` | `%H|%T|%P|%an|%ae|%at|%cn|%ce|%ct|%s` |
| tag | `git for-each-ref --format=...` | `%(refname)|%(objectname)|%(objecttype)|%(taggername)|%(taggeremail)|%(taggerdate)|%(subject)` |

All commands emit **one object per line** → we can pipe the line
directly into DuckDB’s `COPY … FROM … (FORMAT CSV, DELIMITER '|')`
without parsing in JS land → **zero-allocation, back-pressure
handled by Bun’s ReadableStream**.

--------------------------------------------------------------------
4.  Resumability / idempotency
--------------------------------------------------------------------

*   Before any write we `SELECT MAX(objectId) FROM gitObject` etc.
    → last known id becomes **resume token**.  
*   Every git command above supports *“start walking from a given
    object”* (`--since`, `--after`, `^<exclude>`) → we simply
    append the resume token to skip already imported objects.  
*   Batches are wrapped in `BEGIN; … COPY …; COMMIT;` → crash
    implies the last batch was rolled back, cursor not updated →
    next run repeats the same batch, but `INSERT OR IGNORE` makes
    it idempotent.

--------------------------------------------------------------------
5.  Parallelism boundaries
--------------------------------------------------------------------

*   **Inter-table**: blob, tree, commit, tag pipelines run in
    parallel (no FK conflict).  
*   **Intra-table**: each pipeline uses **one** sequential stream
    (git command is single-process) but we **fan-out** to
    **multiple batch inserters** (worker threads) via
    `TransformStream` → back-pressure keeps memory constant.  
*   **CPU bound** work (sha256, compression) happens inside
    DuckDB, not JS.

--------------------------------------------------------------------
6.  Transaction & batch sizing
--------------------------------------------------------------------

*   **Time gate**: flush every *N* ms (default 500 ms)  
*   **Size gate**: flush every *M* rows (default 10 000)  
*   **Back-pressure gate**: when `highWaterMark` of the
    `WritableStream` is reached we **pause** the git process via
    `childProcess.kill(SIGSTOP)` / `SIGCONT` → true streaming
    even for 100 GB repos.

--------------------------------------------------------------------
7.  File layout (modular & extensible)
--------------------------------------------------------------------

```
src/
├─ db/
│  ├─ duckdb.ts          # thin client, exposes `copyFromCSV()`
│  └─ schema.ts          # SQL literals, indexes, cursors
├─ git/
│  ├─ cmd.ts             # spawn git with format strings
│  ├─ streams/
│  │  ├─ blob.ts
│  │  ├─ tree.ts
│  │  ├─ commit.ts
│  │  └─ tag.ts
│  └─ topo.ts            # streaming topo sort (optional)
├─ import/
│  ├─ cursor.ts          # read/write gitImportCursor
│  ├─ batcher.ts         # generic time/size batcher
│  ├─ pipeline.ts        # glue stream → batcher → db
│  └─ import.ts          # single public function
└─ util/
   ├─ branded.ts
   └─ throttle.ts
```

--------------------------------------------------------------------
8.  Failure modes & self-healing
--------------------------------------------------------------------

| failure | behaviour |
|---|---|
| git process crashes | stream ends → batcher flushes partial batch → cursor **not** updated → next run restarts from same offset |
| DB connection lost | same as above |
| OOM | back-pressure pauses git → RAM stays bounded |
| corrupted object | `COPY` rejects row → whole batch rolled back → cursor not updated → next run retries same object (idempotent) |
| new commits during import | ignored; next import will pick them up (cursor is per-object, not per-ref) |

--------------------------------------------------------------------
9.  Observability
--------------------------------------------------------------------

`ImportReport` contains:

```ts
type ImportReport = {
  repoRoot: TGitRepoRootPath;
  startedAt: Date;
  finishedAt: Date;
  stages: {
    blob:  { scanned: number; inserted: number; errors: string[] };
    tree:  { scanned: number; inserted: number; errors: string[] };
    commit:{ scanned: number; inserted: number; errors: string[] };
    tag:   { scanned: number; inserted: number; errors: string[] };
  };
  cursor: Record<Stage, string | null>;
}
```

Every batch emits a `progress` event → CLI/gui can show live
counter without slowing ingestion.

--------------------------------------------------------------------
10.  Next step
--------------------------------------------------------------------

Start the **Bun implementation** (file-by-file) starting with the public `importGitFolder` function
and working inward.