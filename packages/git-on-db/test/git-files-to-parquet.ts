#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { statSync } from "node:fs";
/**
 * git2parquet.ts  –  streaming, transactional, idempotent Git → Parquet
 * Usage:  bun run git2parquet.ts <repoPath> [outDir=./snapshots]
 *
 * Produces per-run folder:
 *   <outDir>/<snapshot>/commits.parquet
 *   <outDir>/<snapshot>/trees.parquet
 *   <outDir>/<snapshot>/refs.parquet
 *   <outDir>/<snapshot>/_catalog.parquet
 *   <outDir>/<snapshot>/views.sql
 *
 * LMDB state file is kept at <outDir>/state.lmdb
 */
import { type FileHandle, open, opendir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ParquetSchema, ParquetWriter } from "@dsnp/parquetjs";
import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import * as lmdb from "lmdb";
import os from "os";

/* ---------- CONFIG ---------- */
const ROW_GROUP_SIZE = 50_000;
const LMDB_MAP_SIZE = 100 * 1024 * 1024; // 100 MiB
const GIT_OBJECT_PACK = 4096; // read buffer size

/* ---------- TYPEBOX SCHEMAS ---------- */
const CommitRow = Type.Object({
  commit_sha: Type.Uint8Array({ minByteLength: 20, maxByteLength: 20 }),
  parent_0: Type.Optional(Type.Uint8Array({ minByteLength: 20, maxByteLength: 20 })),
  parent_1: Type.Optional(Type.Uint8Array({ minByteLength: 20, maxByteLength: 20 })),
  tree_sha: Type.Uint8Array({ minByteLength: 20, maxByteLength: 20 }),
  author_ts: Type.Integer({ minimum: 0 }),
  committer_ts: Type.Integer({ minimum: 0 }),
  msg_len: Type.Integer({ minimum: 0 }),
  blob_path: Type.String(),
  blob_offset: Type.Integer({ minimum: 0 }),
});
type CommitRow = Static<typeof CommitRow>;
const CommitValidator = TypeCompiler.Compile(CommitRow);

const TreeRow = Type.Object({
  tree_sha: Type.Uint8Array({ minByteLength: 20, maxByteLength: 20 }),
  entry_name: Type.String(),
  entry_mode: Type.Integer({ minimum: 0 }),
  entry_sha: Type.Uint8Array({ minByteLength: 20, maxByteLength: 20 }),
  entry_size: Type.Integer({ minimum: 0 }),
  blob_path: Type.String(),
  blob_offset: Type.Integer({ minimum: 0 }),
});
type TreeRow = Static<typeof TreeRow>;

const RefRow = Type.Object({
  ref_name: Type.String(),
  ref_sha: Type.Uint8Array({ minByteLength: 20, maxByteLength: 20 }),
  is_head: Type.Boolean(),
});
type RefRow = Static<typeof RefRow>;

/* ---------- PARQUET SCHEMAS ---------- */
const commitsSchema = new ParquetSchema({
  commit_sha: { type: "BYTE_ARRAY", optional: false },
  parent_0: { type: "BYTE_ARRAY", optional: true },
  parent_1: { type: "BYTE_ARRAY", optional: true },
  tree_sha: { type: "BYTE_ARRAY", optional: false },
  author_ts: { type: "INT64", optional: false },
  committer_ts: { type: "INT64", optional: false },
  msg_len: { type: "INT32", optional: false },
  blob_path: { type: "UTF8", optional: false },
  blob_offset: { type: "INT32", optional: false },
});

const treesSchema = new ParquetSchema({
  tree_sha: { type: "BYTE_ARRAY", optional: false },
  entry_name: { type: "UTF8", optional: false },
  entry_mode: { type: "INT32", optional: false },
  entry_sha: { type: "BYTE_ARRAY", optional: false },
  entry_size: { type: "INT64", optional: false },
  blob_path: { type: "UTF8", optional: false },
  blob_offset: { type: "INT32", optional: false },
});

const refsSchema = new ParquetSchema({
  ref_name: { type: "UTF8", optional: false },
  ref_sha: { type: "BYTE_ARRAY", optional: false },
  is_head: { type: "BOOLEAN", optional: false },
});

/* ---------- UTILS ---------- */
const die = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};
const shaToPath = (gitDir: string, sha: string): string => join(gitDir, "objects", sha.slice(0, 2), sha.slice(2));

const readExact = async (fh: FileHandle, buf: Uint8Array, off: number) => {
  let read = 0;
  while (read < buf.length) {
    const { bytesRead } = await fh.read(buf, read, buf.length - read, off + read);
    if (bytesRead === 0) throw new Error("short read");
    read += bytesRead;
  }
};

/* ---------- GIT PARSING ---------- */
interface GitCommit {
  sha: string;
  parents: string[];
  tree: string;
  authorTs: number;
  committerTs: number;
  msgSize: number;
}

async function* streamCommits(gitDir: string, shas: Set<string>): AsyncGenerator<GitCommit> {
  const seen = new Set<string>();
  const q = Array.from(shas);
  while (q.length) {
    const sha = q.shift()!;
    if (seen.has(sha)) continue;
    seen.add(sha);
    const objPath = shaToPath(gitDir, sha);
    const fh = await open(objPath, "r").catch(() => null);
    if (!fh) continue; // dangling commit – ignore
    const header = Buffer.alloc(32);
    await readExact(fh, header, 0);
    const space = header.indexOf(0x20);
    const null_ = header.indexOf(0x00);
    if (space < 0 || null_ < 0) {
      await fh.close();
      continue;
    }
    const type = header.subarray(0, space).toString();
    if (type !== "commit") {
      await fh.close();
      continue;
    }
    const size = parseInt(header.subarray(space + 1, null_).toString(), 10);
    const body = Buffer.alloc(size);
    await readExact(fh, body, null_ + 1);
    await fh.close();

    const parents: string[] = [];
    let tree = "";
    let authorTs = 0;
    let committerTs = 0;
    let msgStart = 0;
    let pos = 0;
    while (pos < body.length) {
      const lineEnd = body.indexOf(0x0a, pos);
      if (lineEnd < 0) break;
      const line = body.subarray(pos, lineEnd).toString();
      if (line.startsWith("tree ")) tree = line.slice(5);
      else if (line.startsWith("parent ")) parents.push(line.slice(7));
      else if (line.startsWith("author ")) {
        const m = line.match(/(\d+)\s+[+-]\d{4}$/);
        if (m) authorTs = parseInt(m[1], 10) * 1000;
      } else if (line.startsWith("committer ")) {
        const m = line.match(/(\d+)\s+[+-]\d{4}$/);
        if (m) committerTs = parseInt(m[1], 10) * 1000;
      } else if (line === "") {
        msgStart = lineEnd + 1;
        break;
      }
      pos = lineEnd + 1;
    }
    const msgSize = body.length - msgStart;
    yield { sha, parents, tree, authorTs, committerTs, msgSize };
    parents.forEach((p) => {
      q.push(p);
    });
  }
}

interface GitTreeEntry {
  name: string;
  mode: number;
  sha: string;
  size: number; // 0 for trees
}

async function* streamTreeEntries(gitDir: string, rootSha: string): AsyncGenerator<GitTreeEntry> {
  const objPath = shaToPath(gitDir, rootSha);
  const fh = await open(objPath, "r").catch(() => null);
  if (!fh) return;
  const header = Buffer.alloc(64);
  await readExact(fh, header, 0);
  const null_ = header.indexOf(0x00);
  const size = parseInt(header.subarray(header.indexOf(0x20) + 1, null_).toString(), 10);
  const body = Buffer.alloc(size);
  await readExact(fh, body, null_ + 1);
  await fh.close();
  let pos = 0;
  while (pos < body.length) {
    const sp = body.indexOf(0x20, pos);
    const nl = body.indexOf(0x00, sp);
    if (sp < 0 || nl < 0) break;
    const mode = parseInt(body.subarray(pos, sp).toString(), 8);
    const name = body.subarray(sp + 1, nl).toString();
    const sha = body.subarray(nl + 1, nl + 21).toString("hex");
    const isTree = (mode & 0o040000) !== 0;
    yield { name, mode, sha, size: isTree ? 0 : 0 }; // size 0 – we do not inflate blobs
    pos = nl + 21;
  }
}

/* ---------- LMDB HELPERS ---------- */
interface SnapshotMeta {
  name: string;
  createdMs: number;
  files: { path: string; size: number; crc: number }[];
}

/* ---------- MAIN ---------- */
async function main(dotGitFolderPath: string, outDir: string) {
  const headFilePath = resolve(dotGitFolderPath, "HEAD");
  try {
    await open(headFilePath, "r");
  } catch {
    die(`Not a .git folder: "${dotGitFolderPath}]"; or the file "HEAD" is missing in that path`);
  }

  const lmdbEnv = lmdb.open({
    path: join(outDir, "state.lmdb"),
    maxDbs: 10,
    mapSize: LMDB_MAP_SIZE,
    //commitBatchSize: 1000,
  });
  const db = {
    commitMap: lmdbEnv.openDB<string, string>({ name: "commitMap" }),
    refMap: lmdbEnv.openDB<string, string>({ name: "refMap" }),
    snapshots: lmdbEnv.openDB<SnapshotMeta, string>({ name: "snapshots" }),
  };

  /* read HEAD */
  const headBuf = await open(headFilePath, "r").then((fh) =>
    fh.readFile().then((b) => {
      fh.close();
      return b;
    }),
  );
  const headSym = headBuf.toString().trim();
  const headRef = headSym.startsWith("ref: ") ? headSym.slice(5) : null;

  /* read all refs */
  const refs = new Map<string, string>();
  async function walkRefs(dir: string) {
    const dirHandle = await opendir(dir);
    for await (const ent of dirHandle) {
      if (ent.isDirectory()) await walkRefs(join(dir, ent.name));
      else {
        const refName = join(dir, ent.name)
          .slice(dotGitFolderPath.length + 1)
          .replace(/\\/g, "/");
        const sha = (await open(join(dir, ent.name), "r").then((fh) => fh.readFile())).toString().trim();
        refs.set(refName, sha);
      }
    }
  }
  await walkRefs(join(dotGitFolderPath, "refs"));
  if (headRef) refs.set("HEAD", refs.get(headRef) || "");

  /* build current maps */
  const currCommitMap = new Map<string, GitCommit>();
  const currRefMap = new Map(refs);

  /* diff against LMDB */
  const prevCommitMap = new Map<string, string>();
  const prevRefMap = new Map<string, string>();
  for (const c of db.commitMap.getRange()) prevCommitMap.set(c.key, c.value);
  for (const r of db.refMap.getRange()) prevRefMap.set(r.key, r.value);

  const newCommits = new Set<string>();
  const newRefs = new Set<string>();

  currRefMap.forEach((sha, ref) => {
    if (prevRefMap.get(ref) !== sha) newRefs.add(ref);
  });
  Array.from(currRefMap.values()).forEach((sha) => {
    newCommits.add(sha);
  });

  /* if nothing changed – exit */
  if (newCommits.size === 0 && newRefs.size === 0) {
    console.log("No changes – already up-to-date.");
    lmdbEnv.close();
    return;
  }

  /* ---------- LMDB checkpointed txn ---------- */
  const snapName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const snapDir = join(outDir, snapName);
  await mkdir(snapDir, { recursive: true });

  /* ---------- writers ---------- */
  const cw = await ParquetWriter.openFile(commitsSchema, join(snapDir, "commits.parquet"), {
    rowGroupSize: ROW_GROUP_SIZE,
  });
  const tw = await ParquetWriter.openFile(treesSchema, join(snapDir, "trees.parquet"), {
    rowGroupSize: ROW_GROUP_SIZE,
  });
  const rw = await ParquetWriter.openFile(refsSchema, join(snapDir, "refs.parquet"), { rowGroupSize: ROW_GROUP_SIZE });

  const treeShas = new Set<string>();

  /* commits */
  for await (const c of streamCommits(dotGitFolderPath, newCommits)) {
    currCommitMap.set(c.sha, c);
    const row: CommitRow = {
      commit_sha: Buffer.from(c.sha, "hex"),
      parent_0: c.parents[0] ? Buffer.from(c.parents[0], "hex") : undefined,
      parent_1: c.parents[1] ? Buffer.from(c.parents[1], "hex") : undefined,
      tree_sha: Buffer.from(c.tree, "hex"),
      author_ts: c.authorTs,
      committer_ts: c.committerTs,
      msg_len: c.msgSize,
      blob_path: shaToPath(dotGitFolderPath, c.sha),
      blob_offset: 0,
    };
    await cw.appendRow(row);
    treeShas.add(c.tree);
  }

  /* trees */
  Array.from(treeShas).forEach(async (tsha) => {
    for await (const e of streamTreeEntries(dotGitFolderPath, tsha)) {
      const row: TreeRow = {
        tree_sha: Buffer.from(tsha, "hex"),
        entry_name: e.name,
        entry_mode: e.mode,
        entry_sha: Buffer.from(e.sha, "hex"),
        entry_size: e.size,
        blob_path: e.size > 0 ? shaToPath(dotGitFolderPath, e.sha) : "",
        blob_offset: 0,
      };
      await tw.appendRow(row);
    }
  });

  /* refs */
  Array.from(newRefs).forEach(async (ref) => {
    const sha = currRefMap.get(ref)!;
    const row: RefRow = {
      ref_name: ref,
      ref_sha: Buffer.from(sha, "hex"),
      is_head: ref === headRef,
    };
    await rw.appendRow(row);
  });

  await cw.close();
  await tw.close();
  await rw.close();

  /* catalog */
  const catW = await ParquetWriter.openFile(
    new ParquetSchema({
      snapshot_name: { type: "UTF8", optional: false },
      created_ms: { type: "INT64", optional: false },
      commits_file: { type: "UTF8", optional: false },
      trees_file: { type: "UTF8", optional: false },
      refs_file: { type: "UTF8", optional: false },
    }),
    join(snapDir, "_catalog.parquet"),
  );
  await catW.appendRow({
    snapshot_name: snapName,
    created_ms: Date.now(),
    commits_file: "commits.parquet",
    trees_file: "trees.parquet",
    refs_file: "refs.parquet",
  });
  await catW.close();

  /* views.sql */
  const viewsSQL = `
CREATE OR REPLACE VIEW git_commits AS
SELECT *
FROM read_parquet('${join(snapDir, "commits.parquet")}', hive_partitioning=0);

CREATE OR REPLACE VIEW git_trees AS
SELECT *
FROM read_parquet('${join(snapDir, "trees.parquet")}', hive_partitioning=0);

CREATE OR REPLACE VIEW git_refs AS
SELECT *
FROM read_parquet('${join(snapDir, "refs.parquet")}', hive_partitioning=0);
`;
  await open(join(snapDir, "views.sql"), "w").then((fh) => fh.write(viewsSQL).then(() => fh.close()));

  lmdbEnv.transactionSync(async () => {
    /* persist maps */
    const commitsP = Array.from(currCommitMap.entries()).map(([k, v]) => db.commitMap.put(k, JSON.stringify(v)));
    const refsP = Array.from(currRefMap.entries()).map(([k, v]) => db.refMap.put(k, v));
    const snapP = db.snapshots.put(snapName, {
      name: snapName,
      createdMs: Date.now(),
      files: ["commits.parquet", "trees.parquet", "refs.parquet", "_catalog.parquet"].map((f) => ({
        path: f,
        size: statSync(join(snapDir, f)).size,
        crc: 0, // todo: crc if desired
      })),
    });
    return Promise.all([commitsP, refsP, snapP]);
  }, lmdb.TransactionFlags.SYNCHRONOUS_COMMIT);

  lmdbEnv.close();
  console.log("Snapshot completed:", snapDir);
}

// the .git folder path (not the repo folder which contains .git, but the .git folder itself)
const dotGitFolderPath = resolve(__dirname, "..", "..", "..", ".git");

main(
  resolve(process.argv[2] || dotGitFolderPath || die("usage: git2parquet <repoPath> [outDir]")),
  resolve(process.argv[3] || resolve(os.tmpdir(), "snapshots")),
).catch(console.error);

/* ---------- tiny mkdir polyfill for bun ---------- */
async function mkdir(p: string, opts?: any) {
  return import("node:fs").then((fs) => fs.promises.mkdir(p, opts));
}
