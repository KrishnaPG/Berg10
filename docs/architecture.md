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
    subgraph "Users & Admin Tools"
        User_CLI[User via CLI] --> CLI
        Admin_UI[Admin UI] --> Mgmt_API
        App_Client[Application / AI Agent] --> Search_API
    end

    subgraph "Berg10 System (Modular Monolith)"
        Connectors["Connectors (LakeFS/Git)"] --> Core_Engine
        Core_Engine --> Indexing_Engine
        Core_Engine --> Mgmt_API[Management API (GraphQL)]
        Core_Engine --> CLI{berg10 CLI}

        Indexing_Engine --> Semantic_Repo
        Indexing_Engine --> AI_Service[AI/ML Model Service]

        Semantic_Repo["semantic-repo (Source of Truth)"] -->|Ingest| Vector_DB
        Semantic_Repo --> Core_Engine
        Semantic_Repo --> Search_API

        Vector_DB["Vector DB (Hot Index)"] --> Search_API

        Search_API["Search API (gRPC/REST/MCP)"] --> AI_Service
    end

    subgraph "External Systems"
        Source_Repo[LakeFS/Git Repository] -->|Read| Connectors
        AI_Service
    end

    style Semantic_Repo fill:#f9f,stroke:#333,stroke-width:2px
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

The Berg10 system exposes two distinct APIs, each tailored for a specific purpose and audience, and protected by a different security policy.

### 1. Management API (GraphQL)

This API is for managing the `semantic-repo`, including the lifecycle of Semantic Groups and their configurations. It is the primary interface for administrative tools like the CLI and a future Admin UI.

-   **Protocol:** GraphQL. This is to support modern frontend frameworks like Refine.js that can consume GraphQL endpoints as a data provider.
-   **Audience:** Administrators, CLI tool, future Admin UI.
-   **Security:** Access is protected by the **Configuration Access Policy** ABAC (as defined in the Authentication and Authorization section).

#### Sample GraphQL Schema

```graphql
type Query {
  semanticGroup(name: String!): SemanticGroup
  semanticGroups: [SemanticGroup!]!
}

type Mutation {
  applySemanticGroup(config: SemanticGroupInput!): SemanticGroup
  deleteSemanticGroup(name: String!): Boolean
}

type SemanticGroup {
  name: String!
  filter: JSONObject!
  versionPolicy: JSONObject!
  groupingRule: JSONObject!
  indexing: JSONObject!
  retentionPolicy: JSONObject
}

input SemanticGroupInput {
  name: String!
  filter: JSONObject!
  versionPolicy: JSONObject!
  groupingRule: JSONObject!
  indexing: JSONObject!
  retentionPolicy: JSONObject
}

scalar JSONObject
```

### 2. Search API (gRPC / REST / MCP)

This API is for querying the AI-indexed knowledge derived from the semantic groups. It is optimized for performance and consumption by AI agents and applications.

-   **Protocols:** gRPC (for high-performance internal or trusted communication), REST (for standard web compatibility), and a native MCP Server endpoint.
-   **Audience:** AI Agents, Applications, End-user services.
-   **Security:** Access is protected by the **Knowledge Access Policy** ABAC.

#### REST Endpoint (Example)

The REST endpoint remains as previously defined, providing a simple, accessible interface for semantic queries.

```yaml
openapi: 3.0.1
info:
  title: Berg10 Search API
  version: v1
paths:
  /search:
    post:
      # ... (specification remains the same)
```

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
8.  **Primary Storage (Source of Truth):**
    a. The `SemanticRepoManager` saves the generated embedding as an immutable blob in the `semantic-repo` at `.semantic/index/sha256/<hash>`.
    b. It then appends a record to the group's `manifest.jsonl`, linking the entity, source version, and the embedding blob's hash.
9.  **Vector DB Ingestion (Secondary Index):**
    a. After successfully writing to the `semantic-repo`, the `IndexingOrchestrator` triggers an ingestion process.
    b. This process reads the new manifest entry and upserts the embedding vector and associated metadata into the **Vector DB**. This makes the data available for fast querying.

### Workflow 3: Semantic Search
1.  **Query:** An application or MCP Client or AI Agent sends a query to the **Search API**.
2.  **Embedding:** The API server generates a vector embedding for the incoming query using the **AI Model Service**.
3.  **Fast Lookup:** The server queries the **Vector DB** using the query embedding to get a list of top-K relevant `entity_id`s. The Vector DB acts as a high-performance "hot" index.
4.  **Enrichment (Source of Truth):** The API server (optionally) uses the returned `entity_id`s to look up the full, authoritative metadata from the `semantic-repo`'s `manifest.jsonl` file and fetch the entity details. This ensures the returned data is always consistent with the source of truth.
5.  **Response:** The API server returns the (enriched) results to the client.

## Database Schema

*(Conceptual, as the primary "database" is the `semantic-repo` filesystem structure)*

1.  **`semantic-repo` Structure (Single Source of Truth):**
    *   `.semantic/`
        *   `version`: File containing the semantic-repo schema version.
        *   `index/`
            *   `sha256/`: Directory for immutable index blobs, named by their SHA256 hash (e.g., `a1b2c3d4...embed`). **This directory can be a standard folder or a mount point for external object storage like S3 or a LakeFS data lake.**
            *   `lanes/`
                *   `<lane_id>/`: one sub-folder per lane (each unique model config) from all `<group_name>/config.json` files
                    *   `manifest.jsonl`: The authoritative, append-only log of index records generated by this model configuration.
        *   `groups/`
            *   `<group_name>/`
                *   `config.json`: The `SemanticGroup` configuration.
    *   `.git/`: Standard Git metadata for versioning the `semantic-repo` configurations and manifests. The `index/` folder that contains the blobs may be ignored from git when it is an S3 or LakeFS mount-point. When the `index/` is just a local file system path, then it can be included in the git. In such case Git LFS may have to be enabled if the blobs sizes are large.

2.  **Vector Database (Secondary Index / Hot Store):**
    *   The Vector DB is considered a secondary, performance-oriented data store.
    *   Its state is derived entirely from the data in the `semantic-repo`. For local-only scenarios, the DB must be explicitly populated from the blob store. In enterprise deployments, the `semantic-repo` can mounted as data lake source for compatible databases (e.g. Dremio), or run a cron or schedule-based ingestion into vector databases (e.g. AirByte).
    *   If the Vector DB becomes corrupted or is lost, it can be fully rebuilt from the `semantic-repo`.

Notes:
- Use `.semantic/index/sha256/<first-three-chars>/<next-three-chars>/<next-three-chars>/<rest-of-hash>` as the single, immutable blob store.
- `.semantic/index/lanes/<lane_id>` Per-lane folders only contain their `manifest.jsonl` (plus optional small metadata); they never contain the actual blobs.
  - Manifest size remains proportional to one model’s indexing jobs, not the cross product of all models.
  - Deleting or deprecating a lane is `rm -rf <lane_id folder>`.
- Security is achievable via ACL on the manifest (or `lane_id` folder), not on the blob path.

`LaneId` rules of thumb:
- The **lane id** is the stable namespace.
- Anything that alters the semantic meaning of the lane (model, modality, grouping) → **create a new lane id** to keep history side-by-side.
- Only non-semantic tuning (confidence threshold, minor overlap delta) is allowed to reuse the lane id; the manifest keeps both generations, and retention policy decides when older blobs are garbage-collected.



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

The system supports two distinct, configurable security modes to cater to different usage scenarios: Local Mode and Enterprise Mode. The mode is determined by the system's configuration.

#### Local Mode (Default)

This mode is designed for individual users running the system on their local machine for personal or development purposes.

-   **Security Mechanism:** The API server binds to `localhost` by default. This provides inherent security for single-user, local instances, as the API is not exposed to the network.
-   **Authentication:** No authentication (e.g., API keys, tokens) is required. This ensures a frictionless, "zero-config" user experience.
-   **Deployment:** This mode is intended for standalone executable deployments created with Bun, requiring no Docker or other containerization frameworks.

#### Enterprise Mode

This mode is designed for team or organizational use, typically in a shared, networked environment (cloud or on-premises).

-   **Security Mechanism:** The API server binds to a network-accessible interface (e.g., `0.0.0.0`) within its container.
-   **Authentication:** Authentication is mandatory and pluggable. The primary recommended mechanism is integration with an external Identity Provider (IdP) via **LDAP**.
-   **Authorization:** The system uses an Attribute-Based Access Control (ABAC) model, implemented with **Casbin**. This allows for fine-grained permission policies.
-   **Policy Granularity:** The architecture must support two distinct Casbin ABAC policies to meet enterprise needs:
    1.  **Configuration Access Policy:** Governs read/write access to the `semantic-repo` configurations. This allows teams (e.g., Finance) to manage their own semantic overlays privately.
    2.  **Knowledge Access Policy:** Governs access to the AI-indexed search results. This policy can be more permissive, allowing broader access to the derived knowledge (e.g., enabling a CEO to query results from the Finance index, even without access to the underlying configuration).

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

The system is designed for two primary deployment targets, corresponding to the Local and Enterprise security modes.

### Local Deployment

-   **Target:** Standalone, single-file executable.
-   **Mechanism:** Utilizes Bun's native build capabilities (`bun build`) to package the entire application into a single binary for a specific platform (Linux, macOS, Windows).
-   **Requirements:** No external dependencies like Docker are required. The user can run the binary directly.
-   **Configuration:** Reads configuration from local files (e.g., `.env`, `group-config.json`).

### Enterprise Deployment

-   **Target:** OCI-compliant container image (Docker).
-   **Mechanism:** A `Dockerfile` will be provided to build a container image containing the application and its runtime dependencies. This image can be deployed to any container orchestrator like Kubernetes or a managed container service.
-   **Configuration:** Managed via environment variables, allowing for secure and flexible configuration in orchestrated environments.
-   **Infrastructure as Code:** A `docker-compose.yaml` file will be provided for easy local testing of the containerized setup.

## Security and Performance

*(To be defined in detail, addressing NFRs like auth, latency, throughput)*

## Testing Strategy

The project will adhere to a comprehensive testing strategy to ensure code quality, correctness, and reliability.

-   **Framework:** **Bun Test** (`bun:test`) will be the exclusive framework for all automated tests, including unit and integration tests.
-   **Unit Tests:**
    -   **Scope:** All core logic within the `/packages` directories, especially utility functions, data model transformations, and business logic in the `core` engine.
    -   **Requirement:** A minimum of **80% code coverage** is required for all new code in the `core` package.
-   **Integration Tests:**
    -   **Scope:** Test the interaction between internal modules (e.g., API layer calling the Core Engine) and between the system and external services (e.g., connectors, vector database).
    -   **Requirement:** Every API endpoint must have at least one happy-path integration test and one test for a common error case.
-   **End-to-End (E2E) Tests:**
    -   **Scope:** Full user workflows, such as `berg10 group apply` followed by a successful search query via the API.
    -   **Framework:** Playwright or a similar framework will be used.

## Coding Standards

To ensure code consistency, readability, and quality across the project, all contributions must adhere to the following standards.

-   **Tooling:** **Biomejs** will be used for all linting, formatting, and code analysis. A `biome.json` configuration file will be committed to the root of the repository.
-   **Formatting:** All code will be automatically formatted by Biomejs on save and as a pre-commit hook.
-   **Linting:** The Biomejs linter will be configured with a recommended ruleset to catch common errors and enforce best practices. No code with linting errors will be merged.
-   **Naming Conventions:**
    -   Interfaces: `PascalCase` prefixed with `I` (e.g., `interface ISemanticGroup`).
    -   Types: `PascalCase` prefixed with `T` (e.g., `type TGroup`)
    -   Classes: `PascalCase`.
    -   Functions/Variables: `camelCase`.
    -   Constants: `UPPER_SNAKE_CASE`.
-   **Modularity:** Code should be organized into small, focused modules with clear responsibilities.

## Error Handling Strategy

The system will implement a robust error handling strategy that provides clear, consistent feedback for both CLI users and API consumers.

### API Error Responses

All REST/gRPC API endpoints will return a standardized JSON error response in case of failure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "A human-readable error message.",
    "details": { ... } // Optional, for structured error details
  }
}
```

-   **Error Codes:** A list of standardized error codes will be maintained (e.g., `GROUP_NOT_FOUND`, `INVALID_CONFIG`, `INDEXING_FAILED`).
-   **Logging:** All errors will be logged with a unique request ID to correlate API responses with internal log entries.

### CLI Error Handling

-   The `berg10` CLI will provide user-friendly error messages and exit with a non-zero status code on failure.
-   For configuration errors, the CLI will output the specific validation issue and line number if possible.

### Internal Error Propagation

-   Within the modular monolith, errors will be propagated using exceptions. A central middleware in the API server will catch unhandled exceptions and format them into the standard JSON error response.

## Monitoring and Observability

*(To be defined, implementing logging and metrics as per NFRs)*

## Reliability Considerations and Open Questions

The following reliability weak-links have been identified and require further architectural decisions:

### 1. Vector Database Reliability
**Open Question:** What reliability mechanisms should be implemented for the vector database (Milvus/Qdrant)?
**Considerations:**
- Backup/restore strategy for vector indices
- Failover mechanism for vector DB
- Data replication across vector DB instances
- Health monitoring for vector DB availability

### 2. Semantic Repository Data Protection
**Decision:** The backup strategy for the `semantic-repo` will differ based on the operational mode.

-   **Local Mode:** Backup is the user's responsibility. Users are encouraged to push their project, including the `.semantic` directory, to a remote Git repository as part of their standard workflow. The system will ensure atomic file writes to prevent local corruption during operations.
-   **Enterprise Mode:** An automated, regular backup is mandatory. The recommended strategy is a scheduled job (e.g., a Kubernetes CronJob) that executes a `git push` from the live `semantic-repo` to a remote, secure, and backed-up bare Git repository (e.g., on GitHub Enterprise, GitLab, or a dedicated server).

### 3. AI/ML Service Reliability
**Open Question:** What reliability mechanisms should be implemented for external AI/ML services (Hugging Face/Cloud AI)?
**Considerations:**
- Retry logic with exponential backoff
- Circuit breaker for AI service failures
- Fallback to local models when cloud services fail
- Caching of embeddings for offline scenarios

**Decision:** To ensure resilience when interacting with external AI/ML services, the following will be implemented:

-   **Retry with Exponential Backoff:** All API calls to external services will be wrapped in a retry mechanism (e.g., 3 retries with exponential backoff) to handle transient network issues or temporary service unavailability.
-   **Circuit Breaker:** A circuit breaker pattern will be implemented to prevent the system from repeatedly calling a failing service. If a service fails consistently, the breaker will trip, and indexing jobs requiring that service will fail fast for a configured cool-down period.
-   **Caching (Future):** While not in the MVP, the design will allow for a future caching layer for embeddings to reduce redundant API calls.

### 4. Event Processing Reliability
**Open Question:** What event-driven architecture should be implemented for change detection?
**Considerations:**
- Event store for change events
- Replay mechanism for missed events
- Dead letter queue for failed processing
- Idempotency handling for duplicate events

### 5. Data Pipeline Reliability
**Open Question:** What reliability mechanisms should be implemented for the indexing pipeline?
**Considerations:**
- Checkpointing for long-running indexing jobs
- Retry mechanism for failed indexing steps
- Rollback mechanism for failed index updates
- Validation of index integrity

### 6. Configuration Management Reliability
**Open Question:** What reliability mechanisms should be implemented for semantic group configurations?
**Considerations:**
- Configuration validation on apply
- Configuration backup/versioning
- Rollback mechanism for bad configurations
- Atomic configuration updates

### 7. Cross-Service Communication Reliability
**Open Question:** What reliability mechanisms should be implemented for inter-service communication?
**Considerations:**
- Service mesh for resilience
- Circuit breakers between components
- Timeout/retry policies for service calls
- Health checks for service dependencies

## Checklist Results Report

*To be populated after review.*
