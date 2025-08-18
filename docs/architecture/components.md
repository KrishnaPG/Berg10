# Components

## Core Engine (`/packages/core`)
**Responsibility:** Central orchestrator for group management, entity mapping, indexing workflow, and `semantic-repo` interaction.

**Key Interfaces:**
- `GroupManager`: Manage SemanticGroup lifecycle (CRUD, validation).
- `EntityManager`: Map source files to SemanticEntities based on group rules.
- `IndexingOrchestrator`: Trigger and manage the AI indexing process for entities.
- `SemanticRepoManager`: Handle reading/writing configurations, index blobs, and manifests in the `semantic-repo`.

**Dependencies:** Connectors, AI Model Service Client, Vector DB Client, Shared Types.

**Technology Stack:** TypeScript, Elysia (core logic), Bun.

## Connectors (`/packages/connectors`)
**Responsibility:** Provide standardized access to versioned file systems (LakeFS, Git).

**Key Interfaces:**
- `FileSystemConnector`: Interface for listing files, retrieving content/metadata based on ref (commit/tag/branch).

**Dependencies:** External SDKs (LakeFS Go/Python client, NodeGit, Isomorphic Git), Shared Types.

**Technology Stack:** TypeScript, potentially some performance-critical parts in Rust/WASM.

## API Server (`/packages/api`)
**Responsibility:** Expose REST/gRPC endpoints for Search API and potentially group management.

**Key Interfaces:**
- `SearchAPI`: Endpoint for semantic search queries (accept query, return entities).
- `ManagementAPI` (Optional/Future): Endpoints for managing groups via API.

**Dependencies:** Core Engine, Vector DB Client, Shared Types.

**Technology Stack:** TypeScript, Elysia (for REST/gRPC), Bun.

## MCP Server (`/packages/mcp`)
**Responsibility:** Implement the basic MCP server endpoint for external agent access.

**Key Interfaces:**
- `MCPResourceProvider`: Expose semantic groups/entities and search capabilities via MCP.

**Dependencies:** Core Engine, Shared Types.

**Technology Stack:** TypeScript, Elysia (MCP library or custom implementation), Bun.

## CLI (`/packages/cli`)
**Responsibility:** Provide the `berg10` command-line tool for user interaction.

**Key Interfaces:**
- `CLI Commands`: Implement `apply`, `list`, `delete` commands for Semantic Groups.

**Dependencies:** Core Engine, Shared Types.

**Technology Stack:** TypeScript, Elysia CLI or standard Node.js CLI library, Bun.

## Shared (`/packages/shared`)
**Responsibility:** Centralize common types, interfaces, and utilities.

**Key Interfaces:**
- Shared TypeScript interfaces (SemanticGroup, SemanticEntity).
- Utility functions for hashing, validation, logging.

**Dependencies:** None (or minimal, foundational libs).

**Technology Stack:** TypeScript.
