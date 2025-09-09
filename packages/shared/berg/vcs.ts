import type { GitRepo } from "@shared/git-shell";
import fs from "fs-extra";
import os from "os";
import path from "path";
import type { FsVCSManager } from "./manager";

/** ---------- Packfile Index Builder (idempotent) ----------
 *
 * One-time, idempotent helper that builds a fast look-up table
 * from every object SHA-1 that lives inside a pack-file to the physical
 * location of that object (which pack it is in and at what byte offset).
 *
 * Later, when the main loop streams `git ls-tree`, it can immediately tell
 * whether an object is packed and where to find it, without having to open
 * every pack again.
 *
 * The pack index data is available as parquet files for DuckLake:
 *  `CREATE VIEW pack_index AS SELECT * FROM '<FsVCSRoot>/<sha>.git/pack_index/*.parquet'`;
 */
export function buildGitPackIndex(this: FsVCSManager, srcGitRepo: GitRepo) {
  /* 1. locate .git/objects/pack */
  const srcPackDir = srcGitRepo.packDir;
  if (!fs.existsSync(srcPackDir)) return;

  /* 2. iterate over *.idx files */
  const srcIdxFiles = fs
    .readdirSync(srcPackDir)
    .filter((f) => f.endsWith(".idx"))
    .map((f) => path.join(srcPackDir, f));

  const p = []; // batch multiples idx loads

  /* 3. write the .idx file content to tsv and use DuckDB
        to transform it as .parquet file.
   */
  for (const srcIdxPath of srcIdxFiles) {
    const packName = path.basename(srcIdxPath, ".idx"); // "pack-1234…"
    if (db.packsDone.get(packName)) continue; // already captured

    // duckDB temp and final filenames (in the VCS/<imported_repo_name>/.git/ folder)
    const tmpFilePath = path.resolve(os.tmpdir(), "pack_index", `${packName}.tmp`);
    const finalFilePath = path.resolve(os.tmpdir(), "pack_index", `${packName}.parquet`);
  }
}
