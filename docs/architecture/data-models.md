# Data Models

*(To be elaborated in detail based on `config.json` structure and `SemanticEntity` definition)*

## SemanticGroup
**Purpose:** Represents a user-defined semantic grouping of content.

Refer to [sample](../group-config-sample.json);

**Key Attributes:**
- `name`: `string` - Unique identifier for the group.
- `filter`: `object` - Defines criteria for selecting source files (e.g., `{ type: "regex", pattern: ".*\\.md$" }`).
- `versionPolicy`: `object` - Specifies which version(s) of source data to consider (e.g., `{ type: "latest" }`, `{ type: "tag", value: "v1.0" }`).
- `grouping`: `object` - Defines how source files map to Semantic Entities.
- `lanes[].embedder`: `object` - Configuration for AI indexing (e.g., `{ model: "sentence-transformers/all-MiniLM-L6-v2", chunk: {...} }`).
- `lanes[].retention`: `object` - Rules for retaining index versions (e.g., `{ type: "keepLast", count: 5 }`).

Notes:
- `versionPolicy` chooses which file versions enter the group; `retention.policy` chooses how long the index versions stick around.

## SemanticEntity
**Purpose:** Represents a logical unit of content derived from source files based on grouping rules.

**Key Attributes:**
- `id`: `string` - Unique identifier for the entity (e.g., hash of source path + version).
- `sourceRefs`: `array` - References to one or more source files/objects that constitute this entity.
- `metadata`: `object` - Extracted metadata from the source (filename, size, timestamps).

### Relationships
- Belongs to one `SemanticGroup`.
- Can have multiple associated index records in `manifest.jsonl`.
