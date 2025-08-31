import type {
  ICompareCommitsOptions,
  IDiff,
  IDiffFile,
  IDiffHunk,
  IDiffLine,
  IGetCommitDiffOptions,
  TPath,
  TSha,
} from "../../types";
import { IRepoBase, okGit } from "./helpers";

export class DiffOperations extends IRepoBase {
  // Diff operations
  async diffCommits(from: TSha, to: TSha, options?: ICompareCommitsOptions): Promise<IDiff[]> {
    const args = ["diff", "--numstat", "--summary", `${from}..${to}`];
    if (options?.path) args.push("--", options.path);

    const out = await okGit(this.repoPath, args);
    const diff = await this.parseDiffOutput(out, from, to);
    return [diff];
  }

  async diffIndex(treeish: TSha, options?: ICompareCommitsOptions): Promise<IDiff[]> {
    const args = ["diff", "--numstat", "--summary", treeish];
    if (options?.path) args.push("--", options.path);

    const out = await okGit(this.repoPath, args);
    const diff = await this.parseDiffOutput(out, treeish, "HEAD" as TSha);
    return [diff];
  }

  async diffWorktree(path?: TPath): Promise<IDiff[]> {
    const args = ["diff", "--numstat", "--summary"];
    if (path) args.push("--", path);

    const out = await okGit(this.repoPath, args);
    const diff = await this.parseDiffOutput(out, "HEAD" as TSha, "working" as TSha);
    return [diff];
  }

  async getCommitDiff(sha: TSha, options?: IGetCommitDiffOptions): Promise<IDiff> {
    const args = ["show", "--numstat", "--summary", sha];
    if (options?.path) args.push("--", options.path);

    const out = await okGit(this.repoPath, args);
    return this.parseDiffOutput(out, `${sha}^` as TSha, sha);
  }

  async getStagedDiff(options?: ICompareCommitsOptions): Promise<IDiff> {
    const args = ["diff", "--cached", "--numstat", "--summary"];
    if (options?.path) args.push("--", options.path);

    const out = await okGit(this.repoPath, args);
    return this.parseDiffOutput(out, "HEAD" as TSha, "index" as TSha);
  }

  private async parseDiffOutput(output: string, from: TSha, to: TSha): Promise<IDiff> {
    const lines = output.split("\n").filter((line) => line.trim());
    
    const diff: IDiff = {
      repo: this.repoPath,
      from,
      to,
      files: [],
      stats: {
        total_files: 0,
        total_additions: 0,
        total_deletions: 0,
        total_changes: 0,
      },
      url: this.generateDiffUrl(from, to),
      html_url: this.generateHtmlDiffUrl(from, to),
    };

    if (lines.length === 0) return diff;

    let currentFile: IDiffFile | null = null;
    const numstatLines: string[] = [];
    const summaryLines: string[] = [];

    // Separate numstat and summary sections
    for (const line of lines) {
      if (line.match(/^\d+\s+\d+\s+/)) {
        numstatLines.push(line);
      } else if (line.startsWith(" ") || line.match(/^\w+\s+mode/)) {
        summaryLines.push(line);
      }
    }

    // Parse numstat lines
    for (const line of numstatLines) {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const additions = parts[0] === "-" ? 0 : parseInt(parts[0], 10);
        const deletions = parts[1] === "-" ? 0 : parseInt(parts[1], 10);
        const filename = parts[2];

        currentFile = {
          filename: filename as TPath,
          status: "modified",
          additions,
          deletions,
          changes: additions + deletions,
          blob_url: this.generateBlobUrl(filename, to),
          raw_url: this.generateRawUrl(filename, to),
          contents_url: this.generateContentsUrl(filename, to),
        };

        diff.files.push(currentFile);
        diff.stats.total_files++;
        diff.stats.total_additions += additions;
        diff.stats.total_deletions += deletions;
        diff.stats.total_changes += additions + deletions;
      }
    }

    // Parse summary lines to determine file status
    for (const line of summaryLines) {
      const createMatch = line.match(/^\s*create\s+mode\s+\d+\s+(.+)$/);
      const deleteMatch = line.match(/^\s*delete\s+mode\s+\d+\s+(.+)$/);
      const renameMatch = line.match(/^\s*rename\s+(.+)\s+\(\d+%\)\s+(.+)$/);
      const copyMatch = line.match(/^\s*copy\s+from\s+(.+)\s+to\s+(.+)$/);

      if (createMatch) {
        const [, filename] = createMatch;
        const file = diff.files.find((f) => f.filename === filename);
        if (file) file.status = "added";
      } else if (deleteMatch) {
        const [, filename] = deleteMatch;
        const file = diff.files.find((f) => f.filename === filename);
        if (file) file.status = "deleted";
      } else if (renameMatch) {
        const [, oldFilename, newFilename] = renameMatch;
        const file = diff.files.find((f) => f.filename === newFilename);
        if (file) {
          file.status = "renamed";
          file.old_filename = oldFilename as TPath;
        }
      } else if (copyMatch) {
        const [, fromFilename, toFilename] = copyMatch;
        const file = diff.files.find((f) => f.filename === toFilename);
        if (file) file.status = "copied";
      }
    }

    // Now get detailed diff with patches and hunks
    const detailedArgs = ["diff", "-U3"];
    if (from === "working") {
      detailedArgs.push("HEAD");
    } else if (to === "working") {
      detailedArgs.push("HEAD");
    } else if (to === "index") {
      detailedArgs.push("--cached");
    }  else {
      detailedArgs.push(`${from}..${to}`);
    }
    
    if (from === "HEAD" && to === "index") {
      detailedArgs.push("--cached");
    }

    try {
      const detailedOut = await okGit(this.repoPath, detailedArgs);
      this.parseDetailedDiff(detailedOut, diff);
    } catch (error) {
      // If detailed diff fails, return basic diff without patches
      console.warn("Failed to get detailed diff:", error);
    }

    return diff;
  }

  private parseDetailedDiff(output: string, diff: IDiff): void {
    const lines = output.split("\n");
    let currentFile: IDiffFile | null = null;
    let currentHunk: IDiffHunk | null = null;
    const patchLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("diff --git")) {
        // Finalize previous file
        if (currentFile && patchLines.length > 0) {
          currentFile.diff = patchLines.join("\n");
        }

        const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
        if (match) {
          const [, oldPath, newPath] = match;
          currentFile = diff.files.find((f) => f.filename === newPath) || null;
          if (currentFile) {
            patchLines.length = 0;
            patchLines.push(line);
            currentFile.hunks = [];
          }
        }
        currentHunk = null;
      } else if (line.startsWith("---") || line.startsWith("+++")) {
        patchLines.push(line);
      } else if (line.startsWith("@@")) {
        // Finalize previous hunk
        if (currentHunk && currentFile) {
          currentFile.hunks?.push(currentHunk);
        }

        const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
        if (hunkMatch && currentFile) {
          const [, oldStart, oldLines = "1", newStart, newLines = "1", header] = hunkMatch;

          currentHunk = {
            old_start: parseInt(oldStart, 10),
            old_lines: parseInt(oldLines, 10),
            new_start: parseInt(newStart, 10),
            new_lines: parseInt(newLines, 10),
            header: line,
            lines: [],
          };
        }
        patchLines.push(line);
      } else if (currentHunk && currentFile) {
        // Line within hunk
        let type: "added" | "deleted" | "context" = "context";
        if (line.startsWith("+")) {
          type = "added";
        } else if (line.startsWith("-")) {
          type = "deleted";
        }

        const diffLine: IDiffLine = {
          type,
          content: line,
        };

        // Calculate line numbers
        if (type === "context" || type === "deleted") {
          diffLine.old_line = currentHunk.old_start +
            currentHunk.lines.filter((l) => l.type === "context" || l.type === "deleted").length;
        }
        if (type === "context" || type === "added") {
          diffLine.new_line = currentHunk.new_start +
            currentHunk.lines.filter((l) => l.type === "context" || l.type === "added").length;
        }

        currentHunk.lines.push(diffLine);
        patchLines.push(line);
      } else {
        patchLines.push(line);
      }
    }

    // Finalize last file
    if (currentFile && patchLines.length > 0) {
      currentFile.diff = patchLines.join("\n");
    }
    if (currentHunk && currentFile) {
      currentFile.hunks?.push(currentHunk);
    }
  }

  private generateDiffUrl(from: TSha, to: TSha): string {
    // This would need to be configured based on the actual repository hosting service
    // For now, return a placeholder
    return `https://github.com/user/repo/compare/${from}...${to}`;
  }

  private generateHtmlDiffUrl(from: TSha, to: TSha): string {
    return this.generateDiffUrl(from, to);
  }

  private generateBlobUrl(filename: string, sha: TSha): string {
    return `https://github.com/user/repo/blob/${sha}/${filename}`;
  }

  private generateRawUrl(filename: string, sha: TSha): string {
    return `https://github.com/user/repo/raw/${sha}/${filename}`;
  }

  private generateContentsUrl(filename: string, sha: TSha): string {
    return `https://api.github.com/repos/user/repo/contents/${filename}?ref=${sha}`;
  }
}
