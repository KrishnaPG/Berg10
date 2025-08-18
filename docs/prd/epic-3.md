# Epic 3: AI Indexing Engine

## Goal

Integrate an AI model to generate embeddings for Semantic Entities and implement the core logic for storing these embeddings and their metadata immutably within the `semantic-repo`. This epic delivers the fundamental AI-driven knowledge derivation capability.

## Story 3.1: Integrate AI Embedding Model

As a System,
I want to use an AI model to generate embeddings for content,
so that semantic search becomes possible.

#### Acceptance Criteria

1.  Select and integrate a specific, proven AI embedding model (e.g., a pre-trained sentence transformer).
2.  Implement the logic to load the model and prepare it for inference.
3.  Create a function or service that takes a `SemanticEntity` (or its content) and returns its vector embedding.

## Story 3.2: Implement Embedding Storage Logic

As a System,
I want to store generated embeddings and their metadata immutably,
so that the index is reliable, versioned, and scalable.

#### Acceptance Criteria

1.  Implement logic to take an embedding and store it as an immutable blob in `.semantic/index/sha256/<first-three-chars>/<next-three-chars>/<next-three-chars>/<rest-of-hash>.embed`.
2.  Implement logic to create/append a line to the `manifest.jsonl` file for the group, recording details like `entity_id`, `src_sha256`, `blob_sha256`, `model_info`, `timestamp`.
3.  Ensure atomicity when updating the `manifest.jsonl` file (e.g., write to temp file, then rename).

## Story 3.3: Implement Basic Indexing Workflow

As a System,
I want to orchestrate the process of indexing Semantic Entities for a group,
so that embeddings are generated and stored based on the group's configuration.

#### Acceptance Criteria

1.  Implement a workflow that takes a `SemanticGroup` as input.
2.  The workflow SHALL retrieve the list of `SemanticEntities` for the group (from Epic 2).
3.  For each entity, the workflow SHALL retrieve its content.
4.  The workflow SHALL call the embedding model to generate the vector.
5.  The workflow SHALL call the storage logic to save the embedding and update the manifest.
