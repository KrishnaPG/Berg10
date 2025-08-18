# Epic List

1.  **Epic 1: Foundation & Core Infrastructure:** Establish the project repository, define core data models for Semantic Groups/Entities, implement basic `semantic-repo` storage layout, and create the foundational `berg10` CLI tool with basic group management (apply, list).
2.  **Epic 2: File System Integration & Entity Mapping:** Develop the read-only connector for a versioned file system (e.g., LakeFS), implement logic to evaluate group filters against the file system, and map source files to Semantic Entities based on basic grouping rules.
3.  **Epic 3: AI Indexing Engine:** Integrate a single, configurable AI model, implement the process for chunking Semantic Entities (if needed), generating embeddings, and storing the immutable vector blobs and metadata (`manifest.jsonl`) in the `semantic-repo`.
4.  **Epic 4: Search & API Access:** Implement the semantic search API endpoint, integrate with the chosen vector database for querying embeddings, and build the basic MCP server endpoint for external agent access.
5.  **Epic 5: Automation & Observability:** Implement mechanisms to detect changes in the underlying file system and trigger re-evaluation/indexing, finalize the append-only audit logging, and ensure core system metrics (index throughput, API latency) are tracked.
