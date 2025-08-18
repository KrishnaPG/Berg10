# Semantic Entity Type System Enhancement Plan

## Overview
This document outlines the comprehensive plan for enhancing the semantic entity type system as specified in Story 1.2, ensuring data integrity and improved developer experience.

## Current State Analysis

### Existing Implementation
- **Interface**: Basic `ISemanticEntity` with `id`, `sourceRefs`, and `metadata`
- **Validation**: Basic validation for UUID, repository format, and required fields
- **Connector Types**: Limited to "lakefs" and "git"
- **Testing**: Minimal test coverage

### Gaps Identified
1. Missing timestamp fields (`createdAt`, `updatedAt`)
2. Missing version field for entity versioning
3. Limited connector type support (missing "s3" and "local")
4. Insufficient validation rules for different connector types
5. Lack of comprehensive error handling
6. Missing utility functions for entity creation
7. Incomplete test coverage

## Enhanced Architecture Design

### 1. Enhanced Type Definitions

#### Core Entity Interface
```typescript
interface ISemanticEntity {
  id: string; // UUID v4 format (validated)
  sourceRefs: ISourceReference[];
  metadata: Record<string, any>;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  version: string; // Semantic versioning (semver)
}
```

#### Enhanced Source Reference
```typescript
type ConnectorType = "lakefs" | "git" | "s3" | "local";

interface ISourceReference {
  connectorType: ConnectorType;
  repository: string; // Format varies by connector type
  ref: string; // Git ref, S3 version, or "latest"
  path: string; // File path with connector-specific validation
  metadata?: Record<string, any>;
}
```

### 2. Validation Architecture

#### Validation Rules by Connector Type

**Git Connector**:
- Repository: Valid Git URL or local path
- Ref: Branch name, tag, or commit hash
- Path: Relative path within repository

**LakeFS Connector**:
- Repository: LakeFS repository name format
- Ref: Branch name or commit ID
- Path: Valid LakeFS path

**S3 Connector**:
- Repository: Valid S3 bucket name (DNS-compliant)
- Ref: S3 object version ID or "latest"
- Path: Valid S3 key format

**Local Connector**:
- Repository: Absolute or relative directory path
- Ref: Always "latest"
- Path: Valid file system path

#### Validation Functions
- `validateSemanticEntity()`: Comprehensive entity validation
- `validateSourceReference()`: Connector-specific validation
- `isValidSemanticEntity()`: Type guard for runtime checking
- `isValidSourceReference()`: Type guard for source references

### 3. File Structure Enhancement

```
packages/shared/
├── types/
│   ├── semantic-entity.types.ts (enhanced)
│   ├── semantic-entity.validation.ts (enhanced)
│   └── source-reference.types.ts (new)
├── utils/
│   ├── entity-validation.ts (enhanced)
│   ├── entity-creation.ts (new)
│   └── timestamp-utils.ts (new)
├── constants/
│   └── validation-patterns.ts (new)
└── schemas/
    └── entity-metadata.schema.json (new)

test/shared/
├── semantic-entity.enhanced.test.ts (new)
├── semantic-entity.validation.test.ts (new)
├── source-reference.validation.test.ts (new)
└── fixtures/
    ├── valid-entities.ts (new)
    └── invalid-entities.ts (new)
```

### 4. Backward Compatibility Strategy
No need for backward compatibility. Overwrite the types as needed.

### 5. Testing Strategy

#### Unit Tests
- Validation function tests for each field
- Connector-specific validation tests
- Type guard function tests
- Edge case handling tests

#### Integration Tests
- Entity creation workflow tests
- Validation pipeline tests
- Error handling tests

#### Performance Tests
- Validation performance on large datasets
- Memory usage tests for entity creation

### 6. Documentation Plan

#### API Documentation
- Complete interface documentation
- Usage examples for each connector type
- Migration guide from v1 to v2
- Best practices guide

#### Code Examples
- Entity creation examples
- Validation usage patterns
- Error handling examples
- Connector-specific implementations

### 7. Implementation Phases

#### Phase 1: Core Enhancement
1. Enhance `ISemanticEntity` interface with new fields
2. Extend connector types to include "s3" and "local"
3. Update validation rules for new fields

#### Phase 2: Validation Enhancement
1. Implement comprehensive validation functions
2. Add detailed error messages
3. Create type guards with enhanced checking

#### Phase 3: Utility Functions
1. Entity creation helpers
2. Validation utilities
3. Timestamp handling utilities

#### Phase 4: Testing & Documentation
1. Comprehensive test suite
2. Usage examples and documentation
3. Migration guide

### 8. Risk Mitigation

#### Risks Identified
1. **Breaking Changes**: New required fields might break existing code
2. **Performance Impact**: Enhanced validation might slow down entity creation
3. **Complexity**: Multiple connector types increase complexity

#### Mitigation Strategies
1. **Backward Compatibility**: Make new fields optional initially
2. **Performance Testing**: Benchmark validation functions
3. **Clear Documentation**: Provide migration guides and examples

### 9. Success Criteria

#### Functional Requirements
- [ ] All story acceptance criteria are met
- [ ] Backward compatibility is maintained
- [ ] Comprehensive test coverage (>90%)
- [ ] Clear documentation with examples

#### Non-Functional Requirements
- [ ] Validation performance within acceptable limits
- [ ] Memory usage remains efficient
- [ ] Error messages are clear and actionable
- [ ] Code follows established patterns and conventions

## Next Steps

1. **Switch to Code Mode**: Implement the TypeScript files
2. **Create Test Files**: Comprehensive test suite
3. **Documentation**: Create usage examples and migration guide
4. **Integration**: Ensure compatibility with existing codebase