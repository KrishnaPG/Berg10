import db from "../db";
import { QueryRequest, QueryResult, ColumnInfo, QueryError } from "./types";
import { SQLErrorHandler } from "./error-handler";

export class QueryExecutor {
  async executeQuery(request: QueryRequest, attemptCount: number = 1, maxRetries: number = 3): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // For safety, only allow SELECT statements in this demo
      const trimmedQuery = request.query.trim().toLowerCase();
      if (!trimmedQuery.startsWith('select')) {
        const errorInfo = SQLErrorHandler.parseError('Only SELECT statements are allowed in this playground');
        throw {
          message: errorInfo.userFriendlyMessage,
          category: errorInfo.category,
          suggestions: errorInfo.suggestions,
          isRetryable: false,
          attemptCount,
          executionTimeMs: Date.now() - startTime,
        } as QueryError & { executionTimeMs: number };
      }

      // Execute the query as-is using raw query since query is dynamic
      const rows = await db.rawQueryAll(request.query);
      
      // Extract column information from the first row
      const columns: ColumnInfo[] = [];
      if (rows.length > 0) {
        const firstRow = rows[0];
        for (const [key, value] of Object.entries(firstRow)) {
          columns.push({
            name: key,
            type: this.inferType(value),
            nullable: value === null,
          });
        }
      }

      const executionTimeMs = Date.now() - startTime;

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorInfo = SQLErrorHandler.parseError(errorMessage);
      
      // Check if we should retry
      if (errorInfo.isRetryable && attemptCount < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, errorInfo.retryDelay || 2000));
        
        // Recursive retry
        return this.executeQuery(request, attemptCount + 1, maxRetries);
      }
      
      throw {
        message: errorInfo.userFriendlyMessage,
        category: errorInfo.category,
        suggestions: errorInfo.suggestions,
        isRetryable: errorInfo.isRetryable,
        attemptCount,
        executionTimeMs,
      } as QueryError & { executionTimeMs: number };
    }
  }

  private inferType(value: any): string {
    if (value === null) return 'null';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'numeric';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'timestamp';
    return 'unknown';
  }

  async getTableInfo(): Promise<{ tables: string[]; schema: Record<string, ColumnInfo[]> }> {
    try {
      // Get table names
      const tablesResult = await db.queryAll`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      const tables = tablesResult.map(row => row.table_name);
      const schema: Record<string, ColumnInfo[]> = {};

      // Get column information for each table
      for (const tableName of tables) {
        const columnsResult = await db.rawQueryAll(`
          SELECT 
            column_name,
            data_type,
            is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
          ORDER BY ordinal_position
        `, tableName);

        schema[tableName] = columnsResult.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
        }));
      }

      return { tables, schema };
    } catch (error) {
      throw new Error(`Failed to get table info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const queryExecutor = new QueryExecutor();
