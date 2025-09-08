import type { TFilePath, TFolderPath } from "@shared/types";
import { type TGitDirPath, TGitRepoRootPath } from "@shared/types/git.types";
import { NotAGitRepo } from "./helpers";
import { linesBatchedTransform } from "./lines-batched-transform";
import { gitShellStream } from "./stream";

export class GitRepo {
  protected gitDirArgs: string[];

  constructor(gitDir: TGitDirPath) {
    this.gitDirArgs = ["--git-dir", `"${gitDir}"`];
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
}
