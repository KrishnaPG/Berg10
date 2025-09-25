import { api } from "encore.dev/api";
import { GetQueryVersionsRequest, GetQueryVersionsResponse, QueryVersion } from "./types";
import db from "../db";

// Gets all versions for a specific query.
export const getVersions = api<GetQueryVersionsRequest, GetQueryVersionsResponse>(
  { method: "GET", path: "/history/:queryId/versions", expose: true },
  async (request) => {
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
    `, request.queryId);

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

    return {
      versions: queryVersions,
    };
  }
);