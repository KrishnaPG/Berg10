import { api } from "encore.dev/api";
import { queryExecutor } from "./query-executor";

interface SchemaResponse {
  tables: string[];
  schema: Record<string, Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>>;
}

// Returns the database schema information.
export const getSchema = api<void, SchemaResponse>(
  { method: "GET", path: "/sql/schema", expose: true },
  async () => {
    return await queryExecutor.getTableInfo();
  }
);
