# Brief
It is a AI-based semantic content management system that is designed as a virtual layer on top of versioned repository system (such as LakeFS, Git file system etc.). The concept is to abstract out where the files are actually stored (i.e. the file system paths) and rather have access to the content based on its semantic nature (i.e. video taken on certain event). To allow this we let users define `semantic groups` and organize them into manageable and meaningful virtual hierarchies.

A semantic group may virtually group content from across different underlying paths/repositories that meet certain `filter` and `grouping` criteria, along with an optional AI `indexing` criteria.
- The `filter` can be a simple regex string or an AND/OR/NOT tree of multiple conditions over the file attributes and metadata such as `filename`, `filesize`, `creation date` etc.; When it is specified as a simple string, it is presumed to be a filename regex filter.
  - The `filter` also allows specifying how to treat version updates for the underlying files. By default, all versions of a file are available in the group, but the `filter` definition can make only the latest version or certain specific version of the files to form the group.
- The `grouping` determines how the files map to form a `semantic entity` (which is a basic unit of access for content in the virtual system).
  - multiple files in a folder may map to a single semantic entity. E.g. A folder may contain `harry_potter_1.pdf`, `harry_potter_2.pdf` etc where each pdf file is a book in the `Harry Potter` series, and grouping them all together in a sequence yields `Harry Potter Series` semantic entity that represents the whole series.
  - a single file may become multiple semantic entities. E.g. a single `IEEE_Proceedings_2001.pdf` may contain articles by multiple authors, or a single tiff file may contain scanned pages where each page may be a different invoice. The `grouping` definition thus should facilitate a way to map the file into different semantic entities (e.g. each page or certain page ranges is a different entity etc.).
- The `indexing` criteria is applied by AI agent to chunk/embed/index all the `semantic entities` in the semantic group and can be fine-tuned to suit the nature of the content. For example, a `codebase` semantic group may use different chunk/embed/index criteria vs an `images` semantic group.
  - The `indexing` also allows specifying whether to `keep` or `replace` the index of earlier versions when a new version becomes available.
  - The results of the index are protected with ABAC (or better) access controls to allow selective knowledge sharing for local/remote AI agents and developer applications.
  - More than one AI model (or same model with different parameters) can be configured to index the entities simultaneously. All such indexed results are accessible for search and other query API. This helps in comparing model performances, index content at multiple LOD or with multiple modalities etc. (e.g. an image can be indexed both as B&W for edge-detection as well as in color for objection detection).

Under a semantic group, the user may create multiple sub-groups with further filtering. For example: for an `images` semantic group, there could be `personal`, `assets` etc. sub-groups. The sub-group may recursively contain more sub-groups under them as user deems fit. The entities of sub-groups under a parent are not mutually-exclusive (unlike a file system where a file can only be in one parent folder, in this virtual system a file may be accessible across different semantic groups/sub-groups as an entity if it meets the respective filter criteria). Note: For ease of use, in the following, we use `semantic group` to mean either a root level group or any sub-group under it unless explicitly stated.

The entities in a semantic group are the basic unit of access for the content and the source of knowledge derivation for AI. When the underlying files are updated on the file-system yielding new file versions, the semantic entities automatically point to the latest version of the files (unless the `filter` explicitly pins a certain version), and are also re-indexed to keep the AI indexing up-to-date (`preserving` or `replacing` the the earlier versions based on the `indexing` configuration).

An Append-only log (e.g., immutably stored) of every filter change, policy change, and indexing run are maintained that records all actions in the system by all users.

As a rule, all the underlying file system access happens as read-only. The semantic groups may be deleted (by the owner or suitable persona who has permissions) and it would not affect the underlying file system. When a semantic group is deleted, only the group definitions, entity mappings and respective index results are removed, subject to the `legal-hold` labels. i.e. we allow tagging entities with `legal-hold` labels and such entities are never pruned and are excluded from GDPR delete workflows. 

To keep the indexing size small, we may also allow pruning the earlier index data manually (when the indexing is configured to keep the earlier version indexes along side with the new versions).

Once the semantic entities are indexed, the content can be queried and accessed through AI semantic search, query, filtering based on certain conditions (date, size etc.). Custom MCP server is made available for third-party AI agents to access the semantic content as well as the derived/discovered AI knowledge from it. 

When used in Enterprise scenarios the expectation is that different teams overlay different semantic groups on the same underlying data repository, but the derived knowledge (with AI indexing) is used as common tool from differing contexts to empower business decisions at different levels. For example, Financial insights knowledge (derived through semantic groups created by the Finance team) is accessible to: 
- the AI agents (through MCP) used by the CEO to conduct competitor analysis and brainstorm business strategy, and
- the tools (built with API) used by the Auditing team for preparing compliance reports, and also
- the dashboards (built with API) used by the other management Board for governance.
When the underlying data changes, new knowledge is derived automatically, which is available in real-time to all the MCP, API, tools, AI Agents and dashboards etc.

All important events, such as semantic group creation/deletion/updation, new files becoming available to a semantic group (i.e. new files matching the filter criteria are discovered due to underlying file system changes), existing filtered file new versions becoming available, group content updates (because of underlying file version updates etc.), indexing start, end, etc. all are broadcasted for anyone to listen to and act upon.

To make it easy to build front-end UI to manage and administer the semantic groups, content and the AI indices, an API is made available with real-time updates.

# Technical

All config and index results are stored on a versioned file system (e.g. lakeFS or git) rooted at a user-chosen location (that should be different from the actual file/folder content location with no overlaps). The directory and file layout of the `semantic-repo` is:
```
semantic-repo/
├── .semantic/
│   ├── version                 # single-line format marker
│   └── index/
│       ├── sha256/             # immutable blobs 
│       │   └── 1a/…/xyz.embed  # binary vector blob, named by hash
│       └── lanes/              # one sub-folder per lane
│           ├── finance_v1/
│           │   └── manifest.jsonl  # one line per embedding job
│           ├── cv_bw_edges/
│           │   └── manifest.jsonl
│           └── cv_color_obj/
│               └── manifest.jsonl
├── groups/                     # every group is a folder
│   ├── finance/
│   │   ├── config.json         # multi-lane spec
│   │   └── lock.toml           # optional, pins embedder model + digest
│   │   └── index/
│   │       ├── 0001.sha256     # symlink or small JSON pointer file
│   │       └── 0002.sha256
│   └── cv/
│       ├── config.json
│       └── lock.toml
```
Rules:
- Anything >~ 1 MB is stored as a *blob* under `.semantic/index/sha256/`; the path is its SHA-256.
- Small JSON files (metadata, manifests) stay in clear text so they remain diff-friendly.
- Manifest line = `{entity_id, src_sha256, blob_sha256, lane_id, embedder_id, model_cfg_digest, git_commit_sha, created_at, tags}`
- Replaying the manifest in order gives exact reproducibility without rerunning the embedding job.
- Blobs are *immutable*; updating an index merely appends a new manifest line and a new blob.
- Pruning old blobs is an offline GC job (safe because manifest is append-only).

Atomicity & concurrency:
- The top-level `.semantic/index/` is append-only; writers create temp files and rename atomically.
- If the underlying store is Git, make the `manifest` a regular file so that merges conflict and humans can resolve.
- For very large corpora, switch the blob store to LakeFS/S3 and keep only the manifest in Git-LFS; the manifest is tiny.
  
Developer UX:
- `semanticctl group apply sales-videos/` works like `kubectl apply`.
- `git diff` on `config.json` shows semantic intent clearly; CI can run `semanticctl validate --dry-run`.
- Embedding jobs push blobs and append manifest lines; CI commits automatically.
- Large-scale cross-repo federation: keep manifests in each repo and have a catalog repo that merely lists `(repo_url, manifest_sha)` tuples.
- Streaming ingestion: embedder can write to a WAL file in `.semantic/wal/` first, then flush to blob+manifest every N minutes, still fits the same layout.

Performance Tactics:
| Bottleneck        | Mitigation                                                            |
| ----------------- | --------------------------------------------------------------------- |
| Large manifests   | Manifest sharding (`manifest.YYYY-MM-DD.jsonl`), tail-first rebuild.  |
| Vector insertions | Bulk insert 4 k vectors / request to Qdrant, use binary quantization. |
| Cold start        | Pre-compute mmap-friendly FAISS index for last 7 days.                |
| Hot path search   | In-memory LRU cache of top-k vector results (stale-while-revalidate). |


File details:
- `.semantic/version`
  - A tiny text file, literally one line, e.g. `1.1`.
  - Tells the tooling which on-disk format revision it is looking at.
  - If tomorrow we decide to compress blobs with `zstd` or change the manifest schema, we bump this number so that older binaries refuse to read the new layout and the new binaries can still read the old.
- `.semantic/index/manifest.jsonl`
  - JSONL = “one JSON object per line”.
  - Each line (≈ 200–300 bytes) describes one embedding job for one semantic entity.
  - Typical fields:
  ```json
    {
      "entity_id": "reports/q4_2024.pdf",
      "src_sha256": "ab34…cd",          // hash of the *original* file (or page-range, etc.)
      "blob_sha256": "9f12…78",         // hash of the actual vector blob stored under .semantic/index/sha256/...
      "lane_id": "fin_bert_base",
      "embedder_id": "bert-base-finetuned-finance",
      "model_cfg_digest": "sha256:2a9c…01", // lock of model + hyper-params
      "git_commit_sha": "a3f6e2",            // repository commit that produced the file
      "created_at": "2024-10-05T14:23:11Z",
      "tags": ["finance", "en"]
    }
  ```
- How the rebuild works: `semanticctl rebuild --from-repo /path/to/semantic-repo`
  - Reads `.semantic/version` → selects correct parser.
  - Streams `manifest.jsonl` line-by-line; for each line it
    - Looks up the blob under `.semantic/index/sha256/…` by the recorded hash.
    - Loads the vectors into a local vector store (FAISS, Qdrant, etc.).
  - Because the manifest is append-only there is no re-compute, it is purely I/O.
- Will the manifest grow “too large”?
  - **Math check**:
    - 1 million entities → 1 M × 300 B ≈ 300 MB.
    - 100 million entities → 30 GB.
    - Modern SSDs and Git-LFS handle tens of GB comfortably.
  - **Compaction strategy** (optional):
    - Every N days or every M new lines, run `semanticctl gc --manifest`.
    - It rewrites `manifest.jsonl` into a rolling daily file: `manifest.2024-10-31.jsonl`, `manifest.2024-11-01.jsonl`, …
    - Old files can be archived to cheap object storage; rebuild simply concatenates them.
      - Because each line is independent, concatenation is trivial `cat *.jsonl`.
  - **Streaming rebuild**:
    - If we truly hit “hundreds of millions”, the rebuild tool can read the tail (say last 7 days) first, making the system online quickly, then back-fill the rest asynchronously.
- Optional micro-optimisations
  - Compress each manifest file with zstd (`manifest.jsonl.zst`).
  - Use a small SQLite or Parquet file instead of JSONL if you prefer columnar queries.
  - Keep an *index-of-the-index*: a tiny binary file that maps `entity_id` → `byte-offset` inside the manifest so that point lookups are O(1).


The `config.json` structure can be examined from this [sample](./config.json).

Each lane spawns its own `manifest.jsonl` under `.semantic/index/lanes/<lane_id>/manifest.jsonl`. Hence:
- Manifest size remains proportional to one model’s indexing jobs, not the cross product of all models.
- Deleting or deprecating a lane is `rm -rf lane folder`.

**Access control & discovery**
- Global index registry
  - A lightweight SQLite/Parquet file (or small GraphQL endpoint) that lists all lanes: (`lane_id, group_name, model, tags, created_by_team, visibility, last_update`).
- Visibility scopes
  - `internal:<team>`: only that team’s MCP tokens see it.
  - `shared:<list>`: comma-separated set of teams.
  - `public`: appears in org-wide dashboards.
- Query API & MCP
  - `/search?group=finance&lane=fin_bert_base&q=…`
  - `/search?group=finance&lane=*&q=…`: fan-out across lanes.
- MCP server exposes lanes as separate *resources* so CEO’s agent and Auditing tool can pick which embeddings to consume.

**Operational workflow**
- Finance team pushes new `group.yaml` → CI creates new lane or updates spec.
- Scheduler launches N embedding jobs (one per lane).
- Each job appends to its own manifest.jsonl and uploads blobs.
- On source-file change, **only the affected lanes** are re-indexed (delta detection uses `src_sha256`).
- Registry file is updated → real-time GraphQL subscription notifies all dashboards/agents.
  
**Retention & GC**

- Configurable per lane: retention: `"2y"` or `max_versions: 10`.
- GC tool: `semanticctl gc --lane fin_bert_base --older-than 90d`.

**Migration / vendor independence**
- Entire lane folder is portable; move to new object store by `rsync` or `lakectl`.
- Rebuild simply replays the lane’s manifest; no cross-lane dependency.

**Edge cases handled**
- **Same model, different params** → different lane_id (e.g. cv_color_obj_512, cv_color_obj_1024).
- **Multi-modal** → each modality is a lane under the same or different group.
- **Team overlap** → two teams can create groups with identical filters but different lanes; blobs are deduplicated by hash.

**Result**
- Teams keep full autonomy over their groups and lanes.
- All derived knowledge is discoverable via a single, uniform namespace.
- No pathological growth of any single manifest; lanes isolate both data volume and operational lifecycle.

## VersionPolicy vs. retention.policy
`versionPolicy` vs. `retention.policy`

`versionPolicy` chooses which *file* versions enter the group; `retention.policy` chooses how long the *index* versions stick around.

1. versionPolicy  
   • **Applies to the underlying *source file versions*** that are **eligible** to be placed in the semantic group.  
   • Decides **which commit / tag / branch** of the file system is considered when the filter runs.  
   • Has **no influence** on how long the index blobs or embeddings stay around.

   Possible values  
   - `"latest"`: always the newest commit on the default branch.  
   - `"latestOnBranch": "release"`: newest commit on the named branch.  
   - `"tag": "v2.3"`: pin to a single tag.  
   - `"commit": "a4f3c89"`: freeze to an exact commit hash.

   Example use  
   • The Finance team wants *only* files from the audited quarterly release branch → `versionPolicy: { "mode": "latestOnBranch", "branch": "2024-Q4-audit" }`.  
   • The Vision team wants bleeding-edge images → `versionPolicy: { "mode": "latest" }`.

2. retention.policy (inside each **lane**)  
   • **Applies to the *derived knowledge* (vector blobs, metadata, manifests)** that were produced by an indexing run.  
   • Controls **how many historical index snapshots** or **how old** they may become before automatic garbage-collection kicks in.  
   • Has **no influence** on which underlying file versions are indexed.

   Possible values  
   - `{ "policy": "keep_last_n", "n": 3 }`: keep only the 3 newest index snapshots for this lane.  
   - `{ "policy": "expire_after", "maxAge": "P365D" }`: delete any index blob older than 365 days.  
   - `{ "policy": "forever" }`: never delete.

   Example use  
   • A/B testing lane: keep only the last 5 embeddings to save GPU storage → `keep_last_n: 5`.  
   • Compliance lane: keep everything for 7 years → `expire_after: "P2555D"`.  


Nice to have:
- a `dry-run` CLI to preview which files/entities would enter or leave a group before merging a PR.
- conflict resolution UI: A file may match two sibling sub-groups with different indexing settings. Provide a visual diff and policy DSL to resolve.
- GraphQL API to browse the folder-shaped semantic repo (groups, lanes, blobs), stream live mutations (new lane, re-index done, blob GC, etc.) and issue vector / keyword searches across any lane.
