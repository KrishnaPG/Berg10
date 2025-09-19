import type { Branded, TChDbRootPath } from "@shared/types";
import { Session } from "chdb";
import path from "path";

export type TRunId = Branded<string, "ReliableRunId">;

export interface IChDbQueryResult {
  success: boolean;
  data?: string;
  error?: unknown;
}

class ChDb extends Session {
  safeQuery(sql: string, format?: string): IChDbQueryResult {
    try {
      const data = this.query(sql, format);
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  }

  getLastRecordedStep(runId: TRunId) {
    const sql = `select step_idx, status, input 
    from reliable.steps 
    where run_id=${runId} 
    order by step_idx DESC 
    LIMIT 1;`;
    return this.query(sql, "JSON");
  }
}

function ensureTables(db: ChDb) {
  db.query(`
    CREATE DATABASE IF NOT EXISTS reliable;

    CREATE TABLE IF NOT EXISTS reliable.runs
    (
      run_id          UUID,
      chain_name      LowCardinality(String),
      status          Enum8('PENDING' = 0, 'RUNNING' = 1, 'DONE' = 2, 'FAILED' = 3),
      input_hash      FixedString(32),      -- MD5 of canonical input JSON
      input_json      String,               -- original parameters (for humans)
      output_json     Nullable(String),
      created_at      DateTime64(3, 'UTC') DEFAULT now64(),
      modified_at     Nullable(DateTime64(3, 'UTC'))
    )
    ENGINE = MergeTree
    ORDER BY (chain_name, created_at)
    PARTITION BY toYYYYMM(created_at);
    
    CREATE TABLE IF NOT EXISTS reliable.steps
    (
      run_id          UUID,
      step_idx        UInt32,               -- 0-based, gap-free
      status          Enum8('PENDING' = 0, 'STARTED' = 1, 'DONE' = 2, 'FAILED' = 3),
      input           String,               -- file path or SQL or JSON
      output          Nullable(String),
      created_at      DateTime64(3, 'UTC') DEFAULT now64()
      modified_at     DateTime64(3, 'UTC') DEFAULT now64()
    )
    ENGINE = MergeTree
    ORDER BY (run_id, step_idx)
    PARTITION BY toYYYYMM(created_at);
  `);
}

export function init(rootPath: TChDbRootPath): ChDb {
  const db = new ChDb(path.resolve(rootPath, "reliable-runs"));
  ensureTables(db); // will throw on error
  return db;
}

export function cleanup(db: ChDb): void {
  //db.cleanup();
}

init("R:\\chdb" as TChDbRootPath);