# Testing Strategy

The project will adhere to a comprehensive testing strategy to ensure code quality, correctness, and reliability.

-   **Framework:** **Bun Test** (`bun:test`) will be the exclusive framework for all automated tests, including unit and integration tests.
-   **Unit Tests:**
    -   **Scope:** All core logic within the `/packages` directories, especially utility functions, data model transformations, and business logic in the `core` engine.
    -   **Requirement:** A minimum of **80% code coverage** is required for all new code in the `core` package.
-   **Integration Tests:**
    -   **Scope:** Test the interaction between internal modules (e.g., API layer calling the Core Engine) and between the system and external services (e.g., connectors, vector database).
    -   **Requirement:** Every API endpoint must have at least one happy-path integration test and one test for a common error case.
-   **End-to-End (E2E) Tests:**
    -   **Scope:** Full user workflows, such as `berg10 group apply` followed by a successful search query via the API.
    -   **Framework:** Playwright or a similar framework will be used.
