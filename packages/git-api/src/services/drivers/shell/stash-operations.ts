import type {
  IStash,
  TCommitMessage,
  TBranch,
} from "../../types";
import { git } from "./helpers";

export class StashOperations {
 // Stash operations
  async listStashes(): Promise<IStash[]> {
    const out = await git(".", ["stash", "list", "--format=%gd|%s|%an|%ae|%ad"]);
    return out
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        const [id, message, authorName, authorEmail, date] = line.split("|");
        return {
          id,
          message,
          created_at: date,
          branch: "" as TBranch, // Would need to parse from stash ref
          stats: {
            files_changed: 0,
            insertions: 0,
            deletions: 0,
          },
          url: "",
        };
      });
  }

  async saveStash(message?: TCommitMessage, includeUntracked?: boolean): Promise<IStash> {
    const args = ["stash", "create"];
    if (message) args.push("-m", message);
    if (includeUntracked) args.push("-u");

    const out = await git(".", args);
    const sha = out.trim();

    return {
      id: `stash@{0}`, // Simplified
      message: message || "WIP",
      created_at: new Date().toISOString(),
      branch: "" as TBranch, // Would need to determine current branch
      stats: {
        files_changed: 0,
        insertions: 0,
        deletions: 0,
      },
      url: "",
    };
  }

  async applyStash(index?: number): Promise<void> {
    const args = ["stash", "apply"];
    if (index !== undefined) args.push(`stash@{${index}}`);
    await git(".", args);
  }

  async dropStash(index?: number): Promise<void> {
    const args = ["stash", "drop"];
    if (index !== undefined) args.push(`stash@{${index}}`);
    await git(".", args);
  }
}