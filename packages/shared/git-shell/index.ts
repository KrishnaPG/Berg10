import type { TFolderPath } from "@shared/types";
import type { TGitDirPath } from "@shared/types/git.types";
import path from "path";
import { linesBatchedTransform } from "./lines-batched-transform";

export class GitRepo {
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

  public shellStream(args: string[], write: UnderlyingSinkWriteCallback<string[]>, linesBatch = 1024) {
    const cmd = ["git", ...this.gitDirArgs, ...args];
    console.log(cmd);
    return Bun.spawn(cmd, {
      stdout: "pipe",
      stderr: "inherit",
    })
      .stdout.pipeThrough(linesBatchedTransform(linesBatch))
      .pipeTo(new WritableStream<string[]>({ write }));
  }

  // sets up an external git repo for workTree
  // cmd: git --git-dir=/r/gitRoot/test2.git --work-tree=/r/read-only init
  static initExternalGit(gitDir: TGitDirPath, workTree: TFolderPath): Promise<GitRepo> {
    const repo = new GitRepo(gitDir);
    return repo.shellStream(["--work-tree", `"${workTree}"`, "init"], console.log).then(() => repo);
  }

  /**
   * Returns the hash (SHA-1) of the first commit in the current branch’s history.
   * If the repository is empty the promise resolves to an empty string.
   */
  public getFirstCommitHash(): Promise<string> {
    let firstSha = "";

    return this.shellStream(["rev-list", "--reverse", "--max-parents=0", "HEAD"], (lines: string[]) => {
      if (lines.length) firstSha = lines[0].trim();
    }).then(() => firstSha);
  }
}
