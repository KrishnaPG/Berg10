import { api, APIError } from "encore.dev/api";
import { QueryRequest, QueryResult } from "./types";
import { queryExecutor } from "./query-executor";
import { SQLErrorHandler } from "./error-handler";

// Executes a SQL query and returns results.
export const execute = api<QueryRequest, QueryResult>(
  { method: "POST", path: "/sql/execute", expose: true },
  async (request) => {
    try {
      if (!request.query || request.query.trim().length === 0) {
        throw APIError.invalidArgument("Query cannot be empty");
      }

      const result = await queryExecutor.executeQuery(request);
      return result;
    } catch (error: any) {
      if (error.executionTimeMs !== undefined) {
        // This is our enhanced error with metadata
        const errorInfo = SQLErrorHandler.parseError(error.message);
        const enhancedError = {
          message: errorInfo.userFriendlyMessage,
          category: errorInfo.category,
          suggestions: errorInfo.suggestions,
          isRetryable: errorInfo.isRetryable,
          attemptCount: error.attemptCount || 1,
          executionTimeMs: error.executionTimeMs
        };
        throw APIError.invalidArgument(JSON.stringify(enhancedError));
      }
      throw APIError.internal("Query execution failed", error);
    }
  }
);
