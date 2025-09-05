import { cpus } from "node:os";
import { setTimeout } from "node:timers/promises";
import { GitCli } from "./git-cli";
import { hasBlob, putBlob } from "./lmdb-store";
import type { ParquetWriter } from "./parquet";
import type {Config, GitObject } from "./types";

export async function streamObjects(
  repo: string,
  cfg: Config,
  shas: string[],
  writer: ParquetWriter,
  dbPath: string,
  seq: number,
): Promise<{ written: number; bytes: bigint }> {
  const git = new GitCli(repo);
  const batch = git.catFileBatch();
  let written = 0;
  let bytes = 0n;
  const workers = cfg.sync.workers || cpus().length;
  const chan = new ReadableStream<string>({
    start(c) {
      shas.forEach((s) => c.enqueue(s + "\n"));
      c.close();
    },
  });
  const writerLock = new Int32Array(new SharedArrayBuffer(4));
  const promises = Array.from({ length: workers }, async (_, i) => {
    const reader = chan.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const sha = value.trim();
      if (await hasBlob(dbPath, sha)) continue;
      batch.write(sha + "\n");
      const obj = (await batch.read()) as GitObject;
      if (!obj) continue;
      if (cfg.ingestMode === "commit_only" && (obj.type === "blob" || obj.type === "tree")) continue;
      if (cfg.ingestMode === "meta_only" && obj.type === "blob") continue;
      // critical section – only one worker writes at a time
      while (Atomics.compareExchange(writerLock, 0, 0, 1) !== 0) await setTimeout(0);
      writer.append(obj);
      Atomics.store(writerLock, 0, 0);
      await putBlob(dbPath, obj.sha, obj.size, seq);
      written++;
      bytes += BigInt(obj.size);
    }
  });
  await Promise.all(promises);
  return { written, bytes };
}
