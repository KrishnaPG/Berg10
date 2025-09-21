import { unlink } from "node:fs/promises";
import path from "node:path";
import { ParquetSchema } from "@dsnp/parquetjs";
import type { DuckDBTimestampTZValue } from "@duckdb/node-api";
import { type BaseQueryExecutor, ensureTables, Row, TransactionalParquetWriter } from "@shared/ducklake";
import type { GitShell } from "@shared/git-shell";
import type {
  TDuckLakeDBName,
  TDuckLakeRootPath,
  TFileBaseName,
  TFilePath,
  TFolderPath,
  TFsVcsDbCommitBaseName,
  TFsVcsDbCommitsFolderPath,
  TFsVcsDbPIFolderPath,
  TFsVcsDbPIName,
  TFsVcsDotDBPath,
  TName,
  TSecSinceEpoch,
  TSQLString,
} from "@shared/types";
import type { TGitSHA } from "@shared/types/git-internal.types";
import { atomicFileRename, getRandomId } from "@shared/utils";

export const gitDLTableNames = ["commits", "pack-index", "tree-entries", "blobs", "refs"] as const;
export type TGitDLTableName = (typeof gitDLTableNames)[number];

export type TCsvDelim = `\t` | `,` | "\\|";

// NOTE: this has to match the interface `IdxFileLine` below
const idxFileLineSchema = new ParquetSchema({
  sha1: { type: "UTF8", encoding: "PLAIN", compression: "BROTLI" },
  type: { type: "UTF8", encoding: "PLAIN" }, // use RLE for repeating values in the column
  size: { type: "INT64", encoding: "PLAIN", compression: "BROTLI" },
  sizeInPack: { type: "INT64", encoding: "PLAIN", compression: "BROTLI" },
  offset: { type: "INT64", encoding: "PLAIN", compression: "BROTLI" },
  depth: { type: "INT64", optional: true },
  base: { type: "UTF8", encoding: "PLAIN", compression: "BROTLI", optional: true },
});

// NOTE: this interface has to match the groups of `idxFileLineRegEx` below
export interface IdxFileLine {
  sha: TGitSHA;
  type: "commit" | "tree" | "blob" | "tag";
  size: number;
  sizeInPack: number;
  offset: number;
  depth?: number;
  base?: TGitSHA;
  [key: string]: unknown; // to make it compatible with ParquetWriter.appendRow()
}
// The source of truth: comes from `git verify-pack -v` command output format
const idxFileLineRegEx =
  /^(?<sha>[0-9a-f]{40,64})\s+(?<type>commit|tree|blob|tag)\s+(?<size>\d+)\s+(?<sizeInPack>\d+)\s+(?<offset>\d+)(?:\s+(?<depth>\d+)\s+(?<base>[0-9a-f]{40,64}))?$/;

export interface IUnlistedCommit {
  sha: TGitSHA;
  tree: TGitSHA;
}

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
  private constructor(
    protected srcGitShell: GitShell, // source git shell command executor (on the original source repo, third-party files)
    protected q: BaseQueryExecutor, // the target db driver (duck lake)
  ) {}

  /** Mounts a given vcs/<repoId>.db/ path as DuckLake DB */
  static async mount(
    srcGitShell: GitShell,
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
      ) WITH (format = 'parquet');

      CREATE TABLE IF NOT EXISTS steps (
        run_id      VARCHAR NOT NULL,
        step_idx    INTEGER NOT NULL,
        created_at  TIMESTAMP WITH TIME ZONE,
        input       VARCHAR,
        output      VARCHAR,
        error       VARCHAR
      ) WITH (format = 'parquet');
       
      -- optional: helper view for commit_parents
      -- CREATE OR REPLACE VIEW commit_parents AS
      --   SELECT sha AS commit_sha, unnest(parent_shas) AS parent_sha, ordinality-1 AS idx
      --   FROM commits;
      ` as TSQLString,
    )
      .then(({ db }) => new FsVcsGitDL(srcGitShell, db))
      .catch((error) => {
        throw new Error(`Failed to setup DataLake at "${rootPath}".\n\t${(error as Error).message}\n`);
      });
  }

  refreshView(rootPath: TFsVcsDotDBPath, viewName: TGitDLTableName) {
    console.debug(`Refreshing view: ${viewName}`);
    const src = path.join(rootPath, viewName, "**", "*.parquet");
    const sql = `CREATE OR REPLACE VIEW '${viewName}' AS SELECT * FROM read_parquet('${src}');` as TSQLString;
    return this.q.exec(sql).catch((ex) => console.error(`Failed to refresh view '${viewName}': ${ex.message}`));
  }

  checkIfViewExists(tableName: TGitDLTableName) {
    const sql = `SELECT view_name FROM duckdb_views WHERE view_name = '${tableName}';` as TSQLString;
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

  async commit(sha: TGitSHA) {
    return this.q.queryRow`SELECT * FROM commits WHERE sha = ${sha}`;
  }

  async lastCommitTime(): Promise<TSecSinceEpoch | undefined> {
    return this.q.queryRow<{ t: DuckDBTimestampTZValue }>`SELECT max(commit_time) as t FROM commits`.then((row) =>
      row ? (Number(row.t.micros / (1000n * 1000n)) as TSecSinceEpoch) : undefined,
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

  /** returns the entries that are in `commits` table but not in `tree-entries` table */
  async *getUnlistedCommits(): AsyncGenerator<IUnlistedCommit[], void, unknown> {
    const tableExists = await this.checkIfViewExists("tree-entries");
    const sql = (tableExists ? "" : `select sha, tree from commits`) as TSQLString; //TODO: when table exists, do join of commits x tree-entries
    for await (const rowBatch of this.q.query<IUnlistedCommit>(sql)) yield rowBatch;
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

  /* -------------------------------------------------- helpers */

  /** converts the given csv-compatible file/content to parquet (using DuckDB)*/
  public csvToParquet(
    srcFilePath: TFilePath, // csv or compatible file path
    destFolder: TFolderPath,
    destFileBaseName: TFileBaseName,
    colProjection: TSQLString,
    csvDelim: TCsvDelim = "\t",
  ) {
    //const tmpFilePath = path.resolve(destFolder, `${getRandomId()}-par.tmp`) as TFilePath;
    const finalFilePath = path.resolve(destFolder, `${destFileBaseName}.parquet`) as TFilePath;
    const sql = `
      BEGIN TRANSACTION;
        COPY (
          WITH raw AS (
            SELECT regexp_split_to_array(line, '${csvDelim}') AS c
            FROM read_csv_auto(
                '${srcFilePath}',
                delim='\\0',
                columns={'line': 'VARCHAR'},
                header=false
            )
          )
          SELECT ${colProjection} FROM raw 
        ) TO '${finalFilePath}' (FORMAT PARQUET, COMPRESSION ZSTD);
      COMMIT;
    `;
    return this.q.run(sql); //.then(() => atomicFileRename(tmpFilePath, finalFilePath));
  }

  protected shellCsvToParquet(
    cmdArgs: string[],
    destFolder: TFolderPath,
    destFileBaseName: TFileBaseName,
    colProjection: TSQLString,
    csvDelimiter: TCsvDelim = `\\|`,
  ) {
    const tmpCSVFilePath = path.resolve(destFolder, `${getRandomId()}-csv.tmp`) as TFilePath;
    return this.srcGitShell.execToFile(cmdArgs, tmpCSVFilePath).then((bytesWritten: number) => {
      // if the output csv file was empty, no records to process
      if (!bytesWritten) {
        return console.debug(`shellCsvToParquet: command produced empty csv.`);
      }
      // else, load into parquet
      this.csvToParquet(tmpCSVFilePath, destFolder, destFileBaseName, colProjection, csvDelimiter).finally(() =>
        unlink(tmpCSVFilePath),
      );
    });
  }

  public streamLsTreeToParquet(destFolder: TFolderPath, destFileBaseName: TFileBaseName, tree: TGitSHA) {
    const args = ["ls-tree", "-r", `--format=%(objectmode)|%(objecttype)|%(objectname)|%(objectsize)|%(path)`, tree];
    const colProjection = `
      c[1]::UINT32 AS mode,
      c[2] AS type,
      c[3] AS sha,
      c[4]::BIGINT AS size,
      c[5] AS path
    `;
    return this.shellCsvToParquet(args, destFolder, destFileBaseName, colProjection as TSQLString);
  }

  public streamCommitsToParquet(
    destFolder: TFsVcsDbCommitsFolderPath,
    destFileBaseName: TFsVcsDbCommitBaseName,
    since?: TSecSinceEpoch,
  ) {
    const args = ["log", "--all", "--reverse", "--date-order", `--format=%H|%P|%T|%ct|%cn|%ce|%s`];
    if (since) args.push(`--since='${since}'`);
    const colProjection = `
      c[1] AS sha,
      string_split(c[2],' ') AS parents,
      c[3] AS tree,
      to_timestamp(c[4]::BIGINT) AS commit_time,
      c[5] AS author_name,
      c[6] AS author_email,
      c[7] AS subject
    `;
    return this.shellCsvToParquet(args, destFolder, destFileBaseName, colProjection as TSQLString);
  }

  // read the idx file and write the content to output file
  streamIDXtoParquet(srcIdxPath: TFilePath, destFolder: TFsVcsDbPIFolderPath, destFileBaseName: TFsVcsDbPIName) {
    const rowGroupSize = 4096;
    return TransactionalParquetWriter.open(idxFileLineSchema, destFolder, destFileBaseName, { rowGroupSize }).then(
      (writer) =>
        this.srcGitShell
          .execStream(
            ["verify-pack", "-v", srcIdxPath],
            (idxLinesBatch: string[]) => {
              const p = [];
              // convert each line to a row and write to parquet
              for (const idxLine of idxLinesBatch) {
                const m = idxLine.match(idxFileLineRegEx);
                if (!m?.groups) continue; // skip unnecessary lines
                const g = m.groups;
                const row: IdxFileLine = {
                  sha: g.sha as TGitSHA,
                  type: g.type as IdxFileLine["type"],
                  size: Number(g.size),
                  sizeInPack: Number(g.sizeInPack),
                  offset: Number(g.offset),
                  depth: g.depth ? Number(g.depth) : undefined,
                  base: g.base as TGitSHA,
                };
                p.push(writer.appendRow(row));
              }
              // wait for the the pending writes
              return Promise.all(p).then(() => {});
            },
            rowGroupSize,
          )
          .then(() => writer.commit()), // commit to disk and rename the file atomically
    );
  }
}
