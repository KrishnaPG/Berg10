# Deployment Architecture

The system is designed for two primary deployment targets, corresponding to the Local and Enterprise security modes.

## Local Deployment

-   **Target:** Standalone, single-file executable.
-   **Mechanism:** Utilizes Bun's native build capabilities (`bun build`) to package the entire application into a single binary for a specific platform (Linux, macOS, Windows).
-   **Requirements:** No external dependencies like Docker are required. The user can run the binary directly.
-   **Configuration:** Reads configuration from local files (e.g., `.env`, `group-config.json`).

## Enterprise Deployment

-   **Target:** OCI-compliant container image (Docker).
-   **Mechanism:** A `Dockerfile` will be provided to build a container image containing the application and its runtime dependencies. This image can be deployed to any container orchestrator like Kubernetes or a managed container service.
-   **Configuration:** Managed via environment variables, allowing for secure and flexible configuration in orchestrated environments.
-   **Infrastructure as Code:** A `docker-compose.yaml` file will be provided for easy local testing of the containerized setup.
