import { once } from "node:events";
import { Worker } from "node:worker_threads";
import type { Checkpoint } from "./types";

let worker: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (worker) return worker;
  worker = new Worker(new URL("worker.js", import.meta.url), { stdout: true, stderr: true });
  await once(worker, "online");
  return worker;
}

export async function getCheckpoint(dbPath: string): Promise<Checkpoint | null> {
  const w = await getWorker();
  w.postMessage({ op: "getCheckpoint", dbPath });
  const [msg] = await once(w, "message");
  return msg;
}

export async function putCheckpoint(dbPath: string, cp: Checkpoint): Promise<void> {
  const w = await getWorker();
  w.postMessage({ op: "putCheckpoint", dbPath, cp });
  await once(w, "message");
}

export async function hasBlob(dbPath: string, sha: string): Promise<boolean> {
  const w = await getWorker();
  w.postMessage({ op: "hasBlob", dbPath, sha });
  const [msg] = await once(w, "message");
  return msg;
}

export async function putBlob(dbPath: string, sha: string, size: number, seq: number): Promise<void> {
  const w = await getWorker();
  w.postMessage({ op: "putBlob", dbPath, sha, size, seq });
  await once(w, "message");
}
