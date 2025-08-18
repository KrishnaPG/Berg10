# Epic 1: Foundation & Core Infrastructure

## Goal

Establish the foundational project structure, core data models, and basic storage layout. Deliver the ability to define and list semantic groups via the `berg10` CLI, laying the groundwork for all subsequent functionality. This epic sets up the essential infrastructure for managing group configurations and the `semantic-repo`.

## Story 1.1: Define Semantic Group Data Model

As a Developer,
I want a clear and structured data model for Semantic Groups,
so that the system can consistently parse, store, and use group configurations.

#### Acceptance Criteria

1.  Define the structure for a `SemanticGroup` configuration (likely `config.json`), including fields for `name`, `filter` (initially just regex string), `versionPolicy` (initially just `latest`), and `indexing` (placeholder for future details).
2.  Define the structure for a `SemanticEntity`, including a unique identifier and a reference to its source file(s).
3.  Document the data model in a readily accessible format (e.g., a markdown file or code comments).

## Story 1.2: Implement `semantic-repo` Storage Layout

As a System,
I want a structured and versioned layout for storing Semantic Group configurations and index metadata,
so that data is organized, persistent, and manageable.

#### Acceptance Criteria

1.  Implement the core `semantic-repo` directory structure: `.semantic/version`, `.semantic/index/sha256/`, `groups/<group_name>/config.json`.
2.  Implement logic to initialize a new `semantic-repo` directory with the correct structure and initial version file.
3.  Implement logic to read and write `config.json` files for groups within the `groups/` directory.

## Story 1.3: Create `berg10` CLI Tool Skeleton

As a User (Data Engineer),
I want a command-line interface to manage Semantic Groups,
so that I can interact with the system efficiently.

#### Acceptance Criteria

1.  Create a basic CLI tool executable named `berg10`.
2.  Implement a basic command structure (e.g., `berg10 group apply <file>`, `berg10 group list`).
3.  Add basic help output (`berg10 --help`).

## Story 1.4: Implement `berg10 group apply` Command

As a User,
I want to apply a Semantic Group configuration file,
so that the group is defined and stored in the `semantic-repo`.

#### Acceptance Criteria

1.  The `berg10 group apply <config-file>` command SHALL read the specified configuration file.
2.  The command SHALL validate the configuration file against the defined `SemanticGroup` data model.
3.  The command SHALL store the validated configuration in the `semantic-repo` under `groups/<group_name>/config.json`.
4.  The command SHALL provide success/error feedback to the user.

## Story 1.5: Implement `berg10 group list` Command

As a User,
I want to list all defined Semantic Groups,
so that I can see what groups are currently configured.

#### Acceptance Criteria

1.  The `berg10 group list` command SHALL scan the `semantic-repo` `groups/` directory.
2.  The command SHALL list the names of all found Semantic Groups.
3.  The command SHALL display the list to the user in a clear format.
