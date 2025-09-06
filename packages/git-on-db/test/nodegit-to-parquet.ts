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
import { type FileHandle, mkdir, open, opendir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ParquetSchema, ParquetWriter } from "@dsnp/parquetjs";
import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import * as lmdb from "lmdb";
import * as Git from "nodegit";
import { Oid } from "nodegit";
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

/* ---------- LMDB ---------- */
interface SnapshotMeta {
  name: string;
  createdMs: number;
  files: { path: string; size: number; crc: number }[];
}

/* ---------- MAIN ---------- */
async function main() {
  const repoPath = resolve(process.argv[2] || usage());
  const outDir = resolve(process.argv[3] || "./snapshots");
  await mkdir(outDir, { recursive: true });

  const lmdbEnv = lmdb.open({
    path: join(outDir, "state.lmdb"),
    maxDbs: 10,
    mapSize: LMDB_MAP_SIZE,
  });
  const db = {
    commitMap: lmdbEnv.openDB<string, string>({ name: "commitMap" }),
    refMap: lmdbEnv.openDB<string, string>({ name: "refMap" }),
    snapshots: lmdbEnv.openDB<SnapshotMeta, string>({ name: "snapshots" }),
  };

  /* ---------- OPEN REPO ---------- */
  const repo = await Git.Repository.open(repoPath);

  /* ---------- READ HEAD & REFS ---------- */
  const headRef = await repo.head();
  const headSym = headRef.isSymbolic() ? headRef.name() : null;
  const headSha = headRef.isSymbolic() ? (await headRef.resolve()).target().toString() : headRef.target().toString();

  const currRefMap = new Map<string, string>();
  currRefMap.set("HEAD", headSha);
  if (headSym) currRefMap.set(headSym, headSha);

  const refs = await repo.getReferences();
  for (const ref of refs) {
    if (ref.isSymbolic()) continue;
    currRefMap.set(ref.name(), ref.target().toString());
  }

  /* ---------- DIFF ---------- */
  const prevCommitMap = new Map<string, string>();
  const prevRefMap = new Map<string, string>();
  for (const c of db.commitMap.getRange()) prevCommitMap.set(c.key, c.value);
  for (const r of db.refMap.getRange()) prevRefMap.set(r.key, r.value);

  const newCommits = new Set<string>();
  const newRefs = new Set<string>();

  for (const [ref, sha] of currRefMap) {
    if (prevRefMap.get(ref) !== sha) newRefs.add(ref);
  }
  for (const sha of currRefMap.values()) newCommits.add(sha);

  /* if nothing changed – exit */
  if (newCommits.size === 0 && newRefs.size === 0) {
    console.log("No changes – already up-to-date.");
    lmdbEnv.close();
    return;
  }

  /* ---------- SNAPSHOT ---------- */
  const snapName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const snapDir = join(outDir, snapName);
  await mkdir(snapDir, { recursive: true });

  const cw = await ParquetWriter.openFile(commitsSchema, join(snapDir, "commits.parquet"), {
    rowGroupSize: ROW_GROUP_SIZE,
  });
  const tw = await ParquetWriter.openFile(treesSchema, join(snapDir, "trees.parquet"), {
    rowGroupSize: ROW_GROUP_SIZE,
  });
  const rw = await ParquetWriter.openFile(refsSchema, join(snapDir, "refs.parquet"), { rowGroupSize: ROW_GROUP_SIZE });

  const treeShas = new Set<string>();

  /* ---------- COMMIT WALKER ---------- */
  const walker = Git.Revwalk.create(repo);
  walker.sorting(1); // Git.Revwalk.SORT.TOPOLOGICAL
  for (const sha of newCommits) walker.push(Oid.fromString(sha));

  let oid: Oid;
  while ((oid = await walker.next())) {
    const sha = oid.tostrS();
    if (prevCommitMap.has(sha)) continue; // already exported

    const commit = await repo.getCommit(oid);
    const parents: string[] = [];
    for (let i = 0; i < commit.parentcount(); ++i) parents.push(commit.parentId(i).tostrS());

    const row: CommitRow = {
      commit_sha: Buffer.from(sha, "hex"),
      parent_0: parents[0] ? Buffer.from(parents[0], "hex") : undefined,
      parent_1: parents[1] ? Buffer.from(parents[1], "hex") : undefined,
      tree_sha: Buffer.from(commit.treeId().tostrS(), "hex"),
      author_ts: commit.author().when().time() * 1000,
      committer_ts: commit.committer().when().time() * 1000,
      msg_len: Buffer.byteLength(commit.message()),
      blob_path: join(repo.path(), "objects", sha.slice(0, 2), sha.slice(2)),
      blob_offset: 0,
    };
    await cw.appendRow(row);
    treeShas.add(commit.treeId().tostrS());
  }

  /* ---------- TREE WALKER ---------- */
  for (const tsha of treeShas) {
    const tree = await Git.Tree.lookup(repo, tsha);
    for (let i = 0; i < tree.entryCount(); ++i) {
      const e = tree.entryByIndex(i);
      const isTree = e.isTree();
      const row: TreeRow = {
        tree_sha: Buffer.from(tsha, "hex"),
        entry_name: e.name(),
        entry_mode: e.filemode(),
        entry_sha: Buffer.from(e.id().tostrS(), "hex"),
        entry_size: isTree ? 0 : 0, // we do not inflate blobs
        blob_path: isTree ? "" : join(repo.path(), "objects", e.id().tostrS().slice(0, 2), e.id().tostrS().slice(2)),
        blob_offset: 0,
      };
      await tw.appendRow(row);
    }
  }

  /* ---------- REFS ---------- */
  for (const ref of newRefs) {
    const sha = currRefMap.get(ref)!;
    const row: RefRow = {
      ref_name: ref,
      ref_sha: Buffer.from(sha, "hex"),
      is_head: ref === headSym,
    };
    await rw.appendRow(row);
  }

  await cw.close();
  await tw.close();
  await rw.close();

  /* ---------- CATALOG ---------- */
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

  /* ---------- VIEWS ---------- */
  const viewsSQL = `
CREATE OR REPLACE VIEW git_commits AS
SELECT * FROM read_parquet('${join(snapDir, "commits.parquet")}', hive_partitioning=0);

CREATE OR REPLACE VIEW git_trees AS
SELECT * FROM read_parquet('${join(snapDir, "trees.parquet")}', hive_partitioning=0);

CREATE OR REPLACE VIEW git_refs AS
SELECT * FROM read_parquet('${join(snapDir, "refs.parquet")}', hive_partitioning=0);
`;
  await open(join(snapDir, "views.sql"), "w").then((fh) => fh.write(viewsSQL).then(() => fh.close()));

  /* ---------- PERSIST STATE ---------- */
  lmdbEnv.transactionSync(() => {
    const refP = [];
    for (const [k, v] of currRefMap) refP.push(db.refMap.put(k, v));
    const snapP = db.snapshots.put(snapName, {
      name: snapName,
      createdMs: Date.now(),
      files: ["commits.parquet", "trees.parquet", "refs.parquet", "_catalog.parquet"].map((f) => ({
        path: f,
        size: require("fs").statSync(join(snapDir, f)).size,
        crc: 0,
      })),
    });
    return Promise.all([refP, snapP]);
  }, lmdb.TransactionFlags.SYNCHRONOUS_COMMIT);

  lmdbEnv.close();
  console.log("Snapshot completed:", snapDir);
}

function usage(): never {
  console.error("usage: git2parquet-nodegit <repoPath> [outDir]");
  process.exit(1);
}

main().catch(console.error);
