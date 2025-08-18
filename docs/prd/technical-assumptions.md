# Technical Assumptions

## Repository Structure

- Monolithic: Separate modules for core logic (`core`), CLI (`cli`), API (`api`), and connectors (`connectors`), all under a single repo, but separated into different folders based on functionality. 

## Service Architecture

- Service Architecture: Hybrid approach starting with a modular monolith for the core engine (containing indexing, storage logic) exposed via a service API. Connectors will be separate modules or services. Future scaling might involve breaking out components into microservices, but the monolith simplifies initial development and deployment. *Rationale: Balances initial development simplicity with a path towards scalability. Aligns with the goal of a functional MVP first.*

## Testing Requirements

- Testing Requirements: Unit + Integration. Core logic (group parsing, entity mapping, manifest handling) requires unit tests. Integration tests are needed for connectors, API endpoints, and the interaction between core logic and the `semantic-repo` storage layer. E2E tests for the full workflow (define group -> index -> search) are valuable but might be prioritized after core stability. *Rationale: Ensures core functionality is robust and components integrate correctly, suitable for a technically focused user base.*

## Additional Technical Assumptions and Requests

- Language: Backend services in Typescript (Elysia/Bun), performance-critical parts potentially in C/Rust. CLI in Typescript. *Rationale: Leverages desired tech stack and performance benefits.*
- AI/ML Integration: Integration with existing, proven models via standard libraries or APIs (e.g., Hugging Face, cloud provider AI services). *Rationale: Avoids reinventing the wheel and leverages state-of-the-art models.*
- Vector Database: Integration with a proven vector database like Milvus or Qdrant for the search backend. *Rationale: Uses specialized, scalable tools for vector search.*
- Filesystem Connectors: Initial focus on LakeFS connector. Git connector is a high-priority follow-up. *Rationale: Aligns with MVP scope and common use cases.*
- `semantic-repo` Layout: Strictly adhere to the defined layout (`.semantic/`, `.semantic/groups/`, `.semantic/index/sha256/` blobs, `.semantic/index/lanes/<lane_id>/manifest.jsonl`). *Rationale: Ensures consistency and predictability of the storage layer.*
