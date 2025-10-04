import { unlink } from "node:fs/promises";
import path from "node:path";
import { ParquetSchema } from "@dsnp/parquetjs";
import type { DuckDBTimestampTZValue } from "@duckdb/node-api";
import { type BaseQueryExecutor, ensureTables, TransactionalParquetWriter } from "@shared/ducklake";
import type { GitShell } from "@shared/git-shell";
import type {
  TDuckLakeDBName,
  TDuckLakeRootPath,
  TFilePath,
  TFsVcsDbPIName,
  TFsVcsDbPITblPath,
  TFsVcsDotDBPath,
  TFsVcsDotDbTablePath,
  TSecSinceEpoch,
  TSQLString,
} from "@shared/types";
import type { TCommitHash, TGitSHA, TTreeHash } from "@shared/types/git-internal.types";
import { atomicFileRename, genTempFilePath } from "@shared/utils";
import fs from "fs-extra";

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
  sha1: TGitSHA;
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
  /^(?<sha1>[0-9a-f]{40,64})\s+(?<type>commit|tree|blob|tag)\s+(?<size>\d+)\s+(?<sizeInPack>\d+)\s+(?<offset>\d+)(?:\s+(?<depth>\d+)\s+(?<base>[0-9a-f]{40,64}))?$/;

export interface IUnlistedCommit {
  commit: TCommitHash;
  tree: TTreeHash;
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
    protected dlRootPath: TFsVcsDotDBPath, // db folder: `vcs/<repoId>.db/`
    protected q: BaseQueryExecutor, // the target db driver (duck lake)
  ) {}

  get rootPath(): TFsVcsDotDBPath {
    return this.dlRootPath;
  }

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
      .then(({ db }) => new FsVcsGitDL(srcGitShell, rootPath, db))
      .catch((error) => {
        throw new Error(`Failed to setup DataLake at "${rootPath}".\n\t${(error as Error).message}\n`);
      });
  }

  refreshView(viewName: TGitDLTableName, viewTblPath: TFsVcsDotDbTablePath) {
    const src = path.join(viewTblPath, "**", "*.parquet");
    const sql = `CREATE OR REPLACE VIEW '${viewName}' AS SELECT * FROM read_parquet('${src}');` as TSQLString;
    return this.q.exec(sql).catch((ex) => console.warn(`Failed to refresh view '${viewName}': ${ex.message}`));
  }

  checkIfViewExists(viewName: TGitDLTableName): Promise<boolean> {
    const sql = `SELECT view_name FROM duckdb_views WHERE view_name = '${viewName}';` as TSQLString;
    return this.q
      .queryRow(sql)
      .then((row) => row !== null)
      .catch((ex) => {
        console.warn(`checkIfViewExists('${viewName}') failed: ${ex.message}`);
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

  async getCommit(commit: TCommitHash) {
    return this.q.queryRow`SELECT * FROM commits WHERE commit = ${commit}`;
  }

  async lastCommitTime(): Promise<TSecSinceEpoch | undefined> {
    return this.q.queryRow<{ t: DuckDBTimestampTZValue }>`SELECT max(commit_time) as t FROM commits`.then((row) =>
      row ? (Number(row.t.micros / (1000n * 1000n)) as TSecSinceEpoch) : undefined,
    );
  }

  async parent(sha1: TGitSHA) {
    return this.q.queryRow`
      SELECT c.* FROM commits c
      JOIN commit_parents p ON c.sha = p.parent_sha
      WHERE p.commit_sha = ${sha1}
      ORDER BY p.idx LIMIT 1`;
  }

  async children(sha1: TGitSHA) {
    return this.q.queryAll`
      SELECT c.* FROM commits c
      JOIN commit_parents p ON c.sha = p.commit_sha
      WHERE p.parent_sha = ${sha1}`;
  }

  /** returns the entries that are in `commits` table but not in `tree-entries` table */
  async *getUnlistedCommits(tableExists: boolean): AsyncGenerator<IUnlistedCommit[], void, unknown> {
    const sql = (tableExists ? "" : `select commit, tree from commits order by commit_time`) as TSQLString; //TODO: when table exists, do join of commits x tree-entries
    for await (const rowBatch of this.q.query<IUnlistedCommit>(sql)) yield rowBatch;
  }

  /* -------------------------------------------------- trees / files */
  async listFiles(commit: TCommitHash) {
    return this.q.queryAll`
      SELECT t.path, t.mode, t.size
      FROM   tree_entries t
      WHERE  t.tree = (
          SELECT tree FROM commits WHERE commit = ${commit}
      )`;
  }

  /* -------------------------------------------------- pack index */
  async packIndex(sha1: string) {
    return this.q.queryRow`SELECT * FROM pack_index WHERE sha1 = ${sha1}`;
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
    destFilePath: TFilePath,
    colProjection: TSQLString,
    csvDelim: TCsvDelim = "\t",
  ) {
    const tmpParFilePath = genTempFilePath(destFilePath, "-par.tmp") as TFilePath;
    const finalFilePath = destFilePath;
    const sql = `
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
        ) TO '${tmpParFilePath}' (FORMAT PARQUET, COMPRESSION ZSTD);
    `;
    return this.q
      .run(sql)
      .then(() => atomicFileRename(tmpParFilePath, finalFilePath))
      .catch((ex) => {
        return unlink(tmpParFilePath).finally(() => {
          throw new Error(`csvToParquet failed for "${finalFilePath}". ${(ex as Error).message}`, { cause: ex });
        });
      });
  }

  protected shellCsvToParquet(
    cmdArgs: string[],
    finalFilePath: TFilePath,
    colProjection: TSQLString,
    csvDelimiter: TCsvDelim = `\\|`,
  ) {
    const tmpCSVFilePath = genTempFilePath(finalFilePath, "-csv.tmp");
    return fs.exists(finalFilePath).then((exists) => {
      // if destination already (in case of dataLake sync race conditions), return with a warning
      if (exists) return console.warn(`shellCsvToParquet: destination "${finalFilePath}" already exists !`);
      // load the shell results into temp CSV file first
      return this.srcGitShell.execToFile(cmdArgs, tmpCSVFilePath).then((bytesWritten: number) => {
        // if the output csv file was empty, no records to process
        if (!bytesWritten) {
          return console.debug(`shellCsvToParquet: command produced empty csv.`);
        }
        // else, load the csv into parquet
        return this.csvToParquet(tmpCSVFilePath, finalFilePath, colProjection, csvDelimiter).finally(() =>
          unlink(tmpCSVFilePath).catch(console.warn),
        );
      });
    });
  }

  public streamLsTreeToParquet(destFilePath: TFilePath, row: IUnlistedCommit) {
    const args = ["ls-tree", "-r", `--format=${row.commit}|${row.tree}|%(objectmode)|%(objecttype)|%(objectname)|%(objectsize)|%(path)`, row.tree];
    const colProjection = `
      c[1] AS commit,       -- commit_sha1
      c[2] AS tree,         -- tree_sha1
      c[3]::UINT32 AS mode,
      c[4] AS type,
      c[5] AS sha1,         -- blob_sha1 if type == 'blob'
      c[6] AS size,         -- should be c[4]::BIGINT
      c[7] AS path
    `;
    return this.shellCsvToParquet(args, destFilePath, colProjection as TSQLString);
  }

  public streamCommitsToParquet(destFilePath: TFilePath, since?: TSecSinceEpoch) {
    const args = ["log", "--all", "--reverse", "--date-order", `--format=%H|%P|%T|%ct|%cn|%ce|%s`];
    if (since) args.push(`--since='${since}'`);
    const colProjection = `
      c[1] AS commit,
      string_split(c[2],' ') AS parents,
      c[3] AS tree,
      to_timestamp(c[4]::BIGINT) AS commit_time,
      c[5] AS author_name,
      c[6] AS author_email,
      c[7] AS subject
    `;
    return this.shellCsvToParquet(args, destFilePath, colProjection as TSQLString);
  }

  // read the idx file and write the content to output file
  streamIDXtoParquet(srcIdxPath: TFilePath, destFolder: TFsVcsDbPITblPath, destFileBaseName: TFsVcsDbPIName) {
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
                  sha1: g.sha1 as TGitSHA,
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
