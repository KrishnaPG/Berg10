# Epic 4: Search & API Access

## Goal

Expose the semantic content and derived knowledge through programmatic interfaces. Implement a Search API for semantic queries and a basic MCP endpoint for external agent access. This epic makes the system's value accessible to users and other systems.

## Story 4.1: Integrate with Vector Database

As a System,
I want to load generated embeddings into a vector database,
so that efficient semantic search can be performed.

#### Acceptance Criteria

1.  Select a specific vector database (e.g., Milvus).
2.  Implement a process or service to read the `manifest.jsonl` and load the embeddings into the vector database, associating them with `entity_id` and other metadata.
3.  Define the schema/collection structure within the vector database.

## Story 4.2: Implement Semantic Search API Endpoint

As an Application Developer,
I want to query the system semantically,
so that I can find relevant content based on meaning.

#### Acceptance Criteria

1.  Implement a RESTful API endpoint (e.g., `POST /search`).
2.  The endpoint SHALL accept a query string.
3.  The endpoint SHALL use the integrated AI model to generate an embedding for the query.
4.  The endpoint SHALL query the vector database with the query embedding.
5.  The endpoint SHALL return a list of relevant `entity_id`s and associated metadata (e.g., source file path).

## Story 4.3: Implement Basic MCP Server Endpoint

As an AI Agent,
I want to access semantic content and derived knowledge via MCP,
so that I can integrate this system into my workflows.

#### Acceptance Criteria

1.  Implement a basic MCP server.
2.  Expose the semantic groups and their entities as resources.
3.  Allow querying (similar to the Search API) through the MCP interface.
4.  Provide access to embedding data via MCP, respecting any defined access controls (placeholder for NFR).
