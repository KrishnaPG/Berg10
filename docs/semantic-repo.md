semantic-repo/
└── .semantic/
    ├── version                     # single-line format marker
    ├── index/
    │   ├── blobs/<sha256>          # immutable blobs (content addressed with sha256)
    │   └── lanes/                  # one sub-folder per lane
    │       ├── finance_v1/
    │       │   └── manifest.jsonl
    │       ├── cv_bw_edges/
    │       │   └── manifest.jsonl
    │       └── <group_sha256>/     # lane_id == group_sha256
    │           └── manifest.jsonl
    ├── groups/
    │   ├── finance/
    │   │   ├── group.yaml          # multi-lane spec -> group_sha256
    │   │   └── lock.toml           # optional, pins model digests
    │   └── cv/
    │       ├── group.yaml
    │       └── lock.toml
    └── cache/                      # entities pre-computed and cached for quick access
        └── <group_sha256>/         # for each unique group id (across diff versions)
            └── <commit_sha>.entities.jsonl # append-only, one line per semantic entity


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
- Generated once whenever the underlying commit changes or the filter/grouping definition is updated.
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
  "lane_id": "fin_bert_base",
  "embedder": "bert-base-finetuned-finance",
  "model_cfg_digest": "sha256:2a9c…01",
  "git_commit": "a3f6e2",
  "created_at": "2024-10-05T14:23:11Z",
  "tags": ["finance", "en"]
}
```