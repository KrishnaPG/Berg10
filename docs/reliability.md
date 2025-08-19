Here we scrutinize reliability of the `semantic-repo` operations. For example, 
  1.  when `semantic entities` are being calculated (whenever a new commit is observed from LakeFS or Group's filter/grouping definitions change), what happens if the app crashes? How to ensure we resume from that point (and avoid recomputing the earlier ones)? How do we know if we completed and the progress at any time?
  2.  when `AI Indexer` is running embed jobs what happens if the app crashes? How do we resume correctly? How to know the progress and guarantee completeness?

We need an extremely reliable system - lets identify all weak points and make them reliable.

Below is a **fault-tolerance checklist** that treats every step in the `semantic-repo` i/o pipelines as a **transaction** and guarantees **exactly-once semantics** even after power-loss, OOM-kills, or container restarts.  Nothing is left to chance.

────────────────────────────────────────────────────────
1.  Semantic-entity computation pipeline  
   (LakeFS commit / group-def change ➜ `.cache/<group_sha>/<commit_sha>.entities.jsonl`)
────────────────────────────────────────────────────────
A.  Job identity  
    •  Job-ID = `sha256(group_sha + commit_sha + version_of_config.json)`  
      – deterministic, idempotent.  
    •  Persisted in **job ledger** (DuckDB/SQLite or embedded KV):  
      `(job_id, status, created_at, worker_id, heartbeat_ts)`

B.  Three-phase commit  
    1.  **BEGIN** – insert row into `job ledger` with status=RUNNING.  
    2.  **CALCULATE** – stream entities to a **temp file**  
        `.cache/<group_sha>/<commit_sha>.entities.jsonl.tmp.<uuid>`  
        – every 1000 entities fsync() and write **offset** to ledger.  
    3.  **FINISH** – rename tmp file to final name (atomic on POSIX),  
        update ledger status=COMPLETED, flush WAL.

C.  Crash recovery  
    •  Worker restart → scan ledger for any RUNNING job whose heartbeat > N s stale.  
    •  If temp file exists and size == offset in ledger → **resume append** at that offset.  
    •  Otherwise → delete temp file, start over (idempotent because same Job-ID).

D.  Progress visibility  
    •  Ledger table exposed via GraphQL subscription `jobUpdates(job_id)`.  
    •  `berg10 status` shows %, ETA, ETA is updated continuously.

────────────────────────────────────────────────────────
2.  AI-indexer pipeline  
   (semantic entity ➜ vector blob ➜ manifest.jsonl line)
────────────────────────────────────────────────────────
A.  Work-queue design  
    •  Per-lane queue stored as **append-only log**  
      `.semantic/index/lanes/<lane_sha256>/queue.jsonl`  
      each record: `{enqueue_ts, entity_id, src_sha256, retries, lease_expires?}`  
    •  Pop semantics:  
      – worker does **atomic compare-and-swap** on `lease_expires=null` → sets worker-id + 5 min lease.  
      – after successful embed, **idempotent publish** blob + append manifest line.

B.  Exactly-once blob storage  
    •  Blob path already content-addressed (`sha256(blob)`) → safe to PUT-if-absent.  
    •  Manifest append guarded by **file write-ahead** + **fsync**; duplicate lines are ignored because entity_id + blob_sha256 is unique.

C.  Crash recovery  
    •  Worker restart → re-queue any entity whose lease expired.  
    •  Idempotent blob write ensures no duplication.  
    •  Manifest append is append-only, so duplicates naturally collapse.

D.  Progress & completeness  
    •  Queue log length == total work.  
    •  Count of manifest lines per entity gives **exact progress %** exposed via GraphQL.  
    •  Background checker process verifies:  
      – every entity_id in queue has at least one manifest line; if not → re-enqueue.  
      – every blob referenced in manifest exists on disk / S3; if missing → re-embed.

────────────────────────────────────────────────────────
3.  Cross-cutting safeguards
────────────────────────────────────────────────────────
1.  **Single source of truth**  
    – job ledger + queue log + manifest files live inside `.semantic/` so they are versioned with the same Git/LakeFS guarantees.  
2.  **Atomic disk ops**  
    – All writes use `rename(tmp, final)` and `fsync` directories.  
3.  **Checkpoint interval**  
    – Tunable flag `--checkpoint-every=N` (entities or seconds).  
4.  **Observability hooks**  
    – OpenTelemetry traces for every phase; metrics: `semantic_jobs_total`, `semantic_job_duration_seconds`, `semantic_queue_depth`.  
5.  **Local dev parity**  
    – `semanticctl dev` uses the same ledger/queue implementation (SQLite) so reliability behavior is identical to production.

With these mechanisms the system survives any single crash and **never recomputes work that has already been durably recorded**, while providing **real-time visibility** into progress and completeness.