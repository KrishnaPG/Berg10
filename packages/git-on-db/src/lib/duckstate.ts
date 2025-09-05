import { join } from "node:path";
import type { DuckDBMaterializedResult } from "@duckdb/node-api";
import type { BaseQueryExecutor } from "@shared/ducklake";
import type { Checkpoint } from "./types";

export class DuckStateUpdater {
  constructor(private repo: string) {}
  append(db: BaseQueryExecutor, cp: Checkpoint): Promise<DuckDBMaterializedResult> {
    const file = join(this.repo, ".git_duck_sync/v2/_sync_state.parquet");
    return db.exec`
    CREATE TABLE IF NOT EXISTS _sync_state AS SELECT NULL::VARCHAR last_commit_sha, NULL::VARCHAR txn_id, NULL::BIGINT ts WHERE 1=0;
    ATTACH '${file}' as st (TYPE PARQUET);
    BEGIN;
    INSERT INTO st._sync_state VALUES ('${cp.lastCommitSha}', '${cp.txnId}', ${cp.ts});
    COMMIT;
  `;
  }
}
