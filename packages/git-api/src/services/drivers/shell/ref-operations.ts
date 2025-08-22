import type {
  IBranch,
  IRef,
  IRefUpdateRequest,
  ITag,
  ITagCreateRequest,
  TBranch,
  TRefKind,
  TSha,
  TTagName,
} from "../../types";
import { gitStream, IRepoBase, okGit, parseRefLines } from "./helpers";

export class RefOperations extends IRepoBase {
  // Ref operations
  async listRefs(type?: TRefKind | "all"): Promise<IRef[]> {
    const args = ["for-each-ref", '--format="%(refname:short) %(objectname) %(objecttype)"'];

    if (type === "branch") args.push("refs/heads/");
    else if (type === "tag") args.push("refs/tags/");
    else args.push("refs/heads/", "refs/tags/");

    const refs: IRef[] = [];
    let chunk = "";
    for await (const data of gitStream(this.repoPath, args)) {
      chunk += data;
      const lastNL = chunk.lastIndexOf("\n");
      if (lastNL === -1) continue;

      for (const [name, sha, type] of parseRefLines(chunk.slice(0, lastNL))) {
        refs.push({
          name,
          ref: sha as TSha,
          object: { type, sha: sha as TSha },
          url: "",
        });
      }
      chunk = chunk.slice(lastNL + 1);
    }
    return refs;
  }

  async getRef(name: string): Promise<IRef | null> {
    try {
      const { output: out } = await okGit(this.repoPath, ["rev-parse", name]);
      const sha = out.trim() as TSha;
      return {
        name,
        ref: sha,
        object: {
          type: "commit", // Simplified assumption
          sha,
        },
        url: "",
      };
    } catch {
      return null;
    }
  }

  async createRef(name: string, sha: TSha, type: TRefKind): Promise<void> {
    if (type === "branch") {
      await okGit(this.repoPath, ["branch", name, sha]);
    } else {
      await okGit(this.repoPath, ["tag", name, sha]);
    }
  }

  async deleteRef(name: string): Promise<void> {
    // Determine if it's a branch or tag
    if (name.startsWith("refs/heads/") || !name.includes("/")) {
      const branchName = name.replace("refs/heads/", "");
      await okGit(this.repoPath, ["branch", "-D", branchName]);
    } else if (name.startsWith("refs/tags/")) {
      const tagName = name.replace("refs/tags/", "");
      await okGit(this.repoPath, ["tag", "-d", tagName]);
    } else {
      // Try branch first, then tag
      try {
        await okGit(this.repoPath, ["branch", "-D", name]);
      } catch {
        await okGit(this.repoPath, ["tag", "-d", name]);
      }
    }
  }

  async renameRef(oldName: string, newName: string): Promise<void> {
    await okGit(this.repoPath, ["branch", "-m", oldName, newName]);
  }

  async createBranch(name: TBranch, ref: TSha, startPoint?: TSha): Promise<IBranch> {
    await okGit(this.repoPath, ["branch", name, startPoint || ref]);
    return {
      name,
      ref,
      object: {
        type: "commit",
        sha: ref,
      },
      url: "",
      type: "branch",
      commit: {
        sha: ref,
        message: "",
        author: { name: "", email: "", date: "" },
        committer: { name: "", email: "", date: "" },
        timestamp: "",
        url: "",
      },
    };
  }

  async createTag(name: TTagName, ref: TSha, options?: ITagCreateRequest): Promise<ITag> {
    const args = ["tag"];
    if (options?.message) {
      args.push("-m", options.message);
    }
    if (options?.lightweight === false) {
      args.push("-a");
    }
    args.push(name, ref);
    await okGit(this.repoPath, args);

    return {
      name,
      ref,
      object: {
        type: "commit",
        sha: ref,
      },
      url: "",
      type: "tag",
      commit: {
        sha: ref,
        message: options?.message || "",
        author: { name: "", email: "", date: "" },
        committer: { name: "", email: "", date: "" },
        timestamp: "",
        url: "",
      },
    };
  }

  async updateRef(ref: string, options: IRefUpdateRequest): Promise<IRef> {
    await okGit(this.repoPath, ["update-ref", ref, options.ref]);
    return {
      name: ref,
      ref: options.ref,
      object: {
        type: "commit",
        sha: options.ref,
      },
      url: "",
    };
  }

  async switchBranch(name: TBranch): Promise<void> {
    await okGit(this.repoPath, ["checkout", name]);
  }
}
