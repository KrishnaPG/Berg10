import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DuckStateUpdater } from "./duckstate";
import { GitCli } from "./git-cli";
import { getCheckpoint, putCheckpoint } from "./lmdb-store";
import { loadConfig } from "./load-config";
import { Locker } from "./locker";
import { ParquetWriter } from "./parquet";
import { streamObjects } from "./streamer";

export async function runOnce(repo: string, configOverride?: string): Promise<void> {
  const lock = new Locker(join(repo, ".git_duck_sync/lock"));
  await lock.acquire();
  try {
    const cfg = loadConfig(repo, configOverride);
    const dbPath = join(repo, ".git_duck_sync");
    mkdirSync(join(dbPath, "tmp"), { recursive: true });
    const cp = await getCheckpoint(dbPath);
    const git = new GitCli(repo);
    const reflogSeqNow = await git.reflogSeq();
    if (cp && cp.reflogSeq === reflogSeqNow) {
      console.log("Up-to-date");
      return;
    }
    const shas: string[] = [];
    const rl = git.revList(["--objects", "--reflog", "--since-order=" + (cp?.reflogSeq || 0)]);
    for await (const line of rl) {
      const s = line.split(" ")[0];
      if (s.length === 40) shas.push(s);
    }
    const writer = new ParquetWriter(cfg, repo, cp?.parquetSn || 0);
    const { written, bytes } = await streamObjects(repo, cfg, shas, writer, dbPath, reflogSeqNow);
    writer.flushAll();
    const head = await git.headSha();
    const newCp = {
      reflogSeq: reflogSeqNow,
      lastCommitSha: head,
      parquetSn: (cp?.parquetSn || 0) + 1,
      txnId: randomUUID(),
      ts: Date.now(),
    };
    await putCheckpoint(dbPath, newCp);
    await new DuckStateUpdater(repo).append(newCp);
    console.log({ written, bytes });
  } finally {
    await lock.release();
  }
}
