# Core Workflows

*(To be elaborated using sequence diagrams)*

## Workflow 1: Define and Apply a Semantic Group
1. User creates `config.json`.
2. User runs `berg10 group apply config.json`.
3. CLI calls Core Engine's `GroupManager.apply(config)`.
4. `GroupManager` validates the config.
5. `GroupManager` stores the config in `semantic-repo/groups/{name}/config.json`.
6. CLI provides success/failure feedback.

## Workflow 2: Index Semantic Entities for a Group
8.  **Primary Storage (Source of Truth):**
    a. The `SemanticRepoManager` saves the generated embedding as an immutable blob in the `semantic-repo` at `.semantic/index/sha256/<hash>`.
    b. It then appends a record to the group's `manifest.jsonl`, linking the entity, source version, and the embedding blob's hash.
9.  **Vector DB Ingestion (Secondary Index):**
    a. After successfully writing to the `semantic-repo`, the `IndexingOrchestrator` triggers an ingestion process.
    b. This process reads the new manifest entry and upserts the embedding vector and associated metadata into the **Vector DB**. This makes the data available for fast querying.

## Workflow 3: Semantic Search
1.  **Query:** An application or MCP Client or AI Agent sends a query to the **Search API**.
2.  **Embedding:** The API server generates a vector embedding for the incoming query using the **AI Model Service**.
3.  **Fast Lookup:** The server queries the **Vector DB** using the query embedding to get a list of top-K relevant `entity_id`s. The Vector DB acts as a high-performance "hot" index.
4.  **Enrichment (Source of Truth):** The API server (optionally) uses the returned `entity_id`s to look up the full, authoritative metadata from the `semantic-repo`'s `manifest.jsonl` file and fetch the entity details. This ensures the returned data is always consistent with the source of truth.
5.  **Response:** The API server returns the (enriched) results to the client.
