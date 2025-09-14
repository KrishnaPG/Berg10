import type { GitRepo } from "@shared/git-shell";
import type {
  TFilePath,
  TFsVcsDbPIFilePath,
  TFsVcsDbPIFolderPath,
  TFsVcsDbPIName,
  TFsVcsDotDBPath,
  TFsVcsDotGitPath,
  TFsVcsRepoId,
} from "@shared/types";
import type { TFsVCSRootPath } from "@shared/types/fs-vcs.types";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { streamIDXtoParquet } from "./idx-to-parquet";
import type { ImportsLMDB } from "./lmdb-manager";
import { TransactionalParquetWriter } from "./parquet-writer";
import type { FsVCSManager } from "./vcs-manager";

export class FsVCS {
  constructor(
    protected dotGitFolder: TFsVcsDotGitPath,
    protected dotDBFolder: TFsVcsDotDBPath,
    protected importsDB: ImportsLMDB,
  ) {}
  public static getInstance(vcsMgr: FsVCSManager, vcsRepoId: TFsVcsRepoId): Promise<FsVCS> {
    const instance = new FsVCS(
      path.resolve(vcsMgr.vcsRootFolder, `${vcsRepoId}.git`) as TFsVcsDotGitPath,
      path.resolve(vcsMgr.vcsRootFolder, `${vcsRepoId}.db`) as TFsVcsDotDBPath,
      vcsMgr.importsDB,
    );
    return fs.ensureDir(instance.dbPIFolderPath).then(() => instance);
  }
  get dbPIFolderPath(): TFsVcsDbPIFolderPath {
    return path.resolve(this.dotDBFolder, "pack-index") as TFsVcsDbPIFolderPath;
  }
  getDBPackFilePath(packName: TFsVcsDbPIName): TFsVcsDbPIFilePath {
    return path.resolve(this.dbPIFolderPath, `${packName}.parquet`) as TFsVcsDbPIFilePath;
  }
  isPackImported(packName: TFsVcsDbPIName): boolean {
    return fs.existsSync(this.getDBPackFilePath(packName));
  }

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
  async buildGitPackIndex(srcGitRepo: GitRepo) {
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
      const packName = path.basename(srcIdxPath, ".idx") as TFsVcsDbPIName; // "pack-1234…"
      if (this.isPackImported(packName)) continue; // already captured

      p.push(streamIDXtoParquet(srcGitRepo, srcIdxPath as TFilePath, this.dbPIFolderPath, packName));

      if (p.length >= 4) await Promise.all(p).then(() => (p.length = 0)); // do not stress the system too much
    }
    return Promise.all(p); // wait for any pending promises
  }
}

/** writes the given tsv content to DuckDB table */
function saveTSVToDuckDB(tsvLines: string, dbFile: string) {
  const sql = `COPY (
  SELECT * FROM read_csv_auto(${JSON.stringify(tsvLines)}, delim='\t', header=false,  columns={sha:'VARCHAR',type:'VARCHAR',size:'UBIGINT',offset:'UBIGINT'})
  ) TO ${dbFile} (FORMAT PARQUET, COMPRESSION ZSTD)`;
  return Promise.resolve(sql);
}
