Semantic-Repo File-tree (runtime)
```
semantic-repo/
└── .semantic/
    ├── version                       # single-line schema version
    ├── groups/
    │   └── <group_name>/
    │       ├── config.json           # declarative definition (source of truth)
    │       └── lock.toml             # optional, pins model digests
    ├── index/
    │   ├── lanes/<lane_sha256>/      # one sub-folder per lane, sha256 of a lane from group's config.json
    │   │   ├── uuid1.json            # one file per embedding job
    │   │   └── uuid2.json
    │   └── blobs/                    # s3 mount point for object store
    │       └── <sha256[0:2]>/<sha256>  # two-level sharding
    ├── cache/                        # entities pre-computed and cached for quick access
    │   └── <group_sha256>/           # sha256 of a group from group's config.json
    │       └── <commit_sha>.entities.jsonl.zst # append-only, one line per semantic entity
```

## Semantic Entity Line
```json
{
  "entity_id": "q4_report-page-7",
  "src_sha256": "abcd1234…",
  "file_path": "reports/2024/Q4/report.pdf",
  "byte_range": [358400, 423123],      // optional slice info
  "mime_type": "application/pdf",
  "metadata": { "author": "Finance", "created": "2024-10-05" },
  "git_commit": "a3f6e2"
}
```
- The file is append-only (old files are GC’d by retention).
- Typically < 1 MB even for hundreds of thousands of entities.
- Generated once whenever the underlying LakeFS commit changes or the filter/grouping definition is updated.
- Cached to avoid recalculating the files->entity mappings (useful for explorer UI).
  
**How is it produced**:
- A lightweight `background worker` (or Git-hook) subscribes to:
  - new commits on the watched branch, and
  - modifications to groups/*/config.json.
- It re-runs the filter + grouping once, writes the new cache file, then emits an event on the GraphQL subscription topic: "CACHE_REFRESHED".


## Manifest.jsonl (per lane)
```json
{
  "entity_id": "reports/q4_2024.pdf",
  "src_sha256": "ab34…cd",
  "blob_sha256": "9f12…78",
  "lane_sha256": "2ga3f2..31",
  "embedder": "bert-base-finetuned-finance",
  "model_cfg_digest": "sha256:2a9c…01",
  "git_commit": "a3f6e2",
  "created_at": "2024-10-05T14:23:11Z",
  "tags": ["finance", "en"]
}
```

## Notes
A semantic group (which the ISemanticGroup is supposed to represent) maps LakeFS file content into `Semantic Entities` by filtering their paths and grouping based on certain conditions. The `filtering` decides which files from LakeFS to allow-in, and the `grouping` determines what constitute a semantic entity from the allowed-in files. For example, a `book chapter` semantic entity may be defined by its filter of *.pdf and grouping of page ranges. 

An example semantic group definition is [here](group-config-sample.json); 

A semantic group is identified by its SHA256 internally, and by its `name` visibly. In a `semantic-repo`, when a semantic group is created, a folder with its `name` as pathname is created under the `.semantic/groups/` path, under which its definition file (config.json) is placed. 

The `lanes`  in the `config.json` define set of AI indexer/embedder/chunkers that need to be run on top of the content that is mapped (from LakeFS, based on the `filter` and `grouping`). Each embedder generates vector blobs which are stored under the `.semantic/index/blobs/` path by their sha256, and a manifest json file is created under the `.semantic/index/lanes/<lane_sha256>/` folder to keep track of the location of blobs.

Since the `filter` and `grouping` are costly to run, we cache the LakeFS -> semantic-entity mappings under the path `.sematic/cache/<group_sha256>/<commit_sha>.entities.jsonl` where the `commit_sha` is the commit of LakeFS that triggered this indexing operation.

The `semantic-repo` itself is under a (separate) version control (git), which keeps track of any modifications to the `config.json` files, and also acts as backup mechanism for the `manifest.json` files. The `.semantic/index/blobs/` may be part of the git (in which case the GIT LFS has to be enabled), or could be an S3 or similar object storage mount point. The `.semantic/cache` may be made part of the git or ignored (since it can be recalculated on demand, though not efficient).

## Performance tricks

One file per embedder outcome has the below advantages:

| Area                   | Benefit                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Atomicity**          | One `writeFileSync(tmp)` + `renameSync(final)` = atomic.                                                               |
| **rsync / S3**         | Each file is immutable; partial transfers are impossible; perfect for `rclone`, `gsutil`, Airbyte, Dremio mounts, etc. |
| **Schema flexibility** | Each file is self-describing JSON; nested fields welcome.                                                              |
| **Embedding payload**  | You can inline the **raw vector** (base64 or float array) inside the same JSON file instead of a separate blob file.   |
| **Parallel ingest**    | ClickHouse or DuckDB can `SELECT * FROM 's3://bucket/lanes/**/*.json'` without extra ETL.                              |

Standalone `manifest.json` files are *good enough*, but we do *strictly better* with three small tweaks** that keep the “clone-and-resume” property intact while improving **random read, compaction, and cross-machine sync** performance.

---

### 1. Keep the append-only **log**, but add an **index side-car**

| problem with pure `.json` | remedy |
|---------------------------|--------|
| Reading “latest embedding for entity X” is O(n). | Mount these json files into datalake and index for faster access. |
| Appending is still O(1); index is rebuilt lazily or in the background. | Index file can be **re-generated deterministically** from the `.json`, so it is safe to drop when user does rsync or `git clone`. |

When a repo is cloned, it already contains the **source-of-truth log** (`.json`); the index is just a cache that is regenerated on first access, so the “move to any machine” requirement is preserved.

---

### 2. Periodic **immutable snapshots** instead of endless log growth

| problem | remedy |
|---------|--------|
| After months, `manifest.json` files become too many hundreds of thousands of files. | Organize the files into sub-folders `YYYY/MM/DD/manifest.json`. |
| Clone/sync only fetches the new segments (rsync, Git LFS, S3). | Old segments are **immutable**, so deduplication across machines is automatic. |

We still *can* read any historical entry, but the hot path only touches the last segment.

---

### 3. Store **blobs outside Git**, keep *only* the manifest in Git

| problem | remedy |
|---------|--------|
| Git LFS is slow for multi-GB vectors. | Keep the `.json` + tiny index in Git (hundreds of KB). |
| | Store blobs under `.semantic/index/blobs/<sha256>` as *plain files* or in an **external object store** (S3, MinIO, local disk). |
| | A simple `blobs/` → `s3://bucket/semantic/blobs/<sha256>` symlink or `rclone` config lets the repo move to another machine and **re-hydrate** on demand. |

This satisfies the “clone & resume” requirement:  
- Git clone brings down the *manifests* (tiny).  
- `rclone sync s3://…/blobs .semantic/index/blobs` (or let the background worker lazily fetch) brings back the heavy data.  
- Missing blobs are detected by SHA256 mismatch and refetched automatically.

---

### 4. Optional turbo mode: **content-addressed, immutable parquet**

If we ever outgrow JSON:

- Each lane emits a **parquet file** keyed by `blob_sha256`.  
- Append-only parquet “row groups” give you columnar compression, predicate push-down (`WHERE entity_id = …`), and zero-copy reads in Python/Rust.  
- Still 100 % reproducible: the parquet can be rebuilt from the `.json` if lost.

---

We gain **fast random look-ups**, **bounded file sizes**, and **cross-machine portability** without giving up the immutability and auditability that individual files provide.