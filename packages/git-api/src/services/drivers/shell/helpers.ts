import type { SpawnOptions } from "bun";
import os from "os";
import { join } from "path";
import { CONFIG } from "../../../config";
import type { TPath } from "../../types";
import type { IGitCmdResult } from "../backend";

export class IRepoBase {
  constructor(protected repoPath: TPath) {}
}

// Global cwd controller
export class WorkingDir {
  constructor(protected _cwd: TPath = os.tmpdir() as TPath) {}
  set(dir: TPath) {
    return (this._cwd = dir);
  }
  get cwd() {
    return this._cwd;
  }
}
export const gWorkingDir = new WorkingDir();

// git shell execution helper method
export async function git<
  const _In extends SpawnOptions.Writable = "ignore",
  const Out extends SpawnOptions.Readable = "pipe",
  const Err extends SpawnOptions.Readable = "inherit",
>(repoPath: TPath, args: string[], options?: SpawnOptions.OptionsObject<_In, Out, Err>): Promise<IGitCmdResult> {
  const cmd = ["git", "-C", repoPath, ...args];

  const process = Bun.spawn({
    cwd: options?.cwd || gWorkingDir.cwd,
    cmd,
    stdout: "pipe",
    stdin: options?.stdin,
    stderr: "pipe",
  });

  // if (options?.stdin) {
  //   await process.stdin.write(options.stdin);
  //   process.stdin.flush();
  //   process.stdin.end();
  // }

  const output = await new Response(process.stdout).text();
  new ReadableStream(process.stderr);
  const errors: string = await Bun.readableStreamToText(process.stderr);
  const exitCode = await process.exited;

  return { output, errors, exitCode, cmd };
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
export async function* gitStream<
const _In extends SpawnOptions.Writable = "ignore",
const Out extends SpawnOptions.Readable = "pipe",
const Err extends SpawnOptions.Readable = "inherit",
>(repoPath: string, args: string[], options?: SpawnOptions.OptionsObject<_In, Out, Err>): AsyncGenerator<string> {
  const cmd = ["git", "-C", repoPath, ...args];

  const proc = Bun.spawn({
    cwd: options?.cwd || gWorkingDir.cwd,
    cmd,
    stderr: "pipe",
    stdout: "pipe",
    stdin: options?.stdin,
  });

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

// git shell execution method with error handler
export function okGit<
  const _In extends SpawnOptions.Writable = "ignore",
  const Out extends SpawnOptions.Readable = "pipe",
  const Err extends SpawnOptions.Readable = "inherit",
>(repoPath: TPath, args: string[], options?: SpawnOptions.OptionsObject<_In, Out, Err>) {
  return git(repoPath, args, options).then((result) => {
    if (result.exitCode)
      throw new Error(`\ncmd: '${result.cmd.join(" ")}'\nResult: ${result.errors}Exit Code: ${result.exitCode}`);
    return result;
  });
}
