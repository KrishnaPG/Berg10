import type {
  IBlameInfo,
  ICommitLogEntry,
  IFileHistoryEntry,
  IGetCommitLogOptions,
  IGetFileHistoryOptions,
  IPaginatedResponse,
  TBranch,
  TPath,
  TSha,
} from "../../types";
import { IRepoBase, okGit } from "./helpers";

export class LogOperations extends IRepoBase {
  // Log operations
  async getCommitLog(options?: IGetCommitLogOptions): Promise<IPaginatedResponse<ICommitLogEntry>> {
    const args = ["log", "--format=%H|%s|%an|%ae|%ad|%cn|%ce|%cd", "--date=iso"];

    if (options?.ref) args.push(options.ref);
    if (options?.path) args.push("--", options.path);
    if (options?.author) args.push("--author", options.author);
    if (options?.since) args.push("--since", options.since);
    if (options?.until) args.push("--until", options.until);
    if (options?.per_page) args.push(`-n${options.per_page}`);
    else args.push("-n30"); // Default limit

    const out = await okGit(this.repoPath, args);
    const items = out
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        const [sha, message, authorName, authorEmail, authorDate, committerName, committerEmail, committerDate] =
          line.split("|");
        return {
          sha: sha as TSha,
          message,
          author: {
            name: authorName,
            email: authorEmail,
            date: authorDate,
          },
          committer: {
            name: committerName,
            email: committerEmail,
            date: committerDate,
          },
          timestamp: authorDate,
          url: "",
          html_url: "",
        };
      });

    return {
      pagination: {
        total_items: items.length,
        total_pages: 1,
        current_page: 1,
        per_page: items.length,
      },
      items,
    };
  }

  async getFileHistory(path: TPath, options?: IGetFileHistoryOptions): Promise<IPaginatedResponse<IFileHistoryEntry>> {
    const args = ["log", "--format=%H|%s|%an|%ae|%ad|%cn|%ce|%cd", "--date=iso", "--follow", "--", path];

    if (options?.ref) args.push(options.ref);
    if (options?.since) args.push("--since", options.since);
    if (options?.until) args.push("--until", options.until);
    if (options?.per_page) args.push(`-n${options.per_page}`);
    else args.push("-n30"); // Default limit

    const out = await okGit(this.repoPath, args);
    const items: IFileHistoryEntry[] = out
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        const [sha, message, authorName, authorEmail, authorDate, committerName, committerEmail, committerDate] =
          line.split("|");
        return {
          sha: sha as TSha,
          message,
          author: {
            name: authorName,
            email: authorEmail,
            date: authorDate,
          },
          committer: {
            name: committerName,
            email: committerEmail,
            date: committerDate,
          },
          timestamp: authorDate,
          url: "",
          html_url: "",
          file: {
            path,
            status: "modified", // Simplified
            changes: {
              additions: 0,
              deletions: 0,
              total: 0,
            },
            blob_url: "",
            raw_url: "",
          },
        };
      });

    return {
      pagination: {
        total_items: items.length,
        total_pages: 1,
        current_page: 1,
        per_page: items.length,
      },
      items,
    };
  }

  async blame(path: TPath, rev?: TBranch): Promise<IBlameInfo> {
    const args = ["blame", "--porcelain", path];
    if (rev) args.unshift(rev);

    const out = await okGit(this.repoPath, args);
    // Simplified parsing - in reality this would need complex parsing of porcelain format
    return {
      file: {
        path,
        size: 0, // Would need separate command to get file size
        lines: 0, // Would need to count lines
      },
      ref: rev || ("HEAD" as TBranch),
      ranges: [],
      commits: {},
    };
  }
}
