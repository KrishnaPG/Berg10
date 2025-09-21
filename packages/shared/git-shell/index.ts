import type { TFilePath, TFolderPath } from "@shared/types";
import type { TGitDirPath } from "@shared/types/git.types";
import { isFileEmpty } from "@shared/utils";
import { spawn } from "child_process";
import { once } from "events";
import fs, { createWriteStream, unlink } from "fs-extra";
import path, { resolve } from "path";
import { Writable } from "stream";
import { pipeline } from "stream/promises";
import { asyncSink, syncSink } from "./helpers";
import { linesBatchedTransform } from "./lines-batched-transform";

export class GitShell {
  protected gitDirArgs: string[];

  constructor(public _gitDir: TGitDirPath) {
    this.gitDirArgs = ["--git-dir", _gitDir];
  }

  public get gitDir() {
    return this._gitDir;
  }
  public get packDir() {
    return path.resolve(this.gitDir, "objects", "pack");
  }

  protected exec(args: string[], options?: object) {
    const cmdArgs = [...this.gitDirArgs, ...args];
    console.debug(`cmd: git ${cmdArgs.join(" ")}`);
    return spawn("git", cmdArgs, {
      stdio: ["ignore", "pipe", "inherit"], // stdout piped, stderr inherited
      ...options,
    });
  }

  /** runs a command and saves the output to a file */
  public async execToFile(args: string[], outFilePath: TFilePath): Promise<number> {
    const outStream = createWriteStream(outFilePath, { highWaterMark: 64 * 1024 });
    // spawn the child process and redirect the stdout
    const child = this.exec(args);
    const childExitP = once(child, "close");
    try {
      await pipeline(child.stdout, outStream); // back-pressure + flush
      const [exitCode, _signal] = await childExitP; // wait for real exit
      if (exitCode !== 0 || outStream.bytesWritten === 0) {
        await unlink(outFilePath);
        if (exitCode !== 0) throw new Error(`git ${args.join(" ")} exited with ${exitCode}`);
      }
      return outStream.bytesWritten;
    } catch (err) {
      child.kill("SIGKILL");
      await childExitP.catch(() => {}); // reap zombie
      await unlink(outFilePath).catch(() => {});
      throw new Error(`execToFile failed with ${(err as Error).message}`, { cause: err });
    }
  }

  /** runs a command and streams the output lines in batches */
  public execStream(args: string[], write: (x: string[]) => void | Promise<unknown>, linesBatch = 1024) {
    const sink = write.length === 0 ? syncSink(write) : asyncSink(write as (b: string[]) => Promise<unknown>);
    return pipeline(this.exec(args).stdout, linesBatchedTransform(linesBatch), sink);
  }

  // sets up an external git repo for workTree
  // cmd: git --git-dir=/r/gitRoot/test2.git --work-tree=/r/read-only init
  static initExternalGit(gitDir: TGitDirPath, workTree: TFolderPath): Promise<GitShell> {
    const shell = new GitShell(gitDir);
    return shell.execStream(["--work-tree", `"${workTree}"`, "init"], console.log).then(() => shell);
  }

  /**
   * Returns the hash (SHA-1) of the first commit in the current branch’s history.
   * If the repository is empty the promise resolves to an empty string.
   */
  public getFirstCommitHash(): Promise<string> {
    let firstSha = "";

    return this.execStream(["rev-list", "--reverse", "--max-parents=0", "HEAD"], (lines: string[]) => {
      if (lines.length) firstSha = lines[0].trim();
    }).then(() => firstSha);
  }
}
