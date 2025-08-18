# Semantic-Repo Implementation Plan

## Overview
Comprehensive implementation plan for semantic-repo CRUD and management API based on provided documentation.

## 1. Core Architecture

### 1.1 Layered Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (REST/GraphQL)                 │
├─────────────────────────────────────────────────────────────┤
│                 Service Layer (Business Logic)             │
├─────────────────────────────────────────────────────────────┤
│              Repository Layer (Data Access)                  │
├─────────────────────────────────────────────────────────────┤
│                Storage Layer (File System)                   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Module Structure
```
packages/semantic-repo/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middleware/
│   ├── services/
│   ├── repositories/
│   ├── models/
│   ├── utils/
│   ├── workers/
│   └── config/
├── test/
└── docs/
```

## 2. Core Types and Interfaces

### 2.1 Entity Management
```typescript
interface IEntityService {
  create(entity: CreateEntityDto): Promise<ISemanticEntity>;
  findById(id: string): Promise<ISemanticEntity | null>;
  findAll(filters: EntityFilters): Promise<PaginatedResult<ISemanticEntity>>;
  update(id: string, update: UpdateEntityDto): Promise<ISemanticEntity>;
  delete(id: string): Promise<boolean>;
}
```

### 2.2 Group Management
```typescript
interface IGroupService {
  create(group: CreateGroupDto): Promise<ISemanticGroup>;
  findById(id: string): Promise<ISemanticGroup | null>;
  findAll(filters: GroupFilters): Promise<PaginatedResult<ISemanticGroup>>;
  update(id: string, update: UpdateGroupDto): Promise<ISemanticGroup>;
  delete(id: string): Promise<boolean>;
  addLane(groupId: string, lane: ILane): Promise<ISemanticGroup>;
  removeLane(groupId: string, laneId: string): Promise<ISemanticGroup>;
}
```

### 2.3 Lane Management
```typescript
interface ILaneService {
  create(lane: CreateLaneDto): Promise<ILane>;
  findById(id: string): Promise<ILane | null>;
  findAll(filters: LaneFilters): Promise<PaginatedResult<ILane>>;
  update(id: string, update: UpdateLaneDto): Promise<ILane>;
  delete(id: string): Promise<boolean>;
  processLane(laneId: string): Promise<ProcessingResult>;
}
```

## 3. Storage Layer Design

### 3.1 File System Structure
```
.semantic/
├── version                    # Version marker
├── index/
│   ├── blobs/
│   │   └── <sha256>          # Immutable content blobs
│   └── lanes/
│       └── <lane_id>/        # lane_id == group_sha256
│           └── manifest.jsonl
├── groups/
│   ├── <group_name>/
│   │   ├── group.yaml        # sha256 of this becomes lane_id
│   │   └── lock.toml
└── cache/
    └── <group_sha256>/
        └── <commit_sha>.entities.jsonl
```

### 3.2 Repository Interfaces
```typescript
interface IEntityRepository {
  save(entity: ISemanticEntity): Promise<void>;
  findById(id: string): Promise<ISemanticEntity | null>;
  findAll(filters: EntityFilters): Promise<ISemanticEntity[]>;
  update(id: string, entity: Partial<ISemanticEntity>): Promise<void>;
  delete(id: string): Promise<void>;
}

interface IGroupRepository {
  save(group: ISemanticGroup): Promise<void>;
  findById(id: string): Promise<ISemanticGroup | null>;
  findAll(filters: GroupFilters): Promise<ISemanticGroup[]>;
  update(id: string, group: Partial<ISemanticGroup>): Promise<void>;
  delete(id: string): Promise<void>;
}
```

## 4. API Endpoints

### 4.1 REST API
```
# Entities
GET    /api/v1/entities
GET    /api/v1/entities/:id
POST   /api/v1/entities
PUT    /api/v1/entities/:id
DELETE /api/v1/entities/:id

# Groups
GET    /api/v1/groups
GET    /api/v1/groups/:id
POST   /api/v1/groups
PUT    /api/v1/groups/:id
DELETE /api/v1/groups/:id
POST   /api/v1/groups/:id/lanes
DELETE /api/v1/groups/:id/lanes/:laneId

# Lanes
GET    /api/v1/lanes
GET    /api/v1/lanes/:id
POST   /api/v1/lanes
PUT    /api/v1/lanes/:id
DELETE /api/v1/lanes/:id
POST   /api/v1/lanes/:id/process
```

### 4.2 GraphQL Schema
```graphql
type Query {
  entities(filters: EntityFilters): EntityConnection!
  entity(id: ID!): Entity
  groups(filters: GroupFilters): GroupConnection!
  group(id: ID!): Group
  lanes(filters: LaneFilters): LaneConnection!
  lane(id: ID!): Lane
}

type Mutation {
  createEntity(input: CreateEntityInput!): Entity!
  updateEntity(id: ID!, input: UpdateEntityInput!): Entity!
  deleteEntity(id: ID!): Boolean!
  
  createGroup(input: CreateGroupInput!): Group!
  updateGroup(id: ID!, input: UpdateGroupInput!): Group!
  deleteGroup(id: ID!): Boolean!
  addLaneToGroup(groupId: ID!, lane: CreateLaneInput!): Group!
  removeLaneFromGroup(groupId: ID!, laneId: ID!): Group!
  
  createLane(input: CreateLaneInput!): Lane!
  updateLane(id: ID!, input: UpdateLaneInput!): Lane!
  deleteLane(id: ID!): Boolean!
  processLane(id: ID!): ProcessingResult!

  triggerReindex(group: String!, lane: String!): Job!
}

type Subscription {
  entityCreated: Entity!
  entityUpdated: Entity!
  entityDeleted: ID!
  cacheRefreshed(groupId: ID!): CacheUpdate!

  events(filter: EventFilter): Event!
}
```

## 5. Background Worker Architecture

### 5.1 Worker Types
- **Cache Worker**: Processes cache invalidation and regeneration
- **Indexing Worker**: Handles lane processing and entity creation
- **Cleanup Worker**: Manages retention policies and cleanup

### 5.2 Worker Configuration
```typescript
interface IWorkerConfig {
  concurrency: number;
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'exponential' | 'linear';
  };
  queueConfig: {
    type: 'memory' | 'redis' | 'sqs';
    connection: string;
  };
}
```

## 6. Error Handling and Validation

### 6.1 Error Types
```typescript
class SemanticRepoError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
  }
}

class ValidationError extends SemanticRepoError {
  constructor(field: string, message: string) {
    super('VALIDATION_ERROR', message, 400, { field });
  }
}
```

## 7. Testing Strategy

### 7.1 Test Categories
- **Unit Tests**: Individual service methods
- **Integration Tests**: API endpoints and database interactions
- **E2E Tests**: Complete workflow testing
- **Performance Tests**: Load testing for cache operations

### 7.2 Test Structure
```
test/
├── unit/
├── integration/
├── e2e/
└── fixtures/
```

## 8. Implementation Phases
N/A

## 9. Configuration Management
```typescript
interface SemanticRepoConfig {
  storage: {
    basePath: string;
    maxFileSize: number;
    compression: boolean;
  };
  api: {
    port: number;
    cors: string[];
    rateLimit: {
      windowMs: number;
      max: number;
    };
  };
  workers: {
    enabled: boolean;
    concurrency: number;
    retryAttempts: number;
  };
  cache: {
    ttl: number;
    maxSize: number;
    evictionPolicy: 'lru' | 'fifo';
  };
}
```

This comprehensive plan provides a solid foundation for implementing the semantic-repo CRUD and management API with clear interfaces, modular architecture, and comprehensive testing coverage.