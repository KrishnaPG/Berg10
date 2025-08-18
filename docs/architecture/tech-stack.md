# Tech Stack

## Technology Stack Table

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
