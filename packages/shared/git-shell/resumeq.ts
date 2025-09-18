#!/usr/bin/env node
import { spawnSync } from "child_process";
import { randomUUID } from "crypto";
import * as fs from "fs";
/**
 * resumeq.ts  –  Resumable multi-level LMDB work-queue
 * Single file, industrial strength, TypeScript 5
 * npm install lmdb prom-client
 * tsc resumeq.ts --lib es2022 --target es2022 --module commonjs
 */
import * as lmdb from "lmdb";
import * as os from "os";
import * as path from "path";
import * as prom from "prom-client";

/* ===========================================================================
 * 1.  Types
 * ========================================================================== */
type Status = "pending" | "running" | "done" | "failed";
type StepKey = string; // taskId:stepIdx
type TaskId = string;
type HandlerName = string;
type Hash = string; // sha256 of input blob

interface StepRec {
  taskId: TaskId;
  stepIdx: number;
  parentStep?: StepKey; // taskId:stepIdx
  handlerName: HandlerName;
  inputHash: Hash;
  outputHash?: Hash;
  status: Status;
  retry: number;
  created: number;
  started?: number;
  finished?: number;
  ownerWorker?: string;
  lastBeat?: number;
  error?: string;
  resultLoc?: string; // external URI / file path
}

interface TaskRec {
  taskId: TaskId;
  name: string;
  status: Status;
  created: number;
  started?: number;
  finished?: number;
  totalSteps: number;
  pendingSteps: number;
  runningSteps: number;
  doneSteps: number;
  failedSteps: number;
}

type Handler = (input: any, ctx: Ctx) => Promise<{ output: any; outputHash: Hash; resultLoc?: string }>;

interface Ctx {
  log: (...a: any[]) => void;
  heartbeat: () => void;
  txn: lmdb.Transaction;
  spawn: (handler: HandlerName, input: any) => void;
}

/* ===========================================================================
 * 2.  Metrics
 * ========================================================================== */
const register = new prom.Registry();
const m = {
  queued: new prom.Gauge({ name: "rq_queued", help: "Steps waiting", registers: [register] }),
  running: new prom.Gauge({ name: "rq_running", help: "Steps running", registers: [register] }),
  done: new prom.Gauge({ name: "rq_done", help: "Steps done", registers: [register] }),
  failed: new prom.Gauge({ name: "rq_failed", help: "Steps failed", registers: [register] }),
  latency: new prom.Histogram({
    name: "rq_step_duration_seconds",
    help: "Wall time per step",
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
    registers: [register],
  }),
};

/* ===========================================================================
 * 3.  QueueEngine  (LMDB wrapper)
 * ========================================================================== */
class QueueEngine {
  private env: lmdb.RootDatabase;
  private tasks: lmdb.Database<TaskRec, TaskId>;
  private steps: lmdb.Database<StepRec, StepKey>;
  private queue: lmdb.Database<StepKey, Buffer>; // key = priority(4) + created(8) + stepKey
  private handlers = new Map<HandlerName, Handler>();

  constructor(public dir: string) {
    fs.mkdirSync(dir, { recursive: true });
    this.env = lmdb.open({
      path: path.join(dir, "queue.lmdb"),
      maxDbs: 8,
      mapSize: 100 * 1024 * 1024 * 1024, // 100 GiB
      syncPeriod: 1000,
    });
    this.tasks = this.env.openDB<TaskRec, TaskId>({ name: "tasks" });
    this.steps = this.env.openDB<StepRec, StepKey>({ name: "steps" });
    this.queue = this.env.openDB<StepKey, Buffer>({ name: "queue" });
  }

  register(name: HandlerName, fn: Handler) {
    this.handlers.set(name, fn);
  }

  getHandler(name: HandlerName): Handler {
    const h = this.handlers.get(name);
    if (!h) throw new Error(`Unknown handler ${name}`);
    return h;
  }

  /* ---- task creation ---- */
  createTask(name: string): TaskBuilder {
    const taskId = randomUUID();
    const now = Date.now();
    const rec: TaskRec = {
      taskId,
      name,
      status: "pending",
      created: now,
      totalSteps: 0,
      pendingSteps: 0,
      runningSteps: 0,
      doneSteps: 0,
      failedSteps: 0,
    };
    this.tasks.putSync(taskId, rec);
    return new TaskBuilder(this, taskId);
  }

  /* ---- enqueue step ---- */
  enqueue(step: StepRec) {
    const key = this.queueKey(step);
    this.steps.putSync(this.stepKey(step), step);
    this.queue.putSync(key, Buffer.from(this.stepKey(step)));
    m.queued.inc();
  }

  /* ---- dequeue next pending ---- */
  dequeue(workerId: string): StepRec | undefined {
    let chosen: StepRec | undefined;
    this.env.transactionSync(() => {
      const cursor = this.queue.getCursor();
      if (!cursor.goToFirst()) return;
      const stepKey = cursor.getCurrentString();
      if (!stepKey) return;
      const step = this.steps.get(stepKey);
      if (!step || step.status !== "pending") {
        cursor.deleteCurrent(); // stale
        return;
      }
      step.status = "running";
      step.started = Date.now();
      step.ownerWorker = workerId;
      step.lastBeat = Date.now();
      this.steps.putSync(this.stepKey(step), step);
      cursor.deleteCurrent();
      m.queued.dec();
      m.running.inc();
      chosen = step;
    });
    return chosen;
  }

  /* ---- heartbeat ---- */
  beat(step: StepRec) {
    step.lastBeat = Date.now();
    this.steps.putSync(this.stepKey(step), step);
  }

  /* ---- finish step ---- */
  finish(step: StepRec, outputHash: Hash, resultLoc?: string) {
    this.env.transactionSync(() => {
      step.status = "done";
      step.finished = Date.now();
      step.outputHash = outputHash;
      step.resultLoc = resultLoc;
      this.steps.putSync(this.stepKey(step), step);
      this.updateTaskCounts(step.taskId);
      m.running.dec();
      m.done.inc();
      m.latency.observe((step.finished! - step.started!) / 1000);
    });
  }

  /* ---- fail step ---- */
  fail(step: StepRec, error: string) {
    this.env.transactionSync(() => {
      step.status = "failed";
      step.finished = Date.now();
      step.error = error;
      this.steps.putSync(this.stepKey(step), step);
      this.updateTaskCounts(step.taskId);
      m.running.dec();
      m.failed.inc();
    });
  }

  /* ---- reset stale running steps ---- */
  resetStale(threshold = 30000) {
    const now = Date.now();
    this.env.transactionSync(() => {
      const cursor = this.steps.getCursor();
      if (!cursor.goToFirst()) return;
      do {
        const step = cursor.getCurrent();
        if (!step) continue;
        if (step.status === "running" && step.lastBeat && now - step.lastBeat > threshold) {
          step.status = "pending";
          step.ownerWorker = undefined;
          step.started = undefined;
          step.lastBeat = undefined;
          step.retry++;
          cursor.updateCurrent(step);
          const key = this.queueKey(step);
          this.queue.putSync(key, Buffer.from(this.stepKey(step)));
          m.running.dec();
          m.queued.inc();
        }
      } while (cursor.goToNext());
    });
  }

  /* ---- task stats ---- */
  private updateTaskCounts(taskId: TaskId) {
    const counts = { pending: 0, running: 0, done: 0, failed: 0 };
    const cursor = this.steps.getCursor();
    if (cursor.goToRange(taskId + ":")) {
      do {
        const step = cursor.getCurrent();
        if (!step || !step.taskId.startsWith(taskId)) break;
        counts[step.status]++;
      } while (cursor.goToNext() && cursor.getCurrent()!.taskId.startsWith(taskId));
    }
    const task = this.tasks.get(taskId)!;
    task.pendingSteps = counts.pending;
    task.runningSteps = counts.running;
    task.doneSteps = counts.done;
    task.failedSteps = counts.failed;
    if (task.pendingSteps === 0 && task.runningSteps === 0) {
      task.status = task.failedSteps > 0 ? "failed" : "done";
      task.finished = Date.now();
    }
    this.tasks.putSync(taskId, task);
  }

  /* ---- helpers ---- */
  private stepKey(s: { taskId: TaskId; stepIdx: number }): StepKey {
    return `${s.taskId}:${s.stepIdx.toString().padStart(8, "0")}`;
  }
  private queueKey(s: { taskId: TaskId; stepIdx: number; created: number }): Buffer {
    const prio = 0; // default
    const buf = Buffer.allocUnsafe(24);
    buf.writeUInt32BE(prio);
    buf.writeBigUInt64BE(BigInt(s.created), 4);
    buf.write(s.taskId.replace(/-/g, ""), 12, "hex");
    return buf;
  }

  /* ---- diagnostics ---- */
  dump() {
    console.log("--- tasks ---");
    for (const t of this.tasks.getRange()) console.log(t);
    console.log("--- steps ---");
    for (const s of this.steps.getRange()) console.log(s);
  }
}

/* ===========================================================================
 * 4.  TaskBuilder  (fluent)
 * ========================================================================== */
class TaskBuilder {
  private stepIdx = 0;
  constructor(
    private q: QueueEngine,
    private taskId: TaskId,
  ) {}

  addStep(handler: HandlerName, input: any, parent?: StepKey): TaskBuilder {
    const inputHash = this.hash(input);
    const step: StepRec = {
      taskId: this.taskId,
      stepIdx: this.stepIdx++,
      parentStep: parent,
      handlerName: handler,
      inputHash,
      status: "pending",
      retry: 0,
      created: Date.now(),
    };
    this.q.enqueue(step);
    return this;
  }
  private hash(obj: any): Hash {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
  }
}

/* ===========================================================================
 * 5.  Worker
 * ========================================================================== */
class Worker {
  private id = randomUUID();
  private stopped = false;
  constructor(private engine: QueueEngine) {}

  start() {
    this.heartbeat();
    this.poll();
  }
  stop() {
    this.stopped = true;
  }

  private async poll() {
    while (!this.stopped) {
      try {
        const step = this.engine.dequeue(this.id);
        if (!step) {
          await this.sleep(200);
          continue;
        }
        await this.run(step);
      } catch (e) {
        console.error("Worker poll error", e);
        await this.sleep(1000);
      }
    }
  }

  private async run(step: StepRec) {
    const log = (...a: any[]) => console.log(`[${this.id.slice(0, 4)}]`, ...a);
    log("RUN", step.handlerName, step.taskId, step.stepIdx);
    const ctx: Ctx = {
      log,
      heartbeat: () => this.engine.beat(step),
      txn: this.engine.steps.transaction,
      spawn: (h, inp) => this.spawnChild(step, h, inp),
    };
    const hb = setInterval(() => ctx.heartbeat(), 5000);
    try {
      const handler = this.engine.getHandler(step.handlerName);
      const input = await this.loadInput(step.inputHash); // external
      const { output, outputHash, resultLoc } = await handler(input, ctx);
      await this.saveOutput(outputHash, output); // external
      this.engine.finish(step, outputHash, resultLoc);
      log("DONE", step.handlerName);
    } catch (e: any) {
      console.error(e);
      this.engine.fail(step, e.message);
    } finally {
      clearInterval(hb);
    }
  }

  private spawnChild(parent: StepRec, handler: HandlerName, input: any) {
    const inputHash = require("crypto").createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const child: StepRec = {
      taskId: parent.taskId,
      stepIdx: parent.stepIdx + 1000000, // crude but unique
      parentStep: this.engine["stepKey"](parent),
      handlerName: handler,
      inputHash,
      status: "pending",
      retry: 0,
      created: Date.now(),
    };
    this.engine.enqueue(child);
  }

  private async loadInput(hash: Hash): Promise<any> {
    // in real life fetch from S3, disk, etc.
    const f = path.join(this.engine.dir, "inputs", hash);
    if (!fs.existsSync(f)) throw new Error(`Input ${hash} missing`);
    return JSON.parse(fs.readFileSync(f, "utf8"));
  }
  private async saveOutput(hash: Hash, data: any) {
    const f = path.join(this.engine.dir, "outputs", hash);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(data));
  }
  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
  private heartbeat() {
    setInterval(() => this.engine.resetStale(), 30000);
  }
}

/* ===========================================================================
 * 6.  Example handlers  (git → DuckDB → vectorDB)
 * ========================================================================== */
export function installHandlers(engine: QueueEngine) {
  engine.register("gitLog", async (_, ctx) => {
    ctx.log('git log --format="%H $ct"');
    const out = spawnSync("git", ["log", "--format=%H $ct", "-n", "100"], { encoding: "utf8" });
    if (out.status !== 0) throw new Error(out.stderr);
    const rows = out.stdout
      .trim()
      .split("\n")
      .map((l) => {
        const [hash, t] = l.split(" ");
        return { hash, timestamp: Number(t) };
      });
    // write to DuckDB parquet (mock)
    const hash = require("crypto").createHash("sha256").update(JSON.stringify(rows)).digest("hex");
    return { output: rows, outputHash: hash, resultLoc: "commits.parquet" };
  });

  engine.register("commitInfo", async (row: any, ctx) => {
    ctx.log("git show " + row.hash);
    const out = spawnSync("git", ["show", "--name-only", row.hash], { encoding: "utf8" });
    if (out.status !== 0) throw new Error(out.stderr);
    const info = {
      hash: row.hash,
      msg: out.stdout.slice(0, 200),
      files: out.stdout.split("\n").filter((l) => l.includes(".")),
    };
    const hash = require("crypto").createHash("sha256").update(JSON.stringify(info)).digest("hex");
    return { output: info, outputHash: hash, resultLoc: "commit_info.parquet" };
  });

  engine.register("mlVector", async (info: any, ctx) => {
    ctx.log("fake ML on", info.hash);
    const vectors = info.files.map((f: string) => ({
      file: f,
      vec: Array(128)
        .fill(0)
        .map(() => Math.random()),
    }));
    const hash = require("crypto").createHash("sha256").update(JSON.stringify(vectors)).digest("hex");
    return { output: vectors, outputHash: hash, resultLoc: "vectors.parquet" };
  });
}

/* ===========================================================================
 * 7.  Bootstrap
 * ========================================================================== */
if (require.main === module) {
  (async () => {
    const dir = process.env.QUEUE_DIR || path.join(os.tmpdir(), "resumeq");
    const engine = new QueueEngine(dir);
    installHandlers(engine);

    const args = process.argv.slice(2);
    if (args[0] === "enqueue") {
      const task = engine.createTask("git-to-vectordb");
      task.addStep("gitLog", {});
      console.log("enqueued", task);
      process.exit(0);
    }
    if (args[0] === "worker") {
      const w = new Worker(engine);
      w.start();
      console.log("worker started", w);
      process.on("SIGINT", () => {
        console.log("shutting down");
        w.stop();
        process.exit(0);
      });
      // expose metrics
      const http = require("http");
      http
        .createServer(async (_: any, res: any) => {
          res.writeHead(200, { "Content-Type": register.contentType });
          res.end(await register.metrics());
        })
        .listen(9090, () => console.log("metrics on :9090"));
      return;
    }
    if (args[0] === "dump") {
      engine.dump();
      process.exit(0);
    }
    console.log("Usage: resumeq.ts (enqueue|worker|dump)");
  })();
}
