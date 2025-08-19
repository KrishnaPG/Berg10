semantic-repo/
└── .semantic/
    ├── version                     # single-line format marker
    ├── index/
    │   ├── blobs/<sha256>          # immutable blobs (content addressed with sha256)
    │   └── lanes/                  # one sub-folder per lane
    │       ├── <lane_sha256>/
    │       │   └── manifest.jsonl  # append-only, one line per embedding job
    │       ├── <lane_sha256>/
    │       │   └── manifest.jsonl
    │       └── <lane_sha256>/      # sha256 of a lane from the group's config.json
    │           └── manifest.jsonl
    ├── groups/
    │   ├── finance/
    │   │   ├── config.json          # declarative definition (source of truth)
    │   │   └── lock.toml           # optional, pins model digests
    │   └── <group_name>/
    │       ├── config.json
    │       └── lock.toml
    └── cache/                      # entities pre-computed and cached for quick access
        └── <group_sha256>/         # sha256 of a group from group's config.json
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

A semantic group is identified by its SHA256 internally, and by its `name` visibly. In a `semantic-repo`, when a semantic group is created, a folder with its `name` as pathname is created under the `.semantic/groups/` path ,under which its definition file (config.json) is placed. 

The `lanes`  in the `config.json` define set of AI indexer/embedder/chunkers that need to be run on top of the content that is mapped (from LakeFS, based on the `filter` and `grouping`). Each embedder generates vector blobs which are stored under the `.semantic/index/blobs/` path by their sha256, and a `manifest.jsonl` line is appended to the `.semantic/index/lanes/<lane_sha256>/manifest.jsonl` file to keep track of the location of blobs.

Since the `filter` and `grouping` are costly to run, we cache the LakeFS -> semantic-entity mappings under the path `.sematic/cache/<group_sha256>/<commit_sha>.entities.jsonl` where the `commit_sha` is the commit of LakeFS that triggered this indexing operation.

The `semantic-repo` itself is under a (separate) version control (git), which keeps track of any modifications to the `config.json` files, and also acts as backup mechanism for the `manifest.jsonl` files. The `.semantic/index/blobs/` may be part of the git (in which case the GIT LFS has to be enabled), or could be an S3 or similar object storage mount point. The `.semantic/cache` may be made part of the git or ignored (since it can be recalculated on demand, though not efficient).