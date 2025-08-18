# Semantic Content Management System Product Requirements Document (PRD)  
  
# Semantic Content Management System Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Enable users to define and manage 'semantic groups' to organize content based on meaning rather than file paths.
- Provide a virtual layer over versioned repositories (LakeFS, Git) to abstract physical storage details.
- Allow content discovery and access through semantic queries and filters.
- Facilitate AI-driven indexing of content within semantic groups to create searchable knowledge.
- Support configurable version policies for source files and retention policies for derived indices.
- Deliver a functional MVP with core features like group definition, basic filtering, entity mapping, simple AI indexing, and a search API.
- Establish a scalable and maintainable architecture for future enhancements like complex filters, sub-groups, multiple AI models, and UI.

### Background Context

Managing and extracting value from large volumes of data stored in versioned file systems is increasingly challenging. Traditional hierarchical organization based on paths hinders discoverability and contextual access. This project addresses this by creating a semantic content management system. It introduces a virtual layer where users define 'semantic groups' using filters, grouping rules, and AI indexing criteria. This allows for flexible, potentially overlapping organizational views of data, enabling powerful AI-driven search and secure knowledge sharing across teams. The system will automatically update views and re-index content on source changes, store configurations and indices in a structured `semantic-repo`, and provide APIs for consumption by AI agents and applications. The goal is to provide a unified, flexible, and AI-powered way to manage and derive value from versioned content, starting with a focused MVP.

### Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2024-05-21 | 1.0 | Initial draft based on Project Brief. | BMad Master |

## Requirements

### Functional

1.  **FR1:** The system SHALL allow users to define Semantic Groups via a configuration file or API, specifying a unique name and a filter.
2.  **FR2:** The system SHALL support defining filters using simple regex patterns on filenames.
3.  **FR3:** The system SHALL support defining version policies (e.g., latest, specific tag/commit/branch) for the underlying source repository data considered by a group.
4.  **FR4:** The system SHALL allow users to define basic grouping rules to map source files into Semantic Entities (e.g., one file to one entity, one folder to one entity).
5.  **FR5:** The system SHALL support defining AI indexing criteria for Semantic Groups, including specifying an AI model and configuration parameters.
6.  **FR6:** The system SHALL automatically discover and map source files/objects to Semantic Entities within a group based on its defined filter and grouping rules.
7.  **FR7:** The system SHALL automatically trigger re-indexing of Semantic Entities when underlying source files/objects are updated, respecting the group's version policy.
8.  **FR8:** The system SHALL store generated vector embeddings and index metadata immutably in a structured `semantic-repo` layout, associating them with the source entity and indexing configuration.
9.  **FR9:** The system SHALL provide a `berg10` CLI tool for managing Semantic Groups (apply, list, delete).
10. **FR10:** The system SHALL provide a Search API to query Semantic Groups and retrieve relevant Semantic Entities based on semantic similarity of provided input.
11. **FR11:** The system SHALL maintain an append-only log of all actions related to Semantic Groups, policies, and indexing runs.
12. **FR12:** The system SHALL store all Semantic Group configurations and `semantic-repo` metadata in a versioned manner (e.g., using Git).
13. **FR13:** The system SHALL support defining retention policies for AI index versions (e.g., keep last N, expire after X time).
14. **FR14:** The system SHALL provide a basic MCP server endpoint for external AI agents to access semantic content and derived knowledge.

### Non Functional

1.  **NFR1:** The system SHALL be designed for cross-platform compatibility (Linux, Windows, macOS) for core services and CLI.
2.  **NFR2:** The system SHALL support read-only access to underlying versioned repositories.
3.  **NFR3:** The system SHALL be designed to efficiently handle large manifest files (several GB) for index metadata.
4.  **NFR4:** The system SHALL support scalable AI indexing jobs, potentially processing large volumes of entities.
5.  **NFR5:** The Search API SHALL have a target p95 latency of < 500ms for standard queries.
6.  **NFR6:** The system SHALL implement atomic operations for updating `semantic-repo` metadata (e.g., manifest files) to prevent corruption.
7.  **NFR7:** The system SHALL be designed modularly, separating concerns like connectors, indexing, storage, and API layers.
8.  **NFR8:** The system SHALL integrate with proven, existing vector databases (e.g., Qdrant, Milvus) for search capabilities.
9.  **NFR9:** The system SHALL integrate with proven, existing AI/ML models for content indexing.
10. **NFR10:** The system SHALL provide clear and structured logging for all major operations.
11. **NFR11:** The system SHALL store `semantic-repo` index blobs using content-addressed storage (e.g., SHA256) for immutability and deduplication.
12. **NFR12:** The system SHALL be deployable using containerization (Docker) and orchestrated (Kubernetes).

## User Interface Design Goals

### Overall UX Vision

The primary interface for the MVP will be the `berg10` CLI and the Search/MCP APIs. Direct user interaction with the system's core logic will happen through these programmatic interfaces. A future Admin UI is envisioned for easier management and monitoring, but is out of scope for the MVP. The UX for the MVP focuses on the clarity and ease of use of the configuration files (for defining groups) and the intuitiveness of the CLI commands and API responses. The system should feel powerful yet straightforward for technically proficient users (Data Engineers, ML Teams) to integrate into their workflows.

### Key Interaction Paradigms

- Configuration-Driven Management: Defining and managing semantic groups primarily through declarative configuration files (`group-config.json`).
- CLI Operations: Using the `berg10` CLI for applying configurations, listing groups, and potentially monitoring status.
- API Consumption: Interacting with the system programmatically via GraphQL, RESTful or gRPC APIs for search and MCP access.
- Event-Driven Awareness (Future): Reacting to system events (e.g., indexing completion) via broadcast mechanisms.

### Core Screens and Views

- **CLI Terminal:** The main interface for `berg10` commands (apply, list, etc.).
- **Configuration File Editor:** Editing `group-config.json` to define semantic groups.
- **API Response Viewer:** Viewing results from Search API or MCP endpoints (likely via scripts/tools initially).
- **(Future) Admin Dashboard:** Visualizing groups, entities, indexing status, and logs.

### Accessibility

- None (CLI and API focused for MVP)

### Branding

- N/A for core engine. Future UI to follow organizational guidelines.

### Target Device and Platforms

- Cross-Platform (CLI and backend services)

## Technical Assumptions

### Repository Structure

- Monolithic: Separate modules for core logic (`core`), CLI (`cli`), API (`api`), and connectors (`connectors`), all under a single repo, but separated into different folders based on functionality. 

### Service Architecture

- Service Architecture: Hybrid approach starting with a modular monolith for the core engine (containing indexing, storage logic) exposed via a service API. Connectors will be separate modules or services. Future scaling might involve breaking out components into microservices, but the monolith simplifies initial development and deployment. *Rationale: Balances initial development simplicity with a path towards scalability. Aligns with the goal of a functional MVP first.*

### Testing Requirements

- Testing Requirements: Unit + Integration. Core logic (group parsing, entity mapping, manifest handling) requires unit tests. Integration tests are needed for connectors, API endpoints, and the interaction between core logic and the `semantic-repo` storage layer. E2E tests for the full workflow (define group -> index -> search) are valuable but might be prioritized after core stability. *Rationale: Ensures core functionality is robust and components integrate correctly, suitable for a technically focused user base.*

### Additional Technical Assumptions and Requests

- Language: Backend services in Typescript (Elysia/Bun), performance-critical parts potentially in C/Rust. CLI in Typescript. *Rationale: Leverages desired tech stack and performance benefits.*
- AI/ML Integration: Integration with existing, proven models via standard libraries or APIs (e.g., Hugging Face, cloud provider AI services). *Rationale: Avoids reinventing the wheel and leverages state-of-the-art models.*
- Vector Database: Integration with a proven vector database like Milvus or Qdrant for the search backend. *Rationale: Uses specialized, scalable tools for vector search.*
- Filesystem Connectors: Initial focus on LakeFS connector. Git connector is a high-priority follow-up. *Rationale: Aligns with MVP scope and common use cases.*
- `semantic-repo` Layout: Strictly adhere to the defined layout (`.semantic/`, `groups/`, `sha256/` blobs, `manifest.jsonl`). *Rationale: Ensures consistency and predictability of the storage layer.*

## Epic List

1.  **Epic 1: Foundation & Core Infrastructure:** Establish the project repository, define core data models for Semantic Groups/Entities, implement basic `semantic-repo` storage layout, and create the foundational `berg10` CLI tool with basic group management (apply, list).
2.  **Epic 2: File System Integration & Entity Mapping:** Develop the read-only connector for a versioned file system (e.g., LakeFS), implement logic to evaluate group filters against the file system, and map source files to Semantic Entities based on basic grouping rules.
3.  **Epic 3: AI Indexing Engine:** Integrate a single, configurable AI model, implement the process for chunking Semantic Entities (if needed), generating embeddings, and storing the immutable vector blobs and metadata (`manifest.jsonl`) in the `semantic-repo`.
4.  **Epic 4: Search & API Access:** Implement the semantic search API endpoint, integrate with the chosen vector database for querying embeddings, and build the basic MCP server endpoint for external agent access.
5.  **Epic 5: Automation & Observability:** Implement mechanisms to detect changes in the underlying file system and trigger re-evaluation/indexing, finalize the append-only audit logging, and ensure core system metrics (index throughput, API latency) are tracked.

## Epic 1: Foundation & Core Infrastructure

### Goal

Establish the foundational project structure, core data models, and basic storage layout. Deliver the ability to define and list semantic groups via the `berg10` CLI, laying the groundwork for all subsequent functionality. This epic sets up the essential infrastructure for managing group configurations and the `semantic-repo`.

### Story 1.1: Define Semantic Group Data Model

As a Developer,
I want a clear and structured data model for Semantic Groups,
so that the system can consistently parse, store, and use group configurations.

#### Acceptance Criteria

1.  Define the structure for a `SemanticGroup` configuration (likely `group-config.json`), including fields for `name`, `filter` (initially just regex string), `versionPolicy` (initially just `latest`), and `indexing` (placeholder for future details).
2.  Define the structure for a `SemanticEntity`, including a unique identifier and a reference to its source file(s).
3.  Document the data model in a readily accessible format (e.g., a markdown file or code comments).

### Story 1.2: Implement `semantic-repo` Storage Layout

As a System,
I want a structured and versioned layout for storing Semantic Group configurations and index metadata,
so that data is organized, persistent, and manageable.

#### Acceptance Criteria

1.  Implement the core `semantic-repo` directory structure: `.semantic/version`, `.semantic/index/sha256/`, `groups/<group_name>/group-config.json`.
2.  Implement logic to initialize a new `semantic-repo` directory with the correct structure and initial version file.
3.  Implement logic to read and write `group-config.json` files for groups within the `groups/` directory.

### Story 1.3: Create `berg10` CLI Tool Skeleton

As a User (Data Engineer),
I want a command-line interface to manage Semantic Groups,
so that I can interact with the system efficiently.

#### Acceptance Criteria

1.  Create a basic CLI tool executable named `berg10`.
2.  Implement a basic command structure (e.g., `berg10 group apply <file>`, `berg10 group list`).
3.  Add basic help output (`berg10 --help`).

### Story 1.4: Implement `berg10 group apply` Command

As a User,
I want to apply a Semantic Group configuration file,
so that the group is defined and stored in the `semantic-repo`.

#### Acceptance Criteria

1.  The `berg10 group apply <config-file>` command SHALL read the specified configuration file.
2.  The command SHALL validate the configuration file against the defined `SemanticGroup` data model.
3.  The command SHALL store the validated configuration in the `semantic-repo` under `groups/<group_name>/group-config.json`.
4.  The command SHALL provide success/error feedback to the user.

### Story 1.5: Implement `berg10 group list` Command

As a User,
I want to list all defined Semantic Groups,
so that I can see what groups are currently configured.

#### Acceptance Criteria

1.  The `berg10 group list` command SHALL scan the `semantic-repo` `groups/` directory.
2.  The command SHALL list the names of all found Semantic Groups.
3.  The command SHALL display the list to the user in a clear format.

## Epic 2: File System Integration & Entity Mapping

### Goal

Connect the system to a versioned file system backend (starting with LakeFS) and implement the logic to identify source files that match a Semantic Group's filter and map them to Semantic Entities based on basic grouping rules. This epic bridges the gap between group definitions and actual content.

### Story 2.1: Develop LakeFS File System Connector

As a System,
I want to read data from a LakeFS repository,
so that I can evaluate filters against the source files.

#### Acceptance Criteria

1.  Implement a read-only connector module for interacting with a LakeFS repository.
2.  The connector SHALL be able to list files/objects at a specific commit/tag/branch (respecting the `versionPolicy`).
3.  The connector SHALL be able to retrieve file metadata (name, size, creation date if available) and content.

### Story 2.2: Implement Simple Filter Evaluation

As a System,
I want to evaluate a Semantic Group's filter against files in the connected file system,
so that I can identify which files belong to the group.

#### Acceptance Criteria

1.  Implement logic to evaluate the simple regex filename filter defined in a `SemanticGroup` configuration.
2.  The system SHALL use the LakeFS connector to list files based on the group's `versionPolicy`.
3.  The system SHALL apply the regex filter to the filenames and produce a list of matching files/objects.

### Story 2.3: Implement Basic Entity Mapping

As a System,
I want to map filtered source files into Semantic Entities,
so that the basic unit of access and indexing is defined.

#### Acceptance Criteria

1.  Implement basic grouping logic: map each matching file to a single `SemanticEntity`.
2.  Generate a unique identifier for each `SemanticEntity` (e.g., based on the file path and version).
3.  Store the mapping information temporarily for use in the next epic (Indexing).

## Epic 3: AI Indexing Engine

### Goal

Integrate an AI model to generate embeddings for Semantic Entities and implement the core logic for storing these embeddings and their metadata immutably within the `semantic-repo`. This epic delivers the fundamental AI-driven knowledge derivation capability.

### Story 3.1: Integrate AI Embedding Model

As a System,
I want to use an AI model to generate embeddings for content,
so that semantic search becomes possible.

#### Acceptance Criteria

1.  Select and integrate a specific, proven AI embedding model (e.g., a pre-trained sentence transformer).
2.  Implement the logic to load the model and prepare it for inference.
3.  Create a function or service that takes a `SemanticEntity` (or its content) and returns its vector embedding.

### Story 3.2: Implement Embedding Storage Logic

As a System,
I want to store generated embeddings and their metadata immutably,
so that the index is reliable, versioned, and scalable.

#### Acceptance Criteria

1.  Implement logic to take an embedding and store it as an immutable blob in `.semantic/index/sha256/<hash>.embed`.
2.  Implement logic to create/append a line to the `manifest.jsonl` file for the group, recording details like `entity_id`, `src_sha256`, `blob_sha256`, `model_info`, `timestamp`.
3.  Ensure atomicity when updating the `manifest.jsonl` file (e.g., write to temp file, then rename).

### Story 3.3: Implement Basic Indexing Workflow

As a System,
I want to orchestrate the process of indexing Semantic Entities for a group,
so that embeddings are generated and stored based on the group's configuration.

#### Acceptance Criteria

1.  Implement a workflow that takes a `SemanticGroup` as input.
2.  The workflow SHALL retrieve the list of `SemanticEntities` for the group (from Epic 2).
3.  For each entity, the workflow SHALL retrieve its content.
4.  The workflow SHALL call the embedding model to generate the vector.
5.  The workflow SHALL call the storage logic to save the embedding and update the manifest.

## Epic 4: Search & API Access

### Goal

Expose the semantic content and derived knowledge through programmatic interfaces. Implement a Search API for semantic queries and a basic MCP endpoint for external agent access. This epic makes the system's value accessible to users and other systems.

### Story 4.1: Integrate with Vector Database

As a System,
I want to load generated embeddings into a vector database,
so that efficient semantic search can be performed.

#### Acceptance Criteria

1.  Select a specific vector database (e.g., Milvus).
2.  Implement a process or service to read the `manifest.jsonl` and load the embeddings into the vector database, associating them with `entity_id` and other metadata.
3.  Define the schema/collection structure within the vector database.

### Story 4.2: Implement Semantic Search API Endpoint

As an Application Developer,
I want to query the system semantically,
so that I can find relevant content based on meaning.

#### Acceptance Criteria

1.  Implement a RESTful API endpoint (e.g., `POST /search`).
2.  The endpoint SHALL accept a query string.
3.  The endpoint SHALL use the integrated AI model to generate an embedding for the query.
4.  The endpoint SHALL query the vector database with the query embedding.
5.  The endpoint SHALL return a list of relevant `entity_id`s and associated metadata (e.g., source file path).

### Story 4.3: Implement Basic MCP Server Endpoint

As an AI Agent,
I want to access semantic content and derived knowledge via MCP,
so that I can integrate this system into my workflows.

#### Acceptance Criteria

1.  Implement a basic MCP server.
2.  Expose the semantic groups and their entities as resources.
3.  Allow querying (similar to the Search API) through the MCP interface.
4.  Provide access to embedding data via MCP, respecting any defined access controls (placeholder for NFR).

## Epic 5: Automation & Observability

### Goal

Automate key system processes like re-indexing on source changes and enhance system observability through logging and metrics. This epic ensures the system is dynamic, responsive, and maintainable.

### Story 5.1: Implement File System Change Detection

As a System,
I want to detect changes in the underlying file system,
so that Semantic Groups can be automatically updated and re-indexed.

#### Acceptance Criteria

1.  Implement a mechanism (e.g., polling, webhook listener, or LakeFS hook adapter) to detect changes (new commits, tags) in the connected file system repository.
2.  The system SHALL trigger a re-evaluation of Semantic Groups whose `versionPolicy` might be affected by the change.

### Story 5.2: Implement Automated Re-indexing Trigger

As a System,
I want to automatically re-index Semantic Entities when their source files change,
so that the semantic knowledge remains up-to-date.

#### Acceptance Criteria

1.  When a file system change is detected, the system SHALL re-evaluate the filters for relevant Semantic Groups.
2.  For entities whose source files have changed (new version), the system SHALL trigger the indexing workflow (Epic 3) for those entities within the group.

### Story 5.3: Finalize Append-Only Audit Logging

As an Administrator,
I want a complete log of system actions,
so that I can audit changes and troubleshoot issues.

#### Acceptance Criteria

1.  Ensure that all significant actions (group creation/deletion/update, indexing runs start/end, policy changes) are logged.
2.  Implement the append-only log storage mechanism (e.g., a file in the `semantic-repo` or a separate log store).
3.  Define the structure of log entries for consistency.

### Story 5.4: Implement Core Metrics Tracking

As an Operator,
I want to monitor the system's performance,
so that I can ensure it meets requirements and identify bottlenecks.

#### Acceptance Criteria

1.  Instrument the system to track key metrics like indexing throughput (entities/sec) and API request latency.
2.  Expose these metrics in a standard format (e.g., OTL, Prometheus endpoint) or log them periodically.

## Checklist Results Report

The checklist results will be populated here after running the `pm-checklist`.

## Next Steps

### UX Expert Prompt

Create the UI/UX vision and design for the future Admin Dashboard, focusing on visualizing semantic groups, entities, indexing status, and logs. Consider the user journeys for Data Engineers managing groups and Analysts exploring indexed knowledge. Use the technical considerations and target platforms from the PRD.

### Architect Prompt

Design the detailed system architecture for the Semantic Content Management System based on the PRD. Focus on the modular monolith structure for the core engine, the Git connector implementation, the integration with the chosen vector database and AI model, the `semantic-repo` storage layout, and the API/MCP server setup. Address the technical assumptions regarding repository structure, service architecture, and testing requirements. Plan for scalability and maintainability.