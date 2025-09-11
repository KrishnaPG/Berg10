#!/usr/bin/env bun
import { ParquetSchema, ParquetWriter } from "@dsnp/parquetjs";
import { BergManager } from "@shared/berg/manager";
import type { TDriftPath, TFileHandle, TFilePath, TFolderPath } from "@shared/types";
import type { TGitDirPath, TGitRepoRootPath, TWorkTreePath } from "@shared/types/git.types";
import { getPackageJsonFolder } from "@shared/utils";
import * as arrow from "apache-arrow";
import * as fs from "fs";
import * as LMDB from "lmdb";
import os from "os";
import * as path from "path";
import { linesBatchedTransform } from "../../shared/git-shell/lines-batched-transform";

/* ---------- Config ---------- */
const GIT_DIR = process.env.GIT_DIR || ".";
const DB_DIR = process.env.DB_DIR || "repo.db";
const ROW_GROUP_SIZE = 5000;
const CHECKPOINT_INTERVAL = 10000; // rows

/* ---------- LMDB ---------- */
const lmdbEnv = LMDB.open({
  path: path.join(DB_DIR, "meta.lmdb"),
  compression: true,
  // high perf options
  mapSize: 100 * 1024 * 1024, // 100 MB
  commitDelay: 0,
  overlappingSync: false,
});
const db = {
  checkpoint: lmdbEnv.openDB<string, string>({ name: "checkpoint" }),
  progress: lmdbEnv.openDB<string, boolean>({ name: "progress" }),
  packIndex: lmdbEnv.openDB<Uint8Array, string>({ name: "pack_index" }), // 16-byte value: 8-byte packfile-id, 8-byte offset
  packsDone: lmdbEnv.openDB<boolean, string>({ name: "packs_scanned" }), // checkpoint for packIndex data
};

/* ---------- Arrow Schemas ---------- */
const commitSchema = new arrow.Schema([
  new arrow.Field("sha", new arrow.Utf8()),
  new arrow.Field("parents", new arrow.Utf8()),
  new arrow.Field("tree", new arrow.Utf8()),
  new arrow.Field("author_time", new arrow.Int64()),
  new arrow.Field("author_name", new arrow.Utf8()),
  new arrow.Field("author_email", new arrow.Utf8()),
  new arrow.Field("message", new arrow.Utf8()),
]);

const objectSchema = new arrow.Schema([
  new arrow.Field("sha", new arrow.Utf8()),
  new arrow.Field("type", new arrow.Int32()), // 1=blob, 2=tree
  new arrow.Field("size", new arrow.Int64()),
  new arrow.Field("path", new arrow.Utf8()),
  new arrow.Field("packfile", new arrow.Utf8()),
  new arrow.Field("offset", new arrow.Int64()),
  new arrow.Field("commit_sha", new arrow.Utf8()),
]);

const refSchema = new arrow.Schema([
  new arrow.Field("ref", new arrow.Utf8()),
  new arrow.Field("sha", new arrow.Utf8()),
  new arrow.Field("upstream", new arrow.Utf8()),
  new arrow.Field("is_head", new arrow.Bool()),
]);

/* ---------- Parquet Schemas ---------- */
const commitParquetSchema = new ParquetSchema({
  sha: { type: "UTF8", optional: false },
  parents: { type: "UTF8", optional: false },
  tree: { type: "UTF8", optional: false },
  author_time: { type: "INT64", optional: false },
  author_name: { type: "UTF8", optional: false },
  author_email: { type: "UTF8", optional: false },
  message: { type: "UTF8", optional: false },
});

const objectParquetSchema = new ParquetSchema({
  sha: { type: "UTF8", optional: false },
  type: { type: "INT32", optional: false }, // 1=blob, 2=tree
  size: { type: "INT64", optional: false },
  path: { type: "UTF8", optional: false },
  packfile: { type: "UTF8", optional: false },
  offset: { type: "INT64", optional: false },
  commit_sha: { type: "UTF8", optional: false },
});

const refParquetSchema = new ParquetSchema({
  ref: { type: "UTF8", optional: false },
  sha: { type: "UTF8", optional: false },
  upstream: { type: "UTF8", optional: false },
  is_head: { type: "BOOLEAN", optional: false },
});

/* ---------- Helpers ---------- */


/** writes the given tsv content to DuckDB table */
function saveTSVToDuckDB(tsvLines: string, dbFile: string) {
  const sql = `COPY (
  SELECT * FROM read_csv_auto(${JSON.stringify(tsvLines)}, delim='\t', header=false,  columns={sha:'VARCHAR',type:'VARCHAR',size:'UBIGINT',offset:'UBIGINT'})
  ) TO ${dbFile} (FORMAT PARQUET, COMPRESSION ZSTD)`;
  return Promise.resolve(sql);
}

/** ---------- Packfile Index Builder (idempotent) ----------
 *
 * One-time, idempotent helper that builds a fast look-up table
 * from every object SHA-1 that lives inside a pack-file to the physical
 * location of that object (which pack it is in and at what byte offset).
 *
 * Later, when the main loop streams `git ls-tree`, it can immediately tell
 * whether an object is packed and where to find it, without having to open
 * every pack again.
 *
 * The pack index data is available as parquet files for DuckLake:
 *  `CREATE VIEW pack_index AS SELECT * FROM '<FsVCSRoot>/<sha>.git/pack_index/*.parquet'`;
 */
async function buildPackIndex(dotGitFolderPath: TGitDirPath): Promise<void | void[]> {
  /* 1. locate .git/objects/pack */
  const packDir = path.resolve(dotGitFolderPath, "objects", "pack");
  if (!fs.existsSync(packDir)) return;

  /* 2. iterate over *.idx files */
  const idxFiles = fs
    .readdirSync(packDir)
    .filter((f) => f.endsWith(".idx"))
    .map((f) => path.join(packDir, f));

  const p = []; // batch multiples idx loads

  /* 3. write the .idx file content to tsv */
  for (const idxPath of idxFiles) {
    const packName = path.basename(idxPath, ".idx"); // "pack-1234…"
    if (db.packsDone.get(packName)) continue; // already captured

    // duckDB temp and final filenames (in the VCS/<imported_repo_name>/.git/ folder)
    const tmpFilePath = path.resolve(os.tmpdir(), "pack_index", `${packName}.tmp`);
    const finalFilePath = path.resolve(os.tmpdir(), "pack_index", `${packName}.parquet`);

    p.push(
      loadIDXFile(idxPath as TFilePath)
        .then((idxLines: string) => saveTSVToDuckDB(idxLines, tmpFilePath))
        .then(() => {
          /* atomic unit: LMDB flag + DuckDB file appearance */
          lmdbEnv.transactionSync(() => {
            /* a) mark logically done first */
            db.packsDone.put(packName, true);
            /* b) physical commit point: rename */
            fs.renameSync(tmpFilePath, finalFilePath); // atomic on same filesystem
          }, LMDB.TransactionFlags.SYNCHRONOUS_COMMIT);
        }),
    );

    if (p.length >= 4) await Promise.all(p).then(() => (p.length = 0));
  }
  return Promise.all(p);
}

/* ---------- Parquet Writer Factory ---------- */
let batchSeq = 0;
async function newParquetWriter(schema: ParquetSchema, name: string) {
  const file = path.join(DB_DIR, `${name}.${String(batchSeq).padStart(6, "0")}.parquet`);
  batchSeq++;
  const writer = await ParquetWriter.openFile(schema, file);
  return { writer, file, rows: 0 };
}

/* ---------- Main Transform ---------- */
async function run() {
  const bMgr = await BergManager.initialize(
    os.tmpdir() as TDriftPath,
    path.resolve(await getPackageJsonFolder(import.meta.dir as TFolderPath), "template") as TFolderPath,
  );
  await bMgr.importRepo(process.cwd() as TWorkTreePath);

  await buildPackIndex();

  const lastCommit = db.checkpoint.get("last_processed_commit") || "";

  /* ---------- Commits ---------- */
  const args = ["rev-list", "--all", "--topo-order", "--parents", "--format=%H|%P|%T|%ct|%cn|%ce|%s"];
  if (lastCommit) args.push(lastCommit + "..HEAD");

  const commitStream = git(args).stdout;
  const cw = await ParquetWriter.openFile(commitParquetSchema, path.join(DB_DIR, "commits.parquet"), {
    rowGroupSize: ROW_GROUP_SIZE,
  });
  const ow = await ParquetWriter.openFile(objectParquetSchema, path.join(DB_DIR, "objects.parquet"), {
    rowGroupSize: ROW_GROUP_SIZE,
  });
  const rw = await ParquetWriter.openFile(refParquetSchema, path.join(DB_DIR, "refs.parquet"), {
    rowGroupSize: ROW_GROUP_SIZE,
  });

  let rowsSinceCheckpoint = 0;
  let currentCommit = "";
  let currentTree = "";

  // const commitBuilder = Builder.new(commitSchema);
  // const objectBuilder = Builder.new(objectSchema);

  for await (const raw of lines(commitStream)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("commit ")) {
      const [sha, parents, tree, ts, name, email, ...msgArr] = line.slice(7).split("|");
      currentCommit = sha;
      currentTree = tree;
      cw.appendRow({
        sha,
        parents,
        tree,
        author_time: BigInt(ts),
        author_name: name,
        author_email: email,
        message: msgArr.join("|"),
      });
      rowsSinceCheckpoint++;

      /* ---------- Stream objects for this tree ---------- */
      const lsTree = git(["ls-tree", "-r", "-l", tree]).stdout;
      for await (const l of lines(lsTree)) {
        const m = l.match(/^(\d+) (\w+) ([0-9a-f]{40})\s+(\d+)\t(.+)$/);
        if (!m) continue;
        const [, , type, sha, size, filepath] = m;
        const idx = db.packIndex.get(sha);
        let packfile = "";
        let offset = 0n;
        if (idx && idx.byteLength === 16) {
          const v = new DataView(idx.buffer, idx.byteOffset, 16);
          const packId = v.getBigUint64(0, true);
          const off = v.getBigUint64(8, true);
          packfile = `objects/pack/pack-${packId.toString(16)}.pack`;
          offset = off;
        }
        ow.appendRow({
          sha,
          type: type === "blob" ? 1 : 2,
          size: BigInt(size),
          path: filepath,
          packfile,
          offset,
          commit_sha: currentCommit,
        });
      }

      if (rowsSinceCheckpoint >= CHECKPOINT_INTERVAL) {
        checkpoint(currentCommit);
        rowsSinceCheckpoint = 0;
      }
    }
  }

  checkpoint(currentCommit);

  await cw.close();
  await ow.close();

  /* ---------- Refs ---------- */
  // const refBuilder = Builder.new(refSchema);
  const refStream = git(["for-each-ref", "--format=%(refname)%09%(objectname)%09%(upstream)%09%(HEAD)"]).stdout;
  for await (const l of lines(refStream)) {
    const [ref, sha, upstream, head] = l.split("\t");
    rw.appendRow({ ref, sha, upstream, is_head: head === "*" });
  }
  await rw.close();

  console.error("Done.");
}

function checkpoint(commit: string) {
  lmdbEnv.transactionSync(() => {
    db.checkpoint.put("last_processed_commit", commit);
  }, LMDB.TransactionFlags.SYNCHRONOUS_COMMIT);
  fs.fsyncSync(fs.openSync(DB_DIR, "r"));
}

/* ---------- Go ---------- */
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
