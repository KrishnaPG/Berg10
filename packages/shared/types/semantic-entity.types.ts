/**
 * Represents a logical unit of content derived from source files based on grouping rules.
 */

/**
 * Supported connector types for source references
 * Extended to include "s3" and "local" per story 1.2 requirements
 */
export type ConnectorType = "lakefs" | "git" | "s3" | "local";

/**
 * Represents a reference to a source file/location with enhanced validation
 */
export interface ISourceReference {
  /** The type of the source connector */
  connectorType: ConnectorType;
  
  /** The repository identifier (format varies by connector type) */
  repository: string;
  
  /** The specific version reference */
  ref: string;
  
  /** The path to the file/object within the repository/bucket */
  path: string;
  
  /** Optional metadata for the source reference */
  metadata?: Record<string, any>;
}

/**
 * Git-specific source reference interface
 */
export interface IGitSourceReference extends ISourceReference {
  connectorType: "git";
  repository: string; // Git repository URL or path
  ref: string; // Branch, tag, or commit hash
  path: string; // Relative path within repository
}

/**
 * LakeFS-specific source reference interface
 */
export interface ILakeFSSourceReference extends ISourceReference {
  connectorType: "lakefs";
  repository: string; // LakeFS repository name
  ref: string; // Branch or commit ID
  path: string; // Path within LakeFS repository
}

/**
 * S3-specific source reference interface
 */
export interface IS3SourceReference extends ISourceReference {
  connectorType: "s3";
  repository: string; // S3 bucket name
  ref: string; // S3 object version ID or "latest"
  path: string; // S3 key (path within bucket)
}

/**
 * Local file system source reference interface
 */
export interface ILocalSourceReference extends ISourceReference {
  connectorType: "local";
  repository: string; // Local directory path
  ref: string; // Always "latest" for local files
  path: string; // Relative path within repository directory
}

/**
 * Enhanced semantic entity interface with additional fields
 * as specified in Story 1.2
 */
export interface ISemanticEntity {
  /** A canonical, stable identifier for the entity across versions (UUID v4 format) */
  id: string;
  
  /** An array of references to the source files that constitute this entity */
  sourceRefs: ISourceReference[];
  
  /** A flexible key-value store for any metadata extracted from the source */
  metadata: Record<string, any>;
  
  /** ISO 8601 timestamp when the entity was created */
  createdAt: string;
  
  /** ISO 8601 timestamp when the entity was last updated */
  updatedAt: string;
  
  /** Semantic versioning string (e.g., "1.0.0") */
  version: string;
}

/**
 * Configuration for entity creation
 */
export interface EntityCreationConfig {
  id?: string;
  sourceRefs: ISourceReference[];
  metadata?: Record<string, any>;
  version?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
