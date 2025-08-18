# API Specification

The Berg10 system exposes two distinct APIs, each tailored for a specific purpose and audience, and protected by a different security policy.

## 1. Management API (GraphQL)

This API is for managing the `semantic-repo`, including the lifecycle of Semantic Groups and their configurations. It is the primary interface for administrative tools like the CLI and a future Admin UI.

-   **Protocol:** GraphQL. This is to support modern frontend frameworks like Refine.js that can consume GraphQL endpoints as a data provider.
-   **Audience:** Administrators, CLI tool, future Admin UI.
-   **Security:** Access is protected by the **Configuration Access Policy** ABAC (as defined in the Authentication and Authorization section).

### Sample GraphQL Schema

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

## 2. Search API (gRPC / REST / MCP)

This API is for querying the AI-indexed knowledge derived from the semantic groups. It is optimized for performance and consumption by AI agents and applications.

-   **Protocols:** gRPC (for high-performance internal or trusted communication), REST (for standard web compatibility), and a native MCP Server endpoint.
-   **Audience:** AI Agents, Applications, End-user services.
-   **Security:** Access is protected by the **Knowledge Access Policy** ABAC.

### REST Endpoint (Example)

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
