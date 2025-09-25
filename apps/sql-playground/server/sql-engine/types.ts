export interface QueryRequest {
  query: string;
}

export interface QueryResult {
  columns: ColumnInfo[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface QueryError {
  message: string;
  code?: string;
  position?: number;
  category?: 'syntax' | 'runtime' | 'permission' | 'connection' | 'timeout' | 'unknown';
  suggestions?: string[];
  isRetryable?: boolean;
  attemptCount?: number;
}


