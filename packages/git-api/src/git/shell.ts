import { join } from "path";
import { CONFIG } from "../config";
import type { FileEntry } from "../types";
import type { IGitBackend } from "./base";

async function git(repo: string, args: string[], options?: { stdin?: string }): Promise<string> {
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

export class ShellBackend implements IGitBackend {
  kind: "shell" = "shell";
  async init(repoPath: string) {
    await git(repoPath, ["init"]);
  }
  async listFiles(repo: string, rev: string, path?: string, recursive?: boolean) {
    const out = await git(repo, ["ls-tree", "-r", rev, ...(path ? [path] : [])]);
    return out
      .trim()
      .split("\n")
      .map((l) => {
        const [mode, type, sha, ...rest] = l.split(/\s/);
        return { path: rest.join(" "), mode, sha };
      });
  }
  async stageFile(repo: string, path: string, patch?: string) {
    if (patch) {
      await git(repo, ["apply", "--cached", "--recount", "--unidiff-zero", "-"], { stdin: patch });
    } else {
      await git(repo, ["add", path]);
    }
  }
  async stashSave(repo: string, message?: string, includeUntracked?: boolean) {
    const out = await git(repo, [
      "stash",
      "create",
      ...(message ? ["-m", message] : []),
      ...(includeUntracked ? ["-u"] : []),
    ]);
    return out.trim();
  }
  async revertCommit(repo: string, sha: string) {
    const out = await git(repo, ["revert", "--no-edit", sha]);
    return out.trim();
  }
  async diffCommits(repo: string, from: string, to: string) {
    return await git(repo, ["diff", `${from}..${to}`]);
  }
}
