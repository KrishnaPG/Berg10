/**
 * Semantic Entity Validation Module
 * Enhanced validation utilities and type guards for semantic entities
 * as specified in Story 1.2
 */

import type { ISemanticEntity, ISourceReference } from './semantic-entity.types';

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

/**
 * Validates a semantic entity
 * @param entity - The entity to validate
 * @returns Validation result
 */
export function validateSemanticEntity(
  entity: Partial<ISemanticEntity>
): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate ID
  if (!entity.id) {
    errors.push({ field: "id", message: "Entity ID is required" });
  } else if (!isValidUUID(entity.id)) {
    errors.push({
      field: "id",
      message: "Entity ID must be a valid UUID v4",
      value: entity.id,
    });
  }

  // Validate source references
  if (!entity.sourceRefs || entity.sourceRefs.length === 0) {
    errors.push({
      field: "sourceRefs",
      message: "At least one source reference is required",
    });
  } else {
    entity.sourceRefs.forEach((ref, index) => {
      const refValidation = validateSourceReference(ref);
      if (!refValidation.isValid) {
        refValidation.errors.forEach((error) => {
          errors.push({
            field: `sourceRefs[${index}].${error.field}`,
            message: error.message,
            value: error.value,
          });
        });
      }
    });
  }

  // Validate metadata
  if (entity.metadata && typeof entity.metadata !== "object") {
    errors.push({
      field: "metadata",
      message: "Metadata must be an object",
      value: entity.metadata,
    });
  }

  // Validate timestamps
  if (entity.createdAt && !isValidISO8601(entity.createdAt)) {
    errors.push({
      field: "createdAt",
      message: "Created at must be a valid ISO 8601 timestamp",
      value: entity.createdAt,
    });
  }

  if (entity.updatedAt && !isValidISO8601(entity.updatedAt)) {
    errors.push({
      field: "updatedAt",
      message: "Updated at must be a valid ISO 8601 timestamp",
      value: entity.updatedAt,
    });
  }

  // Validate version
  if (entity.version && !isValidSemver(entity.version)) {
    errors.push({
      field: "version",
      message: "Version must be a valid semantic version (e.g., 1.0.0)",
      value: entity.version,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a source reference
 * @param reference - The source reference to validate
 * @returns Validation result
 */
export function validateSourceReference(
  reference: Partial<ISourceReference>
): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate connector type
  const validConnectorTypes = ["lakefs", "git", "s3", "local"];
  if (!reference.connectorType) {
    errors.push({
      field: "connectorType",
      message: "Connector type is required",
    });
  } else if (!validConnectorTypes.includes(reference.connectorType)) {
    errors.push({
      field: "connectorType",
      message: `Connector type must be one of: ${validConnectorTypes.join(", ")}`,
      value: reference.connectorType,
    });
  }

  // Validate repository
  if (!reference.repository) {
    errors.push({ field: "repository", message: "Repository is required" });
  } else if (!isValidRepositoryName(reference.repository)) {
    errors.push({
      field: "repository",
      message: "Repository name must be valid (alphanumeric, hyphens, underscores, max 100 chars)",
      value: reference.repository,
    });
  }

  // Validate ref
  if (!reference.ref) {
    errors.push({ field: "ref", message: "Reference is required" });
  } else if (!isValidRef(reference.ref)) {
    errors.push({
      field: "ref",
      message: "Reference must be valid (branch, tag, or commit hash)",
      value: reference.ref,
    });
  }

  // Validate path
  if (!reference.path) {
    errors.push({ field: "path", message: "Path is required" });
  } else if (!isValidPath(reference.path)) {
    errors.push({
      field: "path",
      message: "Path must be valid (relative path format)",
      value: reference.path,
    });
  }

  // Validate metadata
  if (reference.metadata && typeof reference.metadata !== "object") {
    errors.push({
      field: "metadata",
      message: "Metadata must be an object",
      value: reference.metadata,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Type guard for semantic entity
 * @param obj - Object to check
 * @returns True if object is a valid semantic entity
 */
export function isValidSemanticEntity(obj: any): obj is ISemanticEntity {
  const validation = validateSemanticEntity(obj);
  return validation.isValid;
}

/**
 * Type guard for source reference
 * @param obj - Object to check
 * @returns True if object is a valid source reference
 */
export function isValidSourceReference(obj: any): obj is ISourceReference {
  const validation = validateSourceReference(obj);
  return validation.isValid;
}

/**
 * Creates a new semantic entity with validation
 * @param config - Entity creation configuration
 * @returns Created semantic entity
 */
export function createSemanticEntity(config: {
  id?: string;
  sourceRefs: ISourceReference[];
  metadata?: Record<string, any>;
  version?: string;
}): ISemanticEntity {
  const entity: Partial<ISemanticEntity> = {
    id: config.id || generateUUID(),
    sourceRefs: config.sourceRefs,
    metadata: config.metadata || {},
    version: config.version || "1.0.0",
  };

  const validation = validateSemanticEntity(entity);
  if (!validation.isValid) {
    throw new Error(
      `Invalid entity: ${validation.errors.map((e) => e.message).join(", ")}`
    );
  }

  return entity as ISemanticEntity;
}

// Helper functions

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidRepositoryName(name: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(name);
}

function isValidRef(ref: string): boolean {
  return /^[a-zA-Z0-9/_-]+$/.test(ref) && ref.length <= 255;
}

function isValidPath(path: string): boolean {
  return /^[^/].*$/.test(path) && path.length <= 500;
}

function isValidISO8601(date: string): boolean {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  return isoRegex.test(date);
}

function isValidSemver(version: string): boolean {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  return semverRegex.test(version);
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
