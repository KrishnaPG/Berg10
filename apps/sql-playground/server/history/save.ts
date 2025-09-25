import { api } from "encore.dev/api";
import { SaveQueryVersionRequest, SaveQueryVersionResponse } from "./types";
import db from "../db";

// Saves a query execution to history.
export const save = api<SaveQueryVersionRequest, SaveQueryVersionResponse>(
  { method: "POST", path: "/history/save", expose: true },
  async (request) => {
    let queryId = request.queryId;
    
    // If no queryId provided, create a new query entry
    if (!queryId) {
      const newQuery = await db.queryRow<{ id: string }>`
        INSERT INTO queries (title, user_id) 
        VALUES (NULL, ${request.userId || null})
        RETURNING id
      `;
      
      if (!newQuery) {
        throw new Error("Failed to create new query");
      }
      
      queryId = newQuery.id;
    } else {
      // Check for duplicate queries in the last 5 versions
      const recentVersions = await db.rawQueryAll(`
        SELECT id, query_text, version_number, status, execution_time_ms, row_count, error_message
        FROM query_versions 
        WHERE query_id = $1 
        ORDER BY version_number DESC 
        LIMIT 5
      `, queryId);

      // Look for exact match in recent versions
      const duplicateVersion = recentVersions.find((v: any) => 
        v.query_text.trim() === request.queryText.trim()
      );

      if (duplicateVersion) {
        // Return the existing version instead of creating a new one
        return {
          queryId,
          versionId: duplicateVersion.id,
          versionNumber: duplicateVersion.version_number,
          isDuplicate: true,
        };
      }
    }

    // Get the next version number for this query
    const versionCountResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM query_versions WHERE query_id = ${queryId}
    `;
    
    const nextVersionNumber = (versionCountResult?.count || 0) + 1;

    // Insert the new version
    const result = await db.queryRow<{ id: string }>`
      INSERT INTO query_versions (
        query_id,
        query_text, 
        execution_time_ms, 
        row_count, 
        status, 
        error_message,
        version_number
      ) VALUES (
        ${queryId},
        ${request.queryText},
        ${request.executionTimeMs || null},
        ${request.rowCount || null},
        ${request.status},
        ${request.errorMessage || null},
        ${nextVersionNumber}
      )
      RETURNING id
    `;

    if (!result) {
      throw new Error("Failed to save query version");
    }

    return {
      queryId,
      versionId: result.id,
      versionNumber: nextVersionNumber,
      isDuplicate: false,
    };
  }
);