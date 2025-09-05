import { spawn } from "node:child_process";
import { type Readable, Transform } from "node:stream";
import type { GitObject } from "./types";

export class GitCli {
  constructor(private repo: string) {}

  revList(args: string[]): Readable {
    const p = spawn("git", ["-C", this.repo, "rev-list", "--objects", ...args], {
      stdio: ["ignore", "pipe", "inherit"],
    });
    return p.stdout.setEncoding("utf8");
  }

  catFileBatch(): Transform {
    const p = spawn("git", ["-C", this.repo, "cat-file", "--batch"], {
      stdio: ["pipe", "pipe", "inherit"],
    });
    let buf = Buffer.allocUnsafe(0);
    const tx = new Transform({
      objectMode: true,
      transform(chunk, _, cb) {
        buf = Buffer.concat([buf, chunk]);
        for (;;) {
          const n = buf.indexOf("\n");
          if (n === -1) break;
          const head = buf.subarray(0, n).toString();
          const [sha, type, sizeStr] = head.split(" ");
          const size = Number(sizeStr);
          const need = n + 1 + size + 1; // header + data + LF
          if (buf.length < need) break;
          const data = buf.subarray(n + 1, need - 1); // zero-copy
          buf = buf.subarray(need);
          tx.push({ sha, type, size, data } as GitObject);
        }
        cb();
      },
    });
    p.stdout.pipe(tx);
    tx.pipe(p.stdin as any); // kept for symmetry
    return tx;
  }

  async reflogSeq(): Promise<number> {
    const p = spawn("git", ["-C", this.repo, "reflog", "--pretty=%H"]);
    let c = 0;
    for await (const _ of p.stdout) c++;
    return c;
  }

  async headSha(): Promise<string> {
    const p = spawn("git", ["-C", this.repo, "rev-parse", "HEAD"]);
    let out = "";
    for await (const chunk of p.stdout) out += chunk;
    return out.trim();
  }
}
