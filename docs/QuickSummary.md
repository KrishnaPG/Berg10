# 🏗️ Semantic Content Management System – Quick Architectural Digest

| Component | Purpose | Where it lives |
|-----------|---------|----------------|
| **Semantic Group** | A **declarative rule-set** that turns raw files into **meaningful, searchable entities**. | `.semantic/groups/<group_name>/config.json` |
| **Filter** | Picks *which* files to consider (name, size, mime, date, branch). | `config.json → filter` |
| **Grouping Rule** | Slices the chosen files into **semantic entities** (whole file, per-page, per-X-second clip, etc.). | `config.json → grouping` |
| **Lane** | One **AI pipeline** = model + parameters + chunking strategy + retention policy. | `config.json → lanes[]` |
| **Index** | Immutable vector blobs (SHA256 keyed) + manifests that map them back to entities. | `.semantic/index/blobs/<sha256>`  <br> `.semantic/index/lanes/<lane_sha256>/manifest.jsonl` |
| **Cache** | Pre-computed LakeFS-commit → entity list so the UI doesn’t re-filter every time. | `.semantic/cache/<group_sha256>/<commit_sha>.entities.jsonl` |
| **Version Marker** | Single-line file that pins the *schema* version of the semantic-repo itself. | `.semantic/version` |

---

### 🔄 End-to-End Flow (Happy Path)

1. Alice adds `reports/2024/Q4/report.pdf` to the `release` branch of LakeFS.
2. Background worker wakes up because the branch is watched.
3. Worker loads every `config.json`, finds the *Finance Reports* group.
4. Filter says: “PDF, ≥10 KB, not in `/personal/`, created in 2024” ✔️
5. Grouping rule says: “Explode PDF into pages, name them `report-page-7` etc.”
6. For each lane (e.g., *Finance BERT*, *YOLO charts*):
   - Run model → produce vector blob → store blob SHA256.  
   - Append a line to the lane’s `manifest.jsonl`.
7. Emit GraphQL event `CACHE_REFRESHED` so dashboards update instantly.

---

### 🔐 Access & Security Highlights

- **Visibility scopes**: `public`, `shared`, `internal`, plus team allow-lists.  
- **Retention**: per-lane TTL or “keep last N”.  
- **Audit**: every blob & manifest line is immutable (old ones GC’d only by policy).  
- **Local vs Cloud**: same folder layout works on laptop (Git+LFS) or S3-backed mount.

---

### 🧩 Example Mental Model

Imagine a file tree that’s **invisible** to users.  
Instead they see:

```
semantic://
├── 📊 Finance Reports (group)
│   ├── Q4 2024 Report / Page 7  (entity)
│   └── Q4 2024 Report / Page 8
├── 🖼️ Marketing Assets (group)
│   ├── 2023 Conference Logo
│   └── 2023 Conference Banner
└── 🎥 Conference Videos (group)
    ├── Keynote Day 1 (00:00-30:00)
    ├── Keynote Day 1 (30:00-60:00)
```

Each “leaf” is **not** a file path; it’s a rule-generated, AI-enriched semantic entity that can be queried, shared, or composed into higher-level knowledge.

---