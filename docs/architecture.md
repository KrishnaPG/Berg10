# Berg10 Fullstack Architecture Document ( aligned with PRD )

## Introduction

This document details the architecture for the Berg10 Semantic Content Management System, as defined by the Product Requirements Document (PRD). It outlines the system's structure, components, data flow, and technology choices to guide development. The architecture is based on a modular monolith for the core engine, with distinct modules for connectors, indexing, storage, and API layers, designed for future scalability towards microservices.

This architecture serves as the single source of truth for AI-driven development of Berg10, ensuring consistency and alignment with the project's goals of enabling semantic content organization, AI-driven indexing, and flexible API access.

### Starter Template or Existing Project

N/A - Greenfield project, built from scratch based on PRD requirements.

### Change Log

| Date       | Version | Description           | Author             |
|------------|---------|-----------------------|--------------------|
| 2025-08-17 | 1.0.0   | Initial draft         | Winston (Architect) |
| 2025-08-17 | 1.1.0   | Revised based on PRD  | Winston (Architect) |

## High Level Architecture

### Technical Summary

Berg10 adopts a modular monolith architecture to balance initial development simplicity with a clear path for future scaling. The core engine, written in TypeScript (Elysia/Bun) for performance, encapsulates the main logic for group management, entity mapping, indexing orchestration, and `semantic-repo` interaction. Key external integrations include LakeFS/Git connectors for source data, proven AI/ML models for embedding generation, and a vector database (e.g., Qdrant) for search. The system exposes functionality via a REST/gRPC API and a basic MCP server endpoint. The `semantic-repo` acts as the structured storage layer for configurations, immutable index blobs, and metadata, managed via Git for versioning. A `berg10` CLI tool provides command-line management. This design aims for scalability, maintainability, and responsiveness to source changes.

### Platform and Infrastructure Choice

Given the requirements for cross-platform compatibility, containerization (Docker), and potential Kubernetes orchestration (NFR12), a cloud-agnostic or self-hosted approach is suitable. The backend will run on Linux containers, deployable to any cloud provider (AWS, GCP, Azure) or on-premises Kubernetes cluster. The choice of Bun/Elysia favors performance and efficient resource usage. For initial deployment and development, a simple Docker setup or a managed Kubernetes service aligns well.

**Platform:** Cross-platform (Linux containers) / Cloud-agnostic / Self-hosted Kubernetes
**Key Services:** Docker, Kubernetes (Orchestrator), Git (for `semantic-repo` versioning), LakeFS/Git (Source Repos), Vector DB (Milvus/Quadrant), AI Model Service (Hugging Face/Cloud AI)
**Deployment Host and Regions:** Docker containers/Kubernetes pods; region deployment will depend on user base and source data location.

### Repository Structure

Following the PRD's "Monolithic" repository structure guidance, the project will be a single repository with clear functional separation. NPM workspaces or a similar monorepo tool will manage internal modularity.

**Structure:** Monolith (Single Repository)
**Package Organization:**
*   `/packages/core`: Core logic (group parsing, entity mapping, indexing orchestration, `semantic-repo` interaction).
*   `/packages/connectors`: Filesystem connector modules (LakeFS, Git).
*   `/packages/api`: REST/gRPC API endpoints and server logic.
*   `/packages/mcp`: Basic MCP server endpoint implementation.
*   `/packages/cli`: `berg10` command-line interface tool.
*   `/packages/shared`: Shared types, interfaces, and utilities used across packages.
*   `/packages/config`: Configuration management (loading, validation).

### High Level Architecture Diagram

```mermaid
graph TD
    subgraph "External Systems"
        A[LakeFS/Git Repository] -->|Read| B[Connectors (LakeFS/Git)]
        C[AI/ML Model Service] -->|Embeddings| D[Indexing Engine]
        E[Vector DB (Qdrant/Milvus)] -->|Search Results| F[API/MCP Server]
    end

    subgraph "Berg10 System (Modular Monolith)"
        B --> G[Core Engine]
        G --> H[(semantic-repo - Git)]
        H --> G
        G --> D[Indexing Engine]
        D --> H
        G --> I[CLI (berg10)]
        G --> J[API/MCP Server]
        J --> D
        J --> H
    end

    subgraph "Users/Applications"
        K[User (CLI)] --> I
        L[Application/MCP Client] --> J
    end
```

### Architectural Patterns

- **Modular Monolith:** Core system as a single deployable unit with clear internal modules (`core`, `connectors`, `api`, `cli`) - _Rationale:_ Aligns with PRD's service architecture recommendation, simplifies initial development and deployment while maintaining modularity for future scaling (microservices).
- **Repository Pattern (Internal):** Abstract data access logic within modules (e.g., `semantic-repo` access in `core`) - _Rationale:_ Enables testing, maintainability, and potential future database/storage migration flexibility.
- **Connector Pattern:** Standardized interfaces for interacting with different versioned file systems (LakeFS, Git) - _Rationale:_ Allows easy addition of new source connectors without impacting core logic.
- **Event-Driven (Future/Polling):** Mechanism to detect changes in source repositories and trigger re-evaluation/indexing - _Rationale:_ Keeps semantic views and indices up-to-date automatically (FR7).
- **Immutable Storage (`semantic-repo`):** Storing index blobs and metadata immutably using content-addressed storage (SHA256) - _Rationale:_ Ensures data integrity, prevents corruption, and enables deduplication (NFR6, NFR11).
- **API Gateway Pattern (Implicit):** Centralized API entry point for REST/gRPC access - _Rationale:_ Simplifies client interaction and allows for centralized auth/metrics (aligned with exposing APIs).

## Tech Stack

### Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Core Language** | TypeScript | ^5.0 | Primary language for core logic, API, CLI | Type safety, code maintainability, aligns with PRD tech request |
| **Core Framework** | Elysia | ^1.0 | Building the core engine, API, and CLI logic | High performance with Bun, optimized for TypeScript, supports REST/gRPC |
| **Runtime** | Bun | ^1.0 | Runtime for Elysia applications | Fast startup, high performance, native to Elysia |
| **API Style** | GraphQL + REST + gRPC | N/A | API communication styles | REST for standard requests, gRPC for high-performance internal/external service calls |
| **CLI Tool** | Elysia CLI or Standard TS | ^1.0 | Building the `berg10` CLI | Consistency with core tech or standard tooling |
| **Filesystem Connectors** | Custom Connectors (TS) | N/A | Interfacing with LakeFS, Git | Aligns with modular design, allows for specific logic per system |
| **AI/ML Integration** | Hugging Face Transformers or Cloud AI APIs | Latest Stable | Generating embeddings for content | Leverages proven models, avoids reinventing (NFR9) |
| **Vector Database** | Milvus | Latest Stable | Storing and querying vector embeddings | Proven, scalable vector search (NFR8) |
| **`semantic-repo` Storage** | Git Filesystem | Standard Git | Storing group configs, index blobs, metadata | Native versioning, structured layout (`.semantic/`), aligns with NFR12 |
| **`semantic-repo` Blob Storage** | Filesystem (SHA256 paths) | N/A | Immutable storage of index blobs | Content-addressed, simple, meets NFR11 |
| **`semantic-repo` Metadata** | JSONL (`manifest.jsonl`) | N/A | Append-only log of index metadata | Efficient, scalable for large manifests (NFR3) |
| **Authentication** | JWT/API Keys (if needed) | N/A | Securing API/MCP endpoints | Standard, secure (placeholder, detail in Security section) |
| **Unit/Integration Testing** | Buntest | ^29.0/^1.0 | Testing core logic and module integrations | Comprehensive testing frameworks |
| **E2E Testing** | Playwright or Similar | ^1.0 | Testing full workflows (apply -> index -> search) | Validates end-to-end functionality |
| **Build Tool** | Bun | ^1.0 | Building and bundling modules | Native to the chosen runtime/framework |
| **IaC Tool** | Docker/Docker Compose | Latest | Containerization and local deployment | Aligns with NFR12, simple for development |
| **CI/CD** | GitHub Actions | N/A | Continuous Integration and Deployment | Integrated with GitHub, free for public repos |
| **Monitoring & Logging** | Standard Logging (Pino) + OTLP/Prometheus (Future) | Latest | Logging and metrics | Structured logging (NFR10), extensible for metrics (NFR14) |
| **Configuration** | JSON | Standard | Defining Semantic Groups | Aligns with CLI/API expectations |

## Data Models

*(To be elaborated in detail based on `config.json` structure and `SemanticEntity` definition)*

### SemanticGroup
**Purpose:** Represents a user-defined semantic grouping of content.

**Key Attributes:**
- `name`: `string` - Unique identifier for the group.
- `filter`: `object` - Defines criteria for selecting source files (e.g., `{ type: "regex", pattern: ".*\\.md$" }`).
- `versionPolicy`: `object` - Specifies which version(s) of source data to consider (e.g., `{ type: "latest" }`, `{ type: "tag", value: "v1.0" }`).
- `groupingRule`: `object` - Defines how source files map to Semantic Entities (e.g., `{ type: "file" }`, `{ type: "folder", key: "name" }`).
- `indexing`: `object` - Configuration for AI indexing (e.g., `{ model: "sentence-transformers/all-MiniLM-L6-v2", chunk: {...} }`).
- `retentionPolicy`: `object` - Rules for retaining index versions (e.g., `{ type: "keepLast", count: 5 }`).

#### TypeScript Interface
```typescript
interface SemanticGroup {
  name: string;
  filter: {
    type: string; // e.g., "regex"
    [key: string]: any; // pattern, etc.
  };
  versionPolicy: {
    type: string; // e.g., "latest", "tag"
    [key: string]: any; // value, etc.
  };
  groupingRule: {
    type: string; // e.g., "file", "folder"
    [key: string]: any; // key, etc.
  };
  indexing: {
    model: string;
    [key: string]: any; // model-specific config
  };
  retentionPolicy?: {
    type: string; // e.g., "keepLast", "expireAfter"
    [key: string]: any; // count, duration, etc.
  };
}
```

### SemanticEntity
**Purpose:** Represents a logical unit of content derived from source files based on grouping rules.

**Key Attributes:**
- `id`: `string` - Unique identifier for the entity (e.g., hash of source path + version).
- `sourceRefs`: `array` - References to one or more source files/objects that constitute this entity.
- `metadata`: `object` - Extracted metadata from the source (filename, size, timestamps).

#### Relationships
- Belongs to one `SemanticGroup`.
- Can have multiple associated index records in `manifest.jsonl`.

#### TypeScript Interface
```typescript
interface SemanticEntity {
  id: string;
  sourceRefs: Array<{
    connectorType: string; // "lakefs", "git"
    repository: string;
    ref: string; // commit/tag/branch
    path: string;
    // Potentially size, lastModified etc.
  }>;
  metadata: {
    [key: string]: any; // filename, extracted headers, etc.
  };
}
```

## API Specification

*(To be defined based on data models and user stories)*

## Components

### Core Engine (`/packages/core`)
**Responsibility:** Central orchestrator for group management, entity mapping, indexing workflow, and `semantic-repo` interaction.

**Key Interfaces:**
- `GroupManager`: Manage SemanticGroup lifecycle (CRUD, validation).
- `EntityManager`: Map source files to SemanticEntities based on group rules.
- `IndexingOrchestrator`: Trigger and manage the AI indexing process for entities.
- `SemanticRepoManager`: Handle reading/writing configurations, index blobs, and manifests in the `semantic-repo`.

**Dependencies:** Connectors, AI Model Service Client, Vector DB Client, Shared Types.

**Technology Stack:** TypeScript, Elysia (core logic), Bun.

### Connectors (`/packages/connectors`)
**Responsibility:** Provide standardized access to versioned file systems (LakeFS, Git).

**Key Interfaces:**
- `FileSystemConnector`: Interface for listing files, retrieving content/metadata based on ref (commit/tag/branch).

**Dependencies:** External SDKs (LakeFS Go/Python client, NodeGit, Isomorphic Git), Shared Types.

**Technology Stack:** TypeScript, potentially some performance-critical parts in Rust/WASM.

### API Server (`/packages/api`)
**Responsibility:** Expose REST/gRPC endpoints for Search API and potentially group management.

**Key Interfaces:**
- `SearchAPI`: Endpoint for semantic search queries (accept query, return entities).
- `ManagementAPI` (Optional/Future): Endpoints for managing groups via API.

**Dependencies:** Core Engine, Vector DB Client, Shared Types.

**Technology Stack:** TypeScript, Elysia (for REST/gRPC), Bun.

### MCP Server (`/packages/mcp`)
**Responsibility:** Implement the basic MCP server endpoint for external agent access.

**Key Interfaces:**
- `MCPResourceProvider`: Expose semantic groups/entities and search capabilities via MCP.

**Dependencies:** Core Engine, Shared Types.

**Technology Stack:** TypeScript, Elysia (MCP library or custom implementation), Bun.

### CLI (`/packages/cli`)
**Responsibility:** Provide the `berg10` command-line tool for user interaction.

**Key Interfaces:**
- `CLI Commands`: Implement `apply`, `list`, `delete` commands for Semantic Groups.

**Dependencies:** Core Engine, Shared Types.

**Technology Stack:** TypeScript, Elysia CLI or standard Node.js CLI library, Bun.

### Shared (`/packages/shared`)
**Responsibility:** Centralize common types, interfaces, and utilities.

**Key Interfaces:**
- Shared TypeScript interfaces (SemanticGroup, SemanticEntity).
- Utility functions for hashing, validation, logging.

**Dependencies:** None (or minimal, foundational libs).

**Technology Stack:** TypeScript.

## External APIs

### AI/ML Model Service
- **Purpose:** Generate vector embeddings for Semantic Entity content.
- **Documentation:** Hugging Face Inference API docs, Cloud AI Platform docs.
- **Base URL(s):** `https://api-inference.huggingface.co/`, `https://[region]-aiplatform.googleapis.com/`
- **Authentication:** API Key (Hugging Face), OAuth2 (Cloud)
- **Rate Limits:** Provider-specific.

**Key Endpoints Used:**
- `POST /models/{model_id}` - Generate embeddings for text input.

**Integration Notes:** Use standard client libraries. Handle retries and rate limiting.

### Vector Database (Qdrant/Milvus)
- **Purpose:** Store and query vector embeddings for semantic search.
- **Documentation:** Qdrant API docs, Milvus API docs.
- **Base URL(s):** `http://qdrant:6333`, `http://milvus:19530` (internal service addresses)
- **Authentication:** API Key (if configured)
- **Rate Limits:** Generally high, depends on deployment.

**Key Endpoints Used:**
- `POST /collections/{collection_name}/points` - Upsert vectors and metadata.
- `POST /collections/{collection_name}/points/search` - Perform vector search.

**Integration Notes:** Initialize collections based on `SemanticGroup`. Synchronize index data from `semantic-repo` manifests.

## Core Workflows

*(To be elaborated using sequence diagrams)*

### Workflow 1: Define and Apply a Semantic Group
1. User creates `config.json`.
2. User runs `berg10 group apply config.json`.
3. CLI calls Core Engine's `GroupManager.apply(config)`.
4. `GroupManager` validates the config.
5. `GroupManager` stores the config in `semantic-repo/groups/{name}/config.json`.
6. CLI provides success/failure feedback.

### Workflow 2: Index Semantic Entities for a Group
1. Triggered by `berg10 apply` completion or file system change detection.
2. Core Engine's `IndexingOrchestrator` loads the group config.
3. `IndexingOrchestrator` calls `EntityManager.mapEntities(group)`.
4. `EntityManager` uses the appropriate `FileSystemConnector` to list files based on `versionPolicy`.
5. `EntityManager` applies the `filter` to get matching files.
6. `EntityManager` applies the `groupingRule` to create `SemanticEntity` objects.
7. For each new/updated `SemanticEntity`:
    a. `IndexingOrchestrator` retrieves entity content.
    b. `IndexingOrchestrator` calls AI Model Service to generate embedding.
    c. `IndexingOrchestrator` calls `SemanticRepoManager.storeIndex(entity, embedding, metadata)`.
    d. `SemanticRepoManager` stores blob, updates `manifest.jsonl`.
    e. `IndexingOrchestrator` calls Vector DB Client to upsert embedding/metadata.

### Workflow 3: Semantic Search
1. Application/MCP Client sends query to Search API endpoint.
2. API Server receives request, parses query.
3. API Server calls AI Model Service to generate query embedding.
4. API Server calls Vector DB Client to search with query embedding.
5. Vector DB returns list of relevant `entity_id`s.
6. API Server (optionally) fetches entity details from `semantic-repo`.
7. API Server returns results to client.

## Database Schema

*(Conceptual, as the primary "database" is the `semantic-repo` filesystem structure)*

1.  **`semantic-repo` Structure:**
    *   `.semantic/`
        *   `version`: File containing the semantic-repo schema version.
        *   `index/`
            *   `sha256/`: Directory for immutable index blobs, named by their SHA256 hash (e.g., `a1b2c3d4...embed`).
        *   `groups/`
            *   `<group_name>/`
                *   `config.json`: The `SemanticGroup` configuration.
                *   `manifest.jsonl`: Append-only log of index records for this group's entities.
    *   `.git/`: Standard Git metadata for versioning the `semantic-repo`.

*(Actual vector database schema for Qdrant/Milvus to be defined based on chosen DB and search requirements)*

## Frontend Architecture

*(Currently, the primary interface is the CLI and APIs. A future Admin UI is envisioned. This section will be expanded when UI development begins.)*

## Backend Architecture

### Service Architecture
Based on the modular monolith approach defined in the PRD and elaborated above.

### Database Architecture
The primary persistent storage is the `semantic-repo`, managed as a structured directory layout on a filesystem, versioned with Git. Index blobs are stored immutably by content hash.

For the Vector Database (Qdrant/Milvus):
*   **Schema Design:** Collections could be created per `SemanticGroup` or use a shared schema with a `group_name` field for filtering.
*   **Data Access Layer:** Managed through the Vector DB client library integrated into the Core Engine's Indexing and Search modules.

### Authentication and Authorization
*(To be detailed, considering API/MCP security requirements)*
- API/MCP endpoints will likely require authentication (API Key/JWT).
- Authorization rules for accessing specific groups/entities will need definition.
- Integration with identity providers or simple key management within the system.

## Unified Project Structure

```
berg10/
├── .github/                    
│   └── workflows/             # CI/CD (GitHub Actions)
│       ├── ci.yaml
│       └── deploy.yaml
├── packages/                   # Monolith
│   ├── core/                  # Core engine logic
│   │   ├── src/
│   │   │   ├── group/         # Group management logic
│   │   │   ├── entity/        # Entity mapping logic
│   │   │   ├── index/         # Indexing orchestration
│   │   │   ├── repo/          # semantic-repo interaction
│   │   │   ├── types/         # Core shared types
│   │   │   └── utils/         # Core utilities
│   │   └── tests/
│   ├── connectors/            # Filesystem connectors
│   │   ├── src/
│   │   │   ├── lakefs/        # LakeFS connector
│   │   │   ├── git/           # Git connector
│   │   │   └── types/         # Connector shared types/interfaces
│   │   └── tests/
│   ├── api/                   # REST/gRPC API server
│   │   ├── src/
│   │   │   ├── routes/        # API route handlers
│   │   │   ├── middleware/    # Auth, logging middleware
│   │   │   └── server.ts      # API server entry point
│   │   └── tests/
│   ├── mcp/                   # MCP server
│   │   ├── src/
│   │   │   └── server.ts      # MCP server entry point
│   │   └── tests/
│   ├── cli/                   # berg10 CLI tool
│   │   ├── src/
│   │   │   └── cli.ts         # CLI entry point and commands
│   │   └── tests/
│   ├── shared/                # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/         # Shared TypeScript interfaces
│   │   │   └── utils/         # Shared utility functions
│   │   └── tests/
│   └── config/                # Configuration management
│       └── src/
├── infrastructure/            # IaC definitions (Dockerfile, docker-compose.yaml)
│   ├── Dockerfile
│   └── docker-compose.yaml
├── scripts/                   # Build/deploy scripts
├── docs/                      # Documentation
│   ├── prd/
│   ├── stories/
│   └── architecture.md        # This document
├── .env.example               # Environment template
├── package.json               # Root package.json (defines workspaces)
├── tsconfig.json              # Root TypeScript configuration
└── README.md
```

## Development Workflow

*(To be defined in detail)*

## Deployment Architecture

*(To be defined in detail, based on containerization and orchestration choices)*

## Security and Performance

*(To be defined in detail, addressing NFRs like auth, latency, throughput)*

## Testing Strategy

*(To be defined in detail, leveraging unit, integration, and e2e tests as per PRD/testing assumptions)*

## Coding Standards

*(To be defined, focusing on TypeScript/Elysia best practices and project-specific rules)*

## Error Handling Strategy

*(To be defined, ensuring robust error handling across modules and APIs)*

## Monitoring and Observability

*(To be defined, implementing logging and metrics as per NFRs)*

## Checklist Results Report

*To be populated after review.*