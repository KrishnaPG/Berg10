# High Level Architecture

## Technical Summary

Berg10 adopts a modular monolith architecture to balance initial development simplicity with a clear path for future scaling. The core engine, written in TypeScript (Elysia/Bun) for performance, encapsulates the main logic for group management, entity mapping, indexing orchestration, and `semantic-repo` interaction. Key external integrations include LakeFS/Git connectors for source data, proven AI/ML models for embedding generation, and a vector database (e.g., Qdrant) for search. The system exposes functionality via a REST/gRPC API and a basic MCP server endpoint. The `semantic-repo` acts as the structured storage layer for configurations, immutable index blobs, and metadata, managed via Git for versioning. A `berg10` CLI tool provides command-line management. This design aims for scalability, maintainability, and responsiveness to source changes.

## Platform and Infrastructure Choice

Given the requirements for cross-platform compatibility, containerization (Docker), and potential Kubernetes orchestration (NFR12), a cloud-agnostic or self-hosted approach is suitable. The backend will run on Linux containers, deployable to any cloud provider (AWS, GCP, Azure) or on-premises Kubernetes cluster. The choice of Bun/Elysia favors performance and efficient resource usage. For initial deployment and development, a simple Docker setup or a managed Kubernetes service aligns well.

**Platform:** Cross-platform (Linux containers) / Cloud-agnostic / Self-hosted Kubernetes
**Key Services:** Docker, Kubernetes (Orchestrator), Git (for `semantic-repo` versioning), LakeFS/Git (Source Repos), Vector DB (Milvus/Quadrant), AI Model Service (Hugging Face/Cloud AI)
**Deployment Host and Regions:** Docker containers/Kubernetes pods; region deployment will depend on user base and source data location.

## Repository Structure

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

## High Level Architecture Diagram

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

## Architectural Patterns

- **Modular Monolith:** Core system as a single deployable unit with clear internal modules (`core`, `connectors`, `api`, `cli`) - _Rationale:_ Aligns with PRD's service architecture recommendation, simplifies initial development and deployment while maintaining modularity for future scaling (microservices).
- **Repository Pattern (Internal):** Abstract data access logic within modules (e.g., `semantic-repo` access in `core`) - _Rationale:_ Enables testing, maintainability, and potential future database/storage migration flexibility.
- **Connector Pattern:** Standardized interfaces for interacting with different versioned file systems (LakeFS, Git) - _Rationale:_ Allows easy addition of new source connectors without impacting core logic.
- **Event-Driven (Future/Polling):** Mechanism to detect changes in source repositories and trigger re-evaluation/indexing - _Rationale:_ Keeps semantic views and indices up-to-date automatically (FR7).
- **Immutable Storage (`semantic-repo`):** Storing index blobs and metadata immutably using content-addressed storage (SHA256) - _Rationale:_ Ensures data integrity, prevents corruption, and enables deduplication (NFR6, NFR11).
- **API Gateway Pattern (Implicit):** Centralized API entry point for REST/gRPC access - _Rationale:_ Simplifies client interaction and allows for centralized auth/metrics (aligned with exposing APIs).
