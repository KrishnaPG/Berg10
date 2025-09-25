import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { QueryHistoryResponse, QueryEntry, QueryVersion } from "./types";
import db from "../db";

interface ListHistoryRequest {
  limit?: Query<number>;
  offset?: Query<number>;
  userId?: Query<string>;
}

// Retrieves query history with pagination.
export const list = api(
  { method: "GET", path: "/history", expose: true },
  async (request: ListHistoryRequest): Promise<QueryHistoryResponse> => {
    const limit = request.limit || 50;
    const offset = request.offset || 0;
    const userId = request.userId;

    // Get queries with their latest version
    let query = `
      SELECT 
        q.id,
        q.title,
        q.created_at,
        q.updated_at,
        q.user_id,
        qv.id as latest_version_id,
        qv.query_text as latest_query_text,
        qv.executed_at as latest_executed_at,
        qv.execution_time_ms as latest_execution_time_ms,
        qv.row_count as latest_row_count,
        qv.status as latest_status,
        qv.error_message as latest_error_message,
        qv.version_number as latest_version_number,
        qv.created_at as latest_version_created_at,
        (SELECT COUNT(*) FROM query_versions qv2 WHERE qv2.query_id = q.id) as version_count
      FROM queries q
      JOIN query_versions qv ON qv.query_id = q.id
      WHERE qv.version_number = (
        SELECT MAX(version_number) 
        FROM query_versions qv2 
        WHERE qv2.query_id = q.id
      )
    `;
    
    let params: any[] = [];
    let paramIndex = 1;
    
    if (userId) {
      query += ` AND q.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }
    
    query += ` ORDER BY q.updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const queryResults = await db.rawQueryAll(query, ...params);

    // Get version count for each query and their versions
    const queryEntries: QueryEntry[] = [];
    
    for (const row of queryResults) {
      // Get all versions for this query
      const versions = await db.rawQueryAll(`
        SELECT 
          id,
          query_id,
          query_text,
          executed_at,
          execution_time_ms,
          row_count,
          status,
          error_message,
          version_number,
          created_at
        FROM query_versions 
        WHERE query_id = $1 
        ORDER BY version_number ASC
      `, row.id);

      const queryVersions: QueryVersion[] = versions.map((v: any) => ({
        id: v.id,
        queryId: v.query_id,
        queryText: v.query_text,
        executedAt: v.executed_at,
        executionTimeMs: v.execution_time_ms,
        rowCount: v.row_count,
        status: v.status,
        errorMessage: v.error_message,
        versionNumber: v.version_number,
        createdAt: v.created_at,
      }));

      const latestVersion: QueryVersion = {
        id: row.latest_version_id,
        queryId: row.id,
        queryText: row.latest_query_text,
        executedAt: row.latest_executed_at,
        executionTimeMs: row.latest_execution_time_ms,
        rowCount: row.latest_row_count,
        status: row.latest_status,
        errorMessage: row.latest_error_message,
        versionNumber: row.latest_version_number,
        createdAt: row.latest_version_created_at,
      };

      queryEntries.push({
        id: row.id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userId: row.user_id,
        versions: queryVersions,
        latestVersion,
      });
    }

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM queries';
    let countParams: any[] = [];
    if (userId) {
      countQuery += ' WHERE user_id = $1';
      countParams.push(userId);
    }
    
    const totalResult = await db.rawQueryRow(countQuery, ...countParams);

    return {
      queries: queryEntries,
      total: totalResult?.total || 0,
    };
  }
);