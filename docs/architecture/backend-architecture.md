# Backend Architecture

## Service Architecture
Based on the modular monolith approach defined in the PRD and elaborated above.

## Database Architecture
The primary persistent storage is the `semantic-repo`, managed as a structured directory layout on a filesystem, versioned with Git. Index blobs are stored immutably by content hash.

For the Vector Database (Qdrant/Milvus):
*   **Schema Design:** Collections could be created per `SemanticGroup` or use a shared schema with a `group_name` field for filtering.
*   **Data Access Layer:** Managed through the Vector DB client library integrated into the Core Engine's Indexing and Search modules.

## Authentication and Authorization

The system supports two distinct, configurable security modes to cater to different usage scenarios: Local Mode and Enterprise Mode. The mode is determined by the system's configuration.

### Local Mode (Default)

This mode is designed for individual users running the system on their local machine for personal or development purposes.

-   **Security Mechanism:** The API server binds to `localhost` by default. This provides inherent security for single-user, local instances, as the API is not exposed to the network.
-   **Authentication:** No authentication (e.g., API keys, tokens) is required. This ensures a frictionless, "zero-config" user experience.
-   **Deployment:** This mode is intended for standalone executable deployments created with Bun, requiring no Docker or other containerization frameworks.

### Enterprise Mode

This mode is designed for team or organizational use, typically in a shared, networked environment (cloud or on-premises).

-   **Security Mechanism:** The API server binds to a network-accessible interface (e.g., `0.0.0.0`) within its container.
-   **Authentication:** Authentication is mandatory and pluggable. The primary recommended mechanism is integration with an external Identity Provider (IdP) via **LDAP**.
-   **Authorization:** The system uses an Attribute-Based Access Control (ABAC) model, implemented with **Casbin**. This allows for fine-grained permission policies.
-   **Policy Granularity:** The architecture must support two distinct Casbin ABAC policies to meet enterprise needs:
    1.  **Configuration Access Policy:** Governs read/write access to the `semantic-repo` configurations. This allows teams (e.g., Finance) to manage their own semantic overlays privately.
    2.  **Knowledge Access Policy:** Governs access to the AI-indexed search results. This policy can be more permissive, allowing broader access to the derived knowledge (e.g., enabling a CEO to query results from the Finance index, even without access to the underlying configuration).
