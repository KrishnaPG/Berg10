export interface QueryVersion {
  id: string;
  queryId: string;
  queryText: string;
  executedAt: Date;
  executionTimeMs: number | null;
  rowCount: number | null;
  status: 'success' | 'error';
  errorMessage: string | null;
  versionNumber: number;
  createdAt: Date;
}

export interface QueryEntry {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  versions: QueryVersion[];
  latestVersion?: QueryVersion;
}

export interface SaveQueryVersionRequest {
  queryId?: string; // If not provided, creates a new query entry
  queryText: string;
  executionTimeMs?: number;
  rowCount?: number;
  status: 'success' | 'error';
  errorMessage?: string;
  userId?: string;
}

export interface SaveQueryVersionResponse {
  queryId: string;
  versionId: string;
  versionNumber: number;
  isDuplicate?: boolean;
}

export interface QueryHistoryResponse {
  queries: QueryEntry[];
  total: number;
}

export interface GetQueryVersionsRequest {
  queryId: string;
}

export interface GetQueryVersionsResponse {
  versions: QueryVersion[];
}

// Legacy type for backward compatibility
export interface QueryHistoryEntry extends QueryVersion {
  // For backward compatibility
}