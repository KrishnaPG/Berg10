# GraphQL 

Design goal: Give the UI a single endpoint that lets it:

1. browse the folder-shaped semantic repo (groups, lanes, blobs)  
2. stream live mutations (new lane, re-index done, blob GC, etc.)  
3. issue vector / keyword searches across any lane

All without leaking the internal file-system layout.

--------------------------------------------------
1. Schema (SDL)

```graphql
scalar SHA256      # hex string
scalar DateTime    # ISO-8601
scalar JSON        # arbitrary metadata key/value

type SemanticRepo {
  version: String!
  groups: [Group!]!
  group(name: String!): Group
  search(q: SearchInput!): SearchResult!
}

type Group {
  name: String!
  path: String!           # /groups/finance
  filter: JSON
  grouping: JSON
  lanes: [Lane!]!
  lane(id: ID!): Lane
  entities: [Entity!]!    # all entities in this group
}

type Lane {
  id: ID!                 # finance_bert_base
  displayName: String!
  embedder: Embedder!
  tags: [String!]!
  manifestEntries(after: SHA256, first: Int = 100): ManifestConnection!
  entities: [Entity!]!
}

type Embedder {
  model: String!
  configDigest: SHA256!
  parameters: JSON
}

type Entity {
  id: ID!                 # entity_id in manifest
  srcSha256: SHA256!
  lanes: [LaneEntry!]!
  fileMetadata: JSON
}

type LaneEntry {
  lane: Lane!
  blobSha256: SHA256!
  createdAt: DateTime!
}

type ManifestConnection {
  edges: [ManifestEdge!]!
  pageInfo: PageInfo!
}
type ManifestEdge {
  node: ManifestLine!
  cursor: SHA256!
}
type ManifestLine {
  entity: Entity!
  blobSha256: SHA256!
  createdAt: DateTime!
  tags: [String!]
}

input SearchInput {
  text: String!
  group: String               # restrict to one group
  lanes: [ID!]                # restrict to these lanes
  limit: Int = 20
  threshold: Float
}

type SearchResult {
  hits: [Hit!]!
}
type Hit {
  entity: Entity!
  lane: Lane!
  score: Float!
  snippet: String             # optional highlight
}

type Subscription {
  repoEvent: RepoEvent!
}
type RepoEvent {
  ts: DateTime!
  type: EventType!            # GROUP_CREATED, LANE_ADDED, INDEX_COMPLETED, BLOB_GC, …
  payload: JSON
}
```

--------------------------------------------------
2. Resolver strategy

• **Static parts** (`version`, `groups/*/group.yaml`, `lanes/*/manifest.jsonl`)  
  – Resolvers are thin wrappers over:  
    - `fs` / `lakectl` read for YAML  
    - streaming line reader for `manifest.jsonl` (cursor = SHA256 of the line)  

• **Dynamic parts** (vector search)  
  – Behind the scenes: FAISS / Qdrant / Weaviate.  
  – GraphQL resolver translates `SearchInput` → native SDK call → returns `Hit[]`.

• **Real-time updates**  
  – Server keeps an in-memory broker (Redis Streams / NATS) fed by:  
    - File watchers on the semantic-repo  
    - Embedding-job completion hooks  
  – GraphQL subscription simply fans these out as `RepoEvent`.

--------------------------------------------------
3. Pagination & performance

• Manifest lines: cursor-based pagination (`after: last_seen_sha256`) – cheap because file is append-only.  
• Vector search: use the underlying engine’s native pagination token, relayed as opaque GraphQL `cursor`.  
• Blobs themselves are **not** returned; only SHA-256 links. UI fetches blobs via HTTP range requests from the object store.

--------------------------------------------------
4. Security

• GraphQL gateway enforces ABAC scopes:  
  ```
  directive @scope(team: String!, lanes: [ID!]) on FIELD_DEFINITION
  ```
• Example:
  ```
  type Query {
    group(name: String!): Group @scope(team: "$caller_team")
  }
  ```

--------------------------------------------------
5. Example queries for the UI

```graphql
# 1. Browse repo
query RepoView {
  semanticRepo {
    version
    groups { name lanes { id displayName } }
  }
}

# 2. Paginate a lane’s manifest
query LaneManifest($laneId: ID!, $cursor: SHA256) {
  lane(id: $laneId) {
    manifestEntries(after: $cursor, first: 100) {
      edges { node { entity { id } createdAt } cursor }
    }
  }
}

# 3. Cross-lane search
query Search($text: String!) {
  search(q: {text: $text, lanes: ["fin_bert_base", "cv_color_obj"]}) {
    hits { entity { id } lane { id } score }
  }
}

# 4. Real-time feed
subscription {
  repoEvent {
    type payload
  }
}
```

--------------------------------------------------
6. Tech stack choices

• **Apollo Server** (Node) or **gqlgen** (Go) – both support schema-first SDL and subscriptions.  
• **DataLoader** pattern to batch repeated manifest line lookups.  
• **WebSocket** (`graphql-ws`) or **SSE** for the `subscription`.  
• Optional **Apollo Federation** if different teams want to expose additional lanes from microservices.

--------------------------------------------------
7. Migration path

   1. Stand up GraphQL server that only exposes read-only queries over existing YAML + manifest.  
   2. Add vector-search resolver pointing to existing FAISS/Qdrant.  
   3. Add subscriptions once event bus is wired.  
   4. No change needed in the semantic-repo layout; the schema is **derived** from the files, not stored in a DB.

The UI now has a clean, version-stable GraphQL surface while the semantic-repo itself remains the single source of truth.