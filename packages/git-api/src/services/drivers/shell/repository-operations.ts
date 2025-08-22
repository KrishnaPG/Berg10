import type { IRepoInfo } from "../../types";
import { git, IRepoBase } from "./helpers";

export class RepositoryOperations extends IRepoBase {
  async getInfo(): Promise<IRepoInfo> {
    const tasks = [
      git(this.repoPath, ["rev-parse", "HEAD"]),
      git(this.repoPath, ["symbolic-ref", "--short", "HEAD"]),
      git(this.repoPath, ["config", "--get", "remote.origin.url"]),
      git(this.repoPath, ["log", "-1", "--format=%H|%an|%ae|%ad|%s", "--date=iso-strict"]),
      git(this.repoPath, ["diff", "--numstat"]),
      git(this.repoPath, ["describe", "--tags", "--exact-match", "HEAD"]),
    ];

    const [head, branch, remote, log, diff, tag] = await Promise.allSettled(tasks);

    // helper to get stdout or empty string
    const val = (p: PromiseSettledResult<any>) => (p.status === "fulfilled" ? p.value.output.trim() : "");

    // parse log line
    const [sha, author, email, date, subject] = val(log).split("|");

    return {
      head: val(head) || sha,
      branch: val(branch) || val(head).slice(0, 7),
      remote: val(remote) || undefined,
      author,
      email,
      date,
      subject,
      clean: val(diff) === "",
      tag: val(tag) || undefined,
    };
  }
}
