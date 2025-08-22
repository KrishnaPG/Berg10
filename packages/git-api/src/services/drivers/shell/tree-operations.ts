import { CONFIG } from "../../../config";
import type {
  IBlob,
  IDirectoryContent,
  IFileContent,
  IFileCreateUpdateRequest,
  IFileDeleteRequest,
  IGetFileContentOptions,
  ITree,
  ITreeCreateRequest,
  TPath,
  TSha,
} from "../../types";
import { git } from "./helpers";

export class TreeOperations {
  // Tree operations
  async listFiles(treeIsh: TSha, path?: TPath, recursive?: boolean): Promise<ITree> {
    const args = ["ls-tree", recursive ? "-r" : "", treeIsh];
    if (path) args.push(path);

    const out = await git(
      ".",
      args.filter((arg) => arg !== ""),
    );
    const entries = out
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        const [mode, type, sha, ...rest] = line.split(/\s/);
        const filePath = rest.join(" ");
        return {
          path: filePath as TPath,
          mode,
          type: type as "blob" | "tree",
          sha: sha as TSha,
          size: type === "blob" ? 0 : undefined, // Would need separate command to get size
          url: "",
        };
      });

    return {
      sha: treeIsh,
      url: "",
      tree: entries,
      truncated: false,
    };
  }

  async getBlob(treeIsh: TSha, path: TPath): Promise<Buffer> {
    const content = await git(".", ["show", `${treeIsh}:${path}`]);
    return Buffer.from(content, "utf-8");
  }

  async createTree(tree: ITreeCreateRequest): Promise<ITree> {
    // Creating a tree object in git requires using git mktree or similar low-level commands
    // This is a simplified implementation that would need to be expanded for full functionality
    
    // For each entry in the tree, we would need to:
    // 1. Ensure the object (blob or tree) exists
    // 2. Create the tree object using git mktree
    
    // This is a complex operation that would require significant implementation
    // For now, let's return a basic structure
    throw new Error("Tree creation is not fully implemented in the shell backend");
  }

  async createBlob(content: string, encoding?: "utf-8" | "base64"): Promise<IBlob> {
    const args = ["hash-object", "-w", "--stdin"];
    const process = Bun.spawn({
      cmd: ["git", "-C", CONFIG.REPO_BASE, ...args],
      stdout: "pipe",
      stdin: "pipe",
    });

    await process.stdin.write(content);
    process.stdin.end();

    const sha = await new Response(process.stdout).text();
    return {
      sha: sha.trim() as TSha,
      content,
      encoding: encoding || "utf-8",
      size: Buffer.byteLength(content, encoding),
      url: "",
    };
  }

  async getFileContents(
    path: TPath,
    options?: IGetFileContentOptions,
  ): Promise<IFileContent | IDirectoryContent> {
    const ref = options?.ref || "HEAD";

    // Check if it's a directory
    try {
      const out = await git(".", ["ls-tree", ref, path]);
      if (
        out
          .trim()
          .split("\n")
          .some((line) => line.includes(" tree "))
      ) {
        // It's a directory
        const entries = await this.listFiles(ref as TSha, path, false);
        return {
          name: path.split("/").pop() || path,
          path,
          sha: ref as TSha,
          size: 0,
          url: "",
          html_url: "",
          git_url: "",
          download_url: null,
          type: "dir",
          _links: {
            git: "",
            self: "",
            html: "",
          },
        };
      }
    } catch {
      // Continue to file handling
    }

    // It's a file
    const content = await git(".", ["show", `${ref}:${path}`]);
    const sha = await git(".", ["rev-parse", `${ref}:${path}`]);

    return {
      name: path.split("/").pop() || path,
      path,
      sha: sha.trim() as TSha,
      size: Buffer.byteLength(content, "utf-8"),
      url: "",
      html_url: "",
      git_url: "",
      download_url: "",
      type: "file",
      content: Buffer.from(content).toString("base64"),
      encoding: "base64",
      _links: {
        git: "",
        self: "",
        html: "",
      },
    };
  }

  async createOrUpdateFile(path: TPath, options: IFileCreateUpdateRequest): Promise<IFileContent> {
    // Write content to file
    const args = ["hash-object", "-w", "--stdin"];
    const process = Bun.spawn({
      cmd: ["git", "-C", CONFIG.REPO_BASE, ...args],
      stdout: "pipe",
      stdin: "pipe",
    });

    await process.stdin.write(options.content);
    process.stdin.end();

    const sha = await new Response(process.stdout).text();

    // Stage the file
    await git(".", ["update-index", "--add", "--cacheinfo", "100644", sha.trim(), path]);

    // Commit if message is provided
    if (options.message) {
      const commitArgs = ["commit", "-m", options.message];
      if (options.author) {
        commitArgs.push("--author", `${options.author.name} <${options.author.email}>`);
      }
      await git(".", commitArgs);
    }

    return {
      name: path.split("/").pop() || path,
      path,
      sha: sha.trim() as TSha,
      size: Buffer.byteLength(options.content, "utf-8"),
      url: "",
      html_url: "",
      git_url: "",
      download_url: "",
      type: "file",
      content: Buffer.from(options.content).toString("base64"),
      encoding: "base64",
      _links: {
        git: "",
        self: "",
        html: "",
      },
    };
  }

  async deleteFile(path: TPath, options: IFileDeleteRequest): Promise<void> {
    // Remove from index
    await git(".", ["rm", "--cached", path]);

    // Commit if message is provided
    if (options.message) {
      const commitArgs = ["commit", "-m", options.message];
      if (options.author) {
        commitArgs.push("--author", `${options.author.name} <${options.author.email}>`);
      }
      await git(".", commitArgs);
    }
  }
}