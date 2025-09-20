import path from "node:path";
import type { DuckDBTimestampTZValue } from "@duckdb/node-api";
import { type BaseQueryExecutor, ensureTables } from "@shared/ducklake";
import type {
  TDuckLakeDBName,
  TDuckLakeRootPath,
  TFsVcsDotDBPath,
  TName,
  TSecSinceEpoch,
  TSQLString,
} from "@shared/types";

export const gitDLTableNames = ["commits", "pack-index", "tree-entries", "blobs", "refs"] as const;
export type TGitDLTableName = (typeof gitDLTableNames)[number];

/** Providers DuckLake interface over the VCS git db content 
 * ```sh
    /lake-root (vcs/<repoId>.db/)
    ├─ commits/*.parquet
    ├─ pack-index/*.parquet
    ├─ trees/*.parquet
    ├─ blobs/*.parquet
    └─ refs/*.parquet
  ```
 * @example
  ```ts
    const git = await FsVcsGitDL.mount("~/.berg10/vcs/repoXYZ.db/");   // one call

    const head = await git.resolve("HEAD");
    console.log("HEAD =", head);

    // streaming, zero-copy, back-pressure out of the box
    for await (const c of git.log({ max: 50, author: "torvalds" })) {
      console.log(c.sha, c.message);
    }
    
    const files = await git.listFiles("HEAD");     // array of paths
    const parent = await git.parent("HEAD");       // single row or null  
  ```
*/
export class FsVcsGitDL {
  private constructor(private q: BaseQueryExecutor) {}

  /** Mounts a given vcs/<repoId>.db/ path as DuckLake DB */
  static async mount(
    rootPath: TFsVcsDotDBPath,
    lakeDBName: TDuckLakeDBName = "dl" as TDuckLakeDBName,
  ): Promise<FsVcsGitDL> {
    console.debug(`Mounting lake ['${lakeDBName}'] at: ${rootPath}`);
    return ensureTables(
      rootPath as TDuckLakeRootPath,
      lakeDBName,
      `
      CREATE TABLE IF NOT EXISTS runs (
        run_id       VARCHAR NOT NULL,
        created_at   TIMESTAMP WITH TIME ZONE,
        chain_name   VARCHAR NOT NULL,
        status       VARCHAR NOT NULL
      ) WITH (
          format = 'parquet'
        );

      CREATE TABLE IF NOT EXISTS steps (
        run_id      VARCHAR NOT NULL,
        step_idx    INTEGER NOT NULL,
        created_at  TIMESTAMP WITH TIME ZONE,
        input       VARCHAR,
        output      VARCHAR,
        error       VARCHAR
      ) WITH (
          format = 'parquet'
        );
       
      -- optional: helper view for commit_parents
      -- CREATE OR REPLACE VIEW commit_parents AS
      --   SELECT sha AS commit_sha, unnest(parent_shas) AS parent_sha, ordinality-1 AS idx
      --   FROM commits;
      ` as TSQLString,
    )
      .then(({ db }) => new FsVcsGitDL(db))
      .catch((error) => {
        throw new Error(`Failed to setup DataLake at "${rootPath}".\n\t${(error as Error).message}\n`);
      });
  }

  refreshView(rootPath: TFsVcsDotDBPath, viewName: TGitDLTableName) {
    console.debug(`Refreshing view: ${viewName}`);
    const src = path.join(rootPath, viewName, "**", "*.parquet");
    const sql = `CREATE OR REPLACE VIEW '${viewName}' AS SELECT * FROM read_parquet('${src}');`;
    return this.q.exec(sql).catch((ex) => console.error(`Failed to refresh view '${viewName}': ${ex.message}`));
  }

  checkIfViewExists(tableName: TGitDLTableName) {
    const sql = `SELECT view_name FROM duckdb_views WHERE view_name = '${tableName}';`;
    return this.q
      .queryRow(sql)
      .then(() => true)
      .catch((ex) => {
        console.warn(`checkIfTableExists('${tableName}') failed: ${ex.message}`);
        return false;
      });
  }

  /* -------------------------------------------------- commits */
  log(opt: { max?: number; author?: string; since?: Date } = {}) {
    const { max = 100, author, since } = opt;
    return this.q.query`
      SELECT sha, message, author_name, commit_time
      FROM   commits
      WHERE  ${author ? `author_name LIKE ${"%" + author + "%"}` : "TRUE"}
        AND  ${since ? `commit_time >= ${since}` : "TRUE"}
      ORDER  BY commit_time DESC
      LIMIT  ${max}`;
  }

  async commit(sha: string) {
    return this.q.queryRow`SELECT * FROM commits WHERE sha = ${sha}`;
  }

  async lastCommitTime(): Promise<TSecSinceEpoch|undefined> {
    return this.q.queryRow<{ t: DuckDBTimestampTZValue }>`SELECT max(commit_time) as t FROM commits`.then(
      (row) => row ? Number(row.t.micros / (1000n*1000n)) as TSecSinceEpoch: undefined,
    );
  }

  async parent(sha: string) {
    return this.q.queryRow`
      SELECT c.* FROM commits c
      JOIN commit_parents p ON c.sha = p.parent_sha
      WHERE p.commit_sha = ${sha}
      ORDER BY p.idx LIMIT 1`;
  }

  async children(sha: string) {
    return this.q.queryAll`
      SELECT c.* FROM commits c
      JOIN commit_parents p ON c.sha = p.commit_sha
      WHERE p.parent_sha = ${sha}`;
  }

  /* -------------------------------------------------- trees / files */
  async listFiles(sha: string) {
    return this.q.queryAll`
      SELECT t.path, t.mode, b.size
      FROM   tree_entries t
      JOIN   blobs        b ON t.blob_sha = b.sha
      WHERE  t.tree_sha = (
          SELECT tree_sha FROM commits WHERE sha = ${sha}
      )`;
  }

  /* -------------------------------------------------- pack index */
  async packIndex(sha: string) {
    return this.q.queryRow`SELECT * FROM pack_index WHERE object_sha = ${sha}`;
  }

  /* -------------------------------------------------- refs */
  async resolve(ref = "HEAD") {
    const r = await this.q.queryRow`
      SELECT commit_sha FROM refs WHERE name = ${ref}`;
    return r?.commit_sha ?? null;
  }
}
