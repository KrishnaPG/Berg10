import { flock } from "bun:ffi";
import { close, open, readFileSync, unlink, writeFileSync } from "node:fs";
import { join } from "node:path";

const libc = {
  flock: flock({
    args: ["int", "int"],
    returns: "int",
  }),
};

const LOCK_EX = 2;
const LOCK_NB = 4;

export class Locker {
  private fd = -1;
  constructor(private file: string) {}

  async acquire(): Promise<void> {
    try {
      this.fd = open(this.file, "wx+");
    } catch {
      // file exists – check PID
      const pid = +readFileSync(this.file, "utf8").trim();
      try {
        // signal 0 – exists check
        process.kill(pid, 0);
        throw new Error("Lock held");
      } catch {
        // dead pid
        unlink(this.file);
        this.fd = open(this.file, "wx+");
      }
    }
    const rc = libc.flock(this.fd, LOCK_EX | LOCK_NB);
    if (rc !== 0) throw new Error("Lock contested");
    writeFileSync(this.fd, String(process.pid));
  }

  async release(): Promise<void> {
    if (this.fd >= 0) {
      unlink(this.file);
      close(this.fd);
      this.fd = -1;
    }
  }
}
