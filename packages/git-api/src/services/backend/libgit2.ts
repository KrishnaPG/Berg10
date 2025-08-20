import { join } from "path";
import { CONFIG } from "../../config";
import type { IGitBackend } from "../../git/base";
import type { FileEntry } from "../types";

// Stub native addon (compiled with bun build --compile --target=bun-linux-x64)
declare module "libgit2-addon" {
  export function init(path: string): Promise<void>;
  export function listFiles(repo: string, rev: string, p?: string, r?: boolean): FileEntry[];
  export function stage(repo: string, path: string, patch?: string): void;
  export function stashSave(repo: string, msg?: string, untracked?: boolean): string;
  export function revert(repo: string, sha: string): string;
  export function diff(repo: string, a: string, b: string): string;
}

export class LibGit2Backend implements IGitBackend {
  kind: "libgit2" = "libgit2";
  async init(repoPath: string) {
    await import("libgit2-addon").then((m) => m.init(join(CONFIG.REPO_BASE, repoPath)));
  }
  async listFiles(repo: string, rev: string, path?: string, recursive?: boolean) {
    const m = await import("libgit2-addon");
    return m.listFiles(join(CONFIG.REPO_BASE, repo), rev, path, recursive);
  }
  async stageFile(repo: string, path: string, patch?: string) {
    const m = await import("libgit2-addon");
    m.stage(join(CONFIG.REPO_BASE, repo), path, patch);
  }
  async stashSave(repo: string, message?: string, includeUntracked?: boolean) {
    const m = await import("libgit2-addon");
    return m.stashSave(join(CONFIG.REPO_BASE, repo), message, includeUntracked);
  }
  async revertCommit(repo: string, sha: string) {
    const m = await import("libgit2-addon");
    return m.revert(join(CONFIG.REPO_BASE, repo), sha);
  }
  async diffCommits(repo: string, from: string, to: string) {
    const m = await import("libgit2-addon");
    return m.diff(join(CONFIG.REPO_BASE, repo), from, to);
  }
}
