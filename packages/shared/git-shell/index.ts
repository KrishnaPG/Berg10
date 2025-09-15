import type { TFilePath, TFolderPath } from "@shared/types";
import type { TGitDirPath } from "@shared/types/git.types";
import fs from "fs-extra";
import path from "path";
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
    const cmd = ["git", ...this.gitDirArgs, ...args];
    console.log(cmd);
    return Bun.spawn(cmd, {
      stdout: "pipe",
      stderr: "inherit", // pipe to stderr of child process to the parent (this)
      ...options,
    });
  }

  /** runs a command and saves the output to a file */
  public execToFile(args: string[], outFilePath: TFilePath): Promise<Bun.BunFile> {
    const file = Bun.file(outFilePath);
    return this.exec(args, { stdout: file }).exited.then((exitCode) => {
      // if some problem, delete the file and throw error
      if (!exitCode) {
        file.unlink().finally(() => {
          throw new Error(`Command "${args.join(" ")}" exited with code ${exitCode}`);
        });
      }
      // no problem, return the file instance
      return file;
    });
  }

  /** runs a command and streams the output lines in batches */
  public execStream(args: string[], write: UnderlyingSinkWriteCallback<string[]>, linesBatch = 1024) {
    return this.exec(args)
      .stdout.pipeThrough(linesBatchedTransform(linesBatch))
      .pipeTo(new WritableStream<string[]>({ write }));
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
