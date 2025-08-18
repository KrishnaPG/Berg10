/**
 * Core types and interfaces for semantic-repo
 * Ultra high-performance implementation
 */

export interface ISemanticEntity {
  id: string;
  type: string;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
  checksum: string;
}

export interface ISemanticGroup {
  sha256: string;
  label: string;
  description?: string;
  filter: FilterExpression;
  versionPolicy: VersionPolicy;
  grouping: GroupingStrategy;
  lanes: LaneConfig[];
  metadata: Record<string, any>;
}

export interface FilterExpression {
  operator: 'AND' | 'OR' | 'NOT';
  operands: (FilterExpression | FilterCondition)[];
}

export interface FilterCondition {
  field: string;
  op: 'eq' | 'ne' | 'regex' | 'range';
  value: any;
  min?: any;
  max?: any;
}

export interface VersionPolicy {
  mode: 'latestOnBranch' | 'specificCommit';
  branch?: string;
  commit?: string;
}

export interface GroupingStrategy {
  strategy: 'composite' | 'per_file' | 'per_page';
  rules?: GroupingRule[];
}

export interface GroupingRule {
  match: Record<string, any>;
  strategy: 'per_file' | 'per_page';
  pageRange?: [number, number];
  entityNameTemplate: string;
}

export interface LaneConfig {
  id: string;
  displayName: string;
  embedder: EmbedderConfig;
  indexConfig: IndexConfig;
  tags: string[];
  visibility: VisibilityConfig;
  retention: RetentionConfig;
}

export interface EmbedderConfig {
  model: string;
  uri: string;
  digest: string;
  parameters: Record<string, any>;
  modality: 'text' | 'image' | 'audio' | 'video';
  postProcessing?: string[];
  tokenizerUri?: string;
  tokenizerDigest?: string;
}

export interface IndexConfig {
  chunkSize: number;
  unit?: 'tokens' | 'characters' | 'seconds';
  overlap: number;
  storeVectors: boolean;
  storeMetadata: boolean;
}

export interface VisibilityConfig {
  scope: 'public' | 'internal' | 'shared';
  teams?: string[];
}

export interface RetentionConfig {
  policy: 'keep_last_n' | 'expire_after';
  n?: number;
  maxAge: string;
}

export interface ILane {
  id: string;
  name: string;
  description?: string;
  groupId: string;
  entities: string[]; // entity IDs
  processingConfig: ILaneProcessingConfig;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastProcessedAt?: Date;
  status: LaneStatus;
}

export interface ILaneProcessingConfig {
  batchSize: number;
  concurrency: number;
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'exponential' | 'linear';
  };
  timeout: number;
}

export enum LaneStatus {
  ACTIVE = 'active',
  PROCESSING = 'processing',
  PAUSED = 'paused',
  ERROR = 'error',
  COMPLETED = 'completed'
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface CreateEntityDto {
  type: string;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface UpdateEntityDto {
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreateLaneDto {
  name: string;
  description?: string;
  groupId: string;
  processingConfig?: Partial<ILaneProcessingConfig>;
  metadata?: Record<string, any>;
}

export interface UpdateLaneDto {
  name?: string;
  description?: string;
  processingConfig?: Partial<ILaneProcessingConfig>;
  metadata?: Record<string, any>;
}

export interface EntityFilters {
  type?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface GroupFilters {
  name?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface LaneFilters {
  groupId?: string;
  status?: LaneStatus;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface ProcessingResult {
  success: boolean;
  processedCount: number;
  errors: string[];
  duration: number;
  timestamp: Date;
}

export interface SemanticRepoConfig {
  storage: {
    basePath: string;
    maxFileSize: number;
    compression: boolean;
    encryption?: boolean;
  };
  api: {
    port: number;
    host: string;
    cors: string[];
    rateLimit: {
      windowMs: number;
      max: number;
    };
  };
  workers: {
    enabled: boolean;
    concurrency: number;
    retryAttempts: number;
    queues: {
      cache: string;
      indexing: string;
      cleanup: string;
    };
  };
  cache: {
    ttl: number;
    maxSize: number;
    evictionPolicy: 'lru' | 'fifo';
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
}