import { setupLake } from "@shared/ducklake";
import { GitShell } from "@shared/git-shell";
import { assertRepo, NotAGitRepo } from "@shared/git-shell/helpers";
import type {
  TBergPath,
  TDriftPath,
  TDuckLakeDBName,
  TFolderPath,
  TLMDBRootPath,
  TMSSinceEpoch,
  TName,
} from "@shared/types";
import type { TFsDLRootPath } from "@shared/types/fs-dl.types";
import type { TFsVCSRootPath } from "@shared/types/fs-vcs.types";
import type { TGitDirPath, TGitRepoRootPath, TWorkTreePath } from "@shared/types/git.types";
import fs from "fs-extra";

import path from "path";
import { LMDBManager } from "./lmdb-manager";
import { FsVCSManager } from "./vcs-manager";

export class BergManager {
  constructor(
    protected _bergPath: TBergPath,
    protected _dbMgr: LMDBManager,
    protected _vcsMgr: FsVCSManager,
  ) {}

  get vcs() {
    return this._vcsMgr;
  }
  get bergPath() {
    return this._bergPath;
  }
  get db() {
    return this._dbMgr;
  }

  // bergPath should already exist
  public static open(bergPath: TBergPath): Promise<BergManager> {
    console.log(`Opening ${bergPath} ...`);
    const fsVCSRootpath: TFsVCSRootPath = path.resolve(bergPath, "vcs") as TFsVCSRootPath;
    const fsDLRootPath: TFsDLRootPath = path.resolve(bergPath, "dl") as TFsDLRootPath;
    const lmdbRootPath: TLMDBRootPath = path.resolve(bergPath, "db") as TLMDBRootPath;

    const bMgr: BergManager = new BergManager(
      bergPath,
      new LMDBManager(lmdbRootPath),
      new FsVCSManager(fsVCSRootpath),
    );
    bMgr._vcsMgr._resetManager(bMgr);
    bMgr._dbMgr._resetManager(bMgr);

    return Promise.resolve(bMgr);
  }

  /**
   * Initialize the orchestrator on application startup. Creates the folder structure if needed. */
  public static initialize(
    userHome: TDriftPath, // the target path, usually user home `~/`
    templDir: TFolderPath, // path of the "template" folder that has `.berg10/` inside
    bergName: string = ".berg10", // the target bergName, if needs to be changed while copying
  ): Promise<BergManager> {
    const destPath: TBergPath = path.resolve(userHome, bergName) as TBergPath;
    const srcPath: TFolderPath = path.resolve(templDir, ".berg10") as TFolderPath;
    // check if already exists, else copy the template folder to init
    return Bun.file(destPath)
      .exists()
      .then((exists) => {
        if (exists) return BergManager.open(destPath);
        console.log(`Initializing ${destPath} ...`);
        // scaffold the template folder into userHome
        const desiredMode = 0o2775;
        return fs
          .ensureDir(destPath, desiredMode)
          .then(() => fs.copy(srcPath, destPath))
          .then(() => BergManager.open(destPath));
      });
  }

  public cleanup(): Promise<unknown> {
    return Promise.allSettled([this.vcs.cleanup(), this.db.cleanup()]);
  }

  /**
   * Takes care of importing/resyncing external git meta data into VCS DuckDB.
   *  LMDB is used for progress tracking (ACID/CRUD).
   *  `.git/` metadata is loaded into DuckDB for quick retrieval at `VCS/<repoId>.db/`
   */
  public importRepo(workTree: TWorkTreePath, name?: TName) {
    return this.vcs.importRepo(workTree, name);
  }
}
