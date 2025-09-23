import { constants } from "node:fs";
import { type FileHandle, open, unlink } from "node:fs/promises";
import { FILESYSTEM_RETRY_OPTIONS, retry } from "./retry";

export interface LockLogger {
  warn(msg: string): void;
  debug?(msg: string): void;
}

export interface LockerOptions {
  logger?: LockLogger;
}

/**
 * Cross-process file-based mutex.
 * Uses the file descriptor as the real lock token (O_CREAT | O_EXCL)
 * and stores PID (+ optional starttime) inside the file.
 */
export class Locker {
  private fd: FileHandle | null = null;
  private locked = false;

  constructor(
    private readonly file: string,
    private readonly opts: LockerOptions = {},
  ) {}

  /** Acquire the lock. Idempotent per instance. */
  async acquire(): Promise<void> {
    if (this.locked) throw new Error("Lock already acquired");

    await retry(
      async () => {
        try {
          // 1. Try to create exclusively
          this.fd = await open(this.file, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR);

          // 2. Write PID (+ optional starttime) through the same FD
          const payload = JSON.stringify({
            pid: process.pid,
            stime: await getStartTime(process.pid),
          });
          await this.fd.write(payload);
          await this.fd.sync(); // ensure durability

          this.locked = true;
          this.opts.logger?.debug?.(`Lock acquired on ${this.file}`);
          return true;
        } catch (err: any) {
          await this.safeCleanup(); // close partial FD

          if (err.code === "EEXIST") {
            // Someone else owns the file; check if they are still alive
            await this.handleExistingLock();
            throw err; // retry
          }
          // Real disk error – bail out
          throw new Error(`Failed to create lock file: ${err.message}`);
        }
      },
      { config: FILESYSTEM_RETRY_OPTIONS },
    );
  }

  /** Release the lock. Safe to call multiple times. */
  async release(): Promise<void> {
    if (!this.locked) return;
    await this.safeCleanup();
    this.locked = false;
    this.opts.logger?.debug?.(`Lock released on ${this.file}`);
  }

  get isAcquired(): boolean {
    return this.locked;
  }

  /* -------------------------------------------------- */
  /*                  Private helpers                   */
  /* -------------------------------------------------- */
  private async safeCleanup(): Promise<void> {
    if (this.fd) {
      try {
        await this.fd.close();
      } catch {
        /* ignore */
      } finally {
        this.fd = null;
      }
    }
    try {
      await unlink(this.file);
    } catch (e: any) {
      if (e.code !== "ENOENT") this.opts.logger?.warn(`Warning: failed to unlink ${this.file}: ${e.message}`);
    }
  }

  private async handleExistingLock(): Promise<void> {
    let fd: FileHandle | null = null;
    try {
      fd = await open(this.file, constants.O_RDONLY);
      const buf = await fd.readFile({ encoding: "utf8" });
      const data = JSON.parse(buf);
      const { pid, stime } = data;

      if (!Number.isInteger(pid) || pid <= 0) throw new Error("Invalid PID in lock file");

      // Simple liveness check
      try {
        process.kill(pid, 0); // signal 0 – existence check
      } catch (killErr: any) {
        if (killErr.code === "ESRCH") {
          this.opts.logger?.debug?.(`Detected stale lock (PID ${pid} dead)`);
          return; // caller will retry
        }
        throw new Error(`Kill check failed for PID ${pid}: ${killErr.message}`);
      }

      // Optional start-time check (Linux)
      if (stime && (await getStartTime(pid)) !== stime) {
        this.opts.logger?.debug?.(`PID ${pid} reused – treating lock as stale`);
        return;
      }

      throw new Error(`Lock held by PID ${pid}`);
    } catch (parseOrReadErr: any) {
      // Treat unreadable / corrupted files as stale
      this.opts.logger?.debug?.(`Lock file unreadable (${parseOrReadErr.message}) – will retry`);
    } finally {
      if (fd) await fd.close();
    }
  }
}

/* ------------------------------------------------------ */
/* Helper: run a critical section with automatic cleanup  */
/* ------------------------------------------------------ */
export async function withLock<T>(file: string, fn: () => Promise<T>, opts: LockerOptions = {}): Promise<T> {
  const lock = new Locker(file, opts);
  await lock.acquire();
  try {
    return await fn();
  } finally {
    await lock.release();
  }
}

/* ------------------------------------------------------ */
/* Linux only: fetch process start-time from /proc        */
/* ------------------------------------------------------ */
async function getStartTime(pid: number): Promise<number | undefined> {
  try {
    const { readFile } = await import("node:fs/promises");
    const stat = await readFile(`/proc/${pid}/stat`, "ascii");
    // Field 22 is starttime (ticks since boot)
    return Number(stat.split(" ")[21]);
  } catch {
    return undefined;
  }
}

/**
 * @example
 *
    import { Locker, withLock } from "./locker";

    // 1. Manual acquire / release
    const lock = new Locker("/tmp/my.lock", { logger: console });
    await lock.acquire();
    try {
      await doSomething();
    } finally {
      await lock.release();
    }

    // 2. One-liner wrapper
    await withLock("/tmp/my.lock", async () => {
      await doSomething();
    });
 */