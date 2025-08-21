import { join } from "path";
import { CONFIG } from "../../../config";

// git shell execution method
export async function git(repo: string, args: string[], options?: { stdin?: string }): Promise<string> {
  const process = Bun.spawn({
    cmd: ["git", "-C", join(CONFIG.REPO_BASE, repo), ...args],
    stdout: "pipe",
    stdin: options?.stdin ? "pipe" : undefined,
  });

  if (options?.stdin) {
    await process.stdin.write(options.stdin);
    process.stdin.end();
  }

  const output = await new Response(process.stdout).text();
  return output;
}

// stream helpers

const POOL_SIZE = 64 * 1024; // 64 kB chunks
const POOL_MAX = 128; // max pooled chunks
const pool: ArrayBuffer[] = [];

export function alloc(): ArrayBuffer {
  return pool.pop() ?? new ArrayBuffer(POOL_SIZE);
}
export function release(buf: ArrayBuffer) {
  if (pool.length < POOL_MAX) pool.push(buf);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** git stream based shell execution */
export async function* gitStream(repo: string, args: string[], stdin?: Uint8Array): AsyncGenerator<string> {
  const cmd = ["git", "-C", join(CONFIG.REPO_BASE, repo), ...args];

  const proc = Bun.spawn({
    cmd,
    stdout: "pipe",
    stdin: stdin ? "pipe" : undefined,
  });

  if (stdin) {
    await proc.stdin.write(stdin);
    proc.stdin.end();
  }

  const buf = alloc();
  const reader = proc.stdout.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
    release(buf);
  }
}

// parsing utilities (zero-allocation)
export function* parseRefLines(lines: string): Generator<[string, string, string]> {
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines.charCodeAt(i) === 10) {
      // '\n'
      const line = lines.slice(start, i);
      const sp1 = line.indexOf(" ");
      const sp2 = line.indexOf(" ", sp1 + 1);
      yield [line.slice(0, sp1), line.slice(sp1 + 1, sp2), line.slice(sp2 + 1)];
      start = i + 1;
    }
  }
}
