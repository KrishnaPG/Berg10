/**
 * Represents a logical unit of content derived from source files based on grouping rules.
 */
export interface ISemanticEntity {
  /** A canonical, stable identifier for the entity across versions. */
  id: string;
  /** An array of references to the source files that constitute this entity. */
  sourceRefs: Array<{
    /** The type of the source connector (e.g., "lakefs", "git"). */
    connectorType: "lakefs" | "git";
    /** The repository URL or identifier. */
    repository: string;
    /** The specific version reference (e.g., commit hash, tag, branch name). */
    ref: string;
    /** The path to the file within the repository. */
    path: string;
  }>;
  /** A flexible key-value store for any metadata extracted from the source. */
  metadata: Record<string, any>;
}
