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

// Panel sizes for react-resizable-panels - optimized tuple type for performance
export type PanelSizes = readonly [number, number]; // [topPanelSize, bottomPanelSize]

export interface Tab {
  id: string;
  title: string;
  query: string;
  result: QueryResult | null;
  error: string | null;
  isLoading: boolean;
  lastExecuted: Date | null;
  executionStartTime?: Date; // When the current query execution started
  queryId?: string; // Links to backend query entry
  currentVersionNumber?: number; // Current version being displayed
  panelSizes?: PanelSizes; // Panel dimensions for react-resizable-panels
}