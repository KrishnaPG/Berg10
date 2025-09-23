import type { Dirent, Stats } from "node:fs";
import { opendir, stat, unlink } from "node:fs/promises";
import { cpus } from "node:os";
import { join } from "node:path";
import fastq from "fastq"; // tiny worker-queue
import type { TFilePath, TFolderPath } from "../types/";

async function* readdir(root: string, filterExts: string[]): AsyncGenerator<TFilePath> {
  const dir = await opendir(root);

  for await (const dirent of dir) {
    const fullPath = join(root, dirent.name);

    if (dirent.isDirectory())
      yield* readdir(fullPath, filterExts); // recurse in sub-folder

    else if (dirent.isFile()) {
      // check if extension is matching
      const ext = dirent.name.split(".").pop()?.toLowerCase();
      if (ext && filterExts.includes(ext)) yield fullPath as TFilePath;
      else {
        // check if file is zero sized
        const stats = await stat(fullPath);
        if (stats.size === 0) yield fullPath as TFilePath;
      }
    }
  }
}

const worker = fastq.promise((path: TFilePath) => unlink(path).then(() => console.log("deleted", path)), cpus().length); // saturate I/O

/** deletes zero-length files and files that match the given extensions */
export async function cleanupFiles(root: TFolderPath, exts: string[]) {
  for await (const filePath of readdir(root, exts)) 
      worker.push(filePath);

  return worker.drained().then(() => console.log("done"));
}
