import type { TFilePath, TFolderPath } from "@shared/types";
import { type TGitDirPath, TGitRepoRootPath } from "@shared/types/git.types";
import path from "path";
import { NotAGitRepo } from "./helpers";
import { linesBatchedTransform } from "./lines-batched-transform";

export class GitRepo {
  protected gitDirArgs: string[];

  constructor(public _gitDir: TGitDirPath) {
    this.gitDirArgs = ["--git-dir", `"${_gitDir}"`];
  }

  public get gitDir() {
    return this._gitDir;
  }
  public get packDir() {
    return path.resolve(this.gitDir, "objects", "pack");
  }

  private shellStream(args: string[], write: UnderlyingSinkWriteCallback<string[]>, linesBatch = 1024) {
    return Bun.spawn(["git", ...this.gitDirArgs, ...args], {
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

  // read the idx file and append the content to output file
  public loadIDXFile(idxPath: TFilePath): Promise<string> {
    let outLines = "";
    return this.shellStream(["verify-pack", "-v", idxPath], (idsLinesBatch: string[]) => {
      idsLinesBatch.forEach((idxLine) => {
        const m = idxLine.match(/^([0-9a-f]{40})\s+(\w+)\s+(\d+)\s+(\d+)$/);
        if (!m) return; // skip unwanted lines
        const [, sha, type, size, offset] = m;
        outLines += `${sha}\t${type}\t${size}\t${offset}\n`;
      });
    }).then(() => outLines);
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
