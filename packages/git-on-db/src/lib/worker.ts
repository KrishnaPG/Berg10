import { parentPort } from "node:worker_threads";
import lmdb from "lmdb"; // pre-installed

const envMap = new Map<string, lmdb.RootDatabase>();

function env(path: string) {
  if (envMap.has(path)) return envMap.get(path)!;
  const e = lmdb.open({ path: path + "/lmdb", maxDbs: 2 });
  envMap.set(path, e);
  return e;
}

parentPort!.on("message", async (m: any) => {
  const e = env(m.dbPath);
  const cpDb = e.openDB("checkpoint");
  const blobDb = e.openDB("blob_cache");
  switch (m.op) {
    case "getCheckpoint":
      parentPort!.postMessage(cpDb.get("latest") || null);
      break;
    case "putCheckpoint":
      cpDb.put("latest", m.cp);
      parentPort!.postMessage(null);
      break;
    case "hasBlob":
      parentPort!.postMessage(blobDb.get(m.sha) !== undefined);
      break;
    case "putBlob":
      blobDb.put(m.sha, { size: m.size, seq: m.seq });
      parentPort!.postMessage(null);
      break;
  }
});
