Here are the next steps for implementing the service-based approach for the Git API:

## 1. Create Core Service Layer
Start by creating service classes that encapsulate all Git operations:
- `RepositoryService` - Handles repository creation, listing, config, etc.
- `CommitService` - Manages commits, cherry-pick, revert, amend operations
- `RefsService` - Manages branches and tags
- `FileService` - Handles file operations (get, create, update, delete)
- `IndexService` - Manages staging operations
- `StashService` - Handles stashing functionality
- `DiffService` - Manages diff operations
- `LogService` - Handles commit history and blame
- `MergeService` - Manages merge and rebase operations

Each service should use the existing backend abstraction (libgit2/shell) and expose methods that match your API specification.

## 2. Implement REST API Routes
Using Elysia (Bun) as mentioned in your README:
- Create route handlers in `packages/git-api/src/routes/`
- Each route handler should call the appropriate service method
- Handle request validation and response formatting
- Follow the REST API patterns defined in your spec

## 3. Define gRPC Protobuf Contracts
- Create `.proto` files in `packages/git-api/src/grpc/proto/`
- Define messages and services that match your API specification
- Include streaming capabilities where appropriate (e.g., for log streaming)
- Generate TypeScript interfaces from the proto files

## 4. Implement gRPC Services
- Create gRPC service implementations that call your service layer
- Add streaming capabilities for operations that benefit from it
- Handle bidirectional streaming where needed

## 5. Create GraphQL Schema and Resolvers
- Define GraphQL schema types that match your API specification
- Implement resolvers that call the service layer
- Add subscriptions for real-time events (new commits, ref changes, etc.)
- Use DataLoader pattern for efficient batching

