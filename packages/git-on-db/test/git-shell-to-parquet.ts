#!/usr/bin/env bun
import { ParquetSchema, ParquetWriter } from "@dsnp/parquetjs";
import { Bool, Builder, Int64, RecordBatch, RecordBatchStreamWriter, Table, Uint8, Utf8 } from "apache-arrow";
import { spawn } from "bun";
import * as fs from "fs";
import * as LMDB from "lmdb";
import * as path from "path";

/* ---------- Config ---------- */
const GIT_DIR = process.env.GIT_DIR || ".";
const DB_DIR = process.env.DB_DIR || "repo.db";
const BATCH_ROWS = 128_000;
const CHECKPOINT_INTERVAL = 1_000_000; // rows

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
  checkpoint = lmdbEnv.openDB<string, string>({name: "checkpoint"}),
  progress = lmdbEnv.openDB<string, boolean>({name: "progress"}),
  packIndex = lmdbEnv.openDB<Uint8Array, string>({name: "pack_index"}), // 16-byte value: 8-byte packfile-id, 8-byte offset
};

/* ---------- Arrow Schemas ---------- */
const commitSchema = new Table({
  sha: Utf8(),
  parents: Utf8(),
  tree: Utf8(),
  author_time: Int64(),
  author_name: Utf8(),
  author_email: Utf8(),
  message: Utf8(),
});

const objectSchema = new Table({
  sha: Utf8(),
  type: Uint8(), // 1=blob, 2=tree
  size: Int64(),
  path: Utf8(),
  packfile: Utf8(),
  offset: Int64(),
  commit_sha: Utf8(),
});

const refSchema = new Table({
  ref: Utf8(),
  sha: Utf8(),
  upstream: Utf8(),
  is_head: Bool(),
});

/* ---------- Helpers ---------- */
function git(args: string[]) {
  return spawn(["git", "-C", GIT_DIR, ...args], {
    stdout: "pipe",
    stderr: "inherit",
  });
}

async function* lines(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const dec = new TextDecoder();
  let buf = "";
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        yield buf.slice(0, i);
        buf = buf.slice(i + 1);
      }
    }
    if (buf.length) yield buf;
  } finally {
    reader.releaseLock();
  }
}

/* ---------- Packfile Index Builder (idempotent) ---------- */
async function buildPackIndex() {
  const packs = await new Response(git(["rev-parse", "--git-dir"]).stdout).text();
  const gitDir = packs.trim();
  const packDir = path.join(gitDir, "objects", "pack");
  if (!fs.existsSync(packDir)) return;
  const files = fs.readdirSync(packDir).filter((f) => f.endsWith(".idx"));
  for (const idx of files) {
    const packfile = path.join(packDir, idx.replace(".idx", ".pack"));
    if (db.packIndex.get(packfile)) continue; // already indexed
    const idxOutput = await new Response(git(["verify-pack", "-v", path.join(packDir, idx)]).stdout).text();
    lmdbEnv.transactionSync(()=>{
      for (const line of idxOutput.split("\n")) {
        const m = line.match(/^([0-9a-f]{40}) \w+ (\d+) (\d+) (\d+)$/);
        if (!m) continue;
        const [, sha, _, offset] = m;
        const buf = new ArrayBuffer(16);
        const v = new DataView(buf);
        v.setBigUint64(0, BigInt(packfile.split("/").pop()!.split("-").pop()!.replace(".pack", "")), true);
        v.setBigUint64(8, BigInt(offset), true);
        db.packIndex.put(sha, new Uint8Array(buf));
      }
      db.packIndex.put(packfile, new Uint8Array(1)); // marker      
    }, LMDB.TransactionFlags.SYNCHRONOUS_COMMIT);
  }
}

/* ---------- Parquet Writer Factory ---------- */
let batchSeq = 0;
function newParquetWriter<T>(schema: Table, name: string) {
  const file = path.join(DB_DIR, `${name}.${String(batchSeq).padStart(6, "0")}.parquet`);
  batchSeq++;
  const writer = ParquetWriter.create(file, schema);
  return { writer, file, rows: 0 };
}

/* ---------- Main Transform ---------- */
async function run() {
  fs.mkdirSync(DB_DIR, { recursive: true });

  await buildPackIndex();

  const lastCommit = db.checkpoint.get("last_processed_commit") || "";

  /* ---------- Commits ---------- */
  const args = ["rev-list", "--all", "--topo-order", "--parents", "--format=%H|%P|%T|%ct|%cn|%ce|%s"];
  if (lastCommit) args.push(lastCommit + "..HEAD");

  const commitStream = git(args).stdout;
  const commitWriter = newParquetWriter(commitSchema, "commits");
  const objectWriter = newParquetWriter(objectSchema, "objects");

  let rowsSinceCheckpoint = 0;
  let currentCommit = "";
  let currentTree = "";

  const commitBuilder = Builder.new(commitSchema);
  const objectBuilder = Builder.new(objectSchema);

  for await (const raw of lines(commitStream)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("commit ")) {
      const [sha, parents, tree, ts, name, email, ...msgArr] = line.slice(7).split("|");
      currentCommit = sha;
      currentTree = tree;
      commitBuilder.append({
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
        objectBuilder.append({
          sha,
          type: type === "blob" ? 1 : 2,
          size: BigInt(size),
          path: filepath,
          packfile,
          offset,
          commit_sha: currentCommit,
        });
      }

      if (commitBuilder.length >= BATCH_ROWS) {
        flush();
      }
      if (rowsSinceCheckpoint >= CHECKPOINT_INTERVAL) {
        checkpoint(currentCommit);
        rowsSinceCheckpoint = 0;
      }
    }
  }

  flush();
  checkpoint(currentCommit);

  commitWriter.writer.close();
  objectWriter.writer.close();

  /* ---------- Refs ---------- */
  const refWriter = newParquetWriter(refSchema, "refs");
  const refBuilder = Builder.new(refSchema);
  const refStream = git(["for-each-ref", "--format=%(refname)%09%(objectname)%09%(upstream)%09%(HEAD)"]).stdout;
  for await (const l of lines(refStream)) {
    const [ref, sha, upstream, head] = l.split("\t");
    refBuilder.append({ ref, sha, upstream, is_head: head === "*" });
  }
  const rb = RecordBatch.from(refBuilder.toVector());
  refWriter.writer.write(rb);
  refWriter.writer.close();

  console.error("Done.");
}

function flush() {
  if (commitBuilder.length) {
    const rb = RecordBatch.from(commitBuilder.toVector());
    commitWriter.writer.write(rb);
    commitWriter.rows += rb.numRows;
    commitBuilder.clear();
  }
  if (objectBuilder.length) {
    const rb = RecordBatch.from(objectBuilder.toVector());
    objectWriter.writer.write(rb);
    objectWriter.rows += rb.numRows;
    objectBuilder.clear();
  }
}

function checkpoint(commit: string) {
  lmdbEnv.transactionSync(()=>{
    db.checkpoint.put("last_processed_commit", commit)
  }, LMDB.TransactionFlags.SYNCHRONOUS_COMMIT);
  fs.fsyncSync(fs.openSync(DB_DIR, "r"));
}

/* ---------- Go ---------- */
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
