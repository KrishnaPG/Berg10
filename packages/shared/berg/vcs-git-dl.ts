import { type BaseQueryExecutor, ensureTables } from "@shared/ducklake";
import type { TDuckLakeDBName, TDuckLakeRootPath, TFsVcsDotDBPath, TSQLString } from "@shared/types";

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
    lakeDBName: TDuckLakeDBName = "gitDL" as TDuckLakeDBName,
  ): Promise<FsVcsGitDL> {
    return ensureTables(
      rootPath as TDuckLakeRootPath,
      lakeDBName,
      `
      CREATE OR REPLACE VIEW commits AS
        SELECT * FROM read_parquet('commits/*.parquet');
  
      CREATE OR REPLACE VIEW trees AS
        SELECT * FROM read_parquet('trees/*.parquet');
  
      CREATE OR REPLACE VIEW blobs AS
        SELECT * FROM read_parquet('blobs/*.parquet');
  
      CREATE OR REPLACE VIEW pack_index AS
        SELECT * FROM read_parquet('pack-index/*.parquet');
  
      -- optional: helper view for commit_parents
      CREATE OR REPLACE VIEW commit_parents AS
        SELECT sha AS commit_sha, unnest(parent_shas) AS parent_sha, ordinality-1 AS idx
        FROM commits;
      ` as TSQLString,
    ).then(({ db }) => new FsVcsGitDL(db));
  }

  /* -------------------------------------------------- commits */
  log(opt: { max?: number; author?: string; since?: Date } = {}) {
    const { max = 100, author, since } = opt;
    return this.q.query`
      SELECT sha, message, author_name, author_time
      FROM   commits
      WHERE  ${author ? `author_name LIKE ${"%" + author + "%"}` : "TRUE"}
        AND  ${since ? `author_time >= ${since}` : "TRUE"}
      ORDER  BY author_time DESC
      LIMIT  ${max}`;
  }

  async commit(sha: string) {
    return this.q.queryRow`SELECT * FROM commits WHERE sha = ${sha}`;
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
