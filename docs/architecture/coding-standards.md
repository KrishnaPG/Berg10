# Coding Standards

To ensure code consistency, readability, and quality across the project, all contributions must adhere to the following standards.

-   **Tooling:** **Biomejs** will be used for all linting, formatting, and code analysis. A `biome.json` configuration file will be committed to the root of the repository.
-   **Formatting:** All code will be automatically formatted by Biomejs on save and as a pre-commit hook.
-   **Linting:** The Biomejs linter will be configured with a recommended ruleset to catch common errors and enforce best practices. No code with linting errors will be merged.
-   **Naming Conventions:**
    -   Interfaces: `PascalCase` prefixed with `I` (e.g., `interface ISemanticGroup`).
    -   Types: `PascalCase` prefixed with `T` (e.g., `type TGroup`)
    -   Classes: `PascalCase`.
    -   Functions/Variables: `camelCase`.
    -   Constants: `UPPER_SNAKE_CASE`.
-   **Modularity:** Code should be organized into small, focused modules with clear responsibilities.
