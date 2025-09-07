import { setupLake } from "@shared/ducklake";
import { FsDB, type TBergPath, type TDriftPath, type TDuckLakeDBName, type TFolderPath } from "@shared/types";
import type { TFsDLRootPath } from "@shared/types/fs-dl.types";
import { TFsVCSDotGitPath, type TFsVCSRootPath } from "@shared/types/fs-vcs.types";
import type { TGitRepoRootPath } from "@shared/types/git.types";
import { getPackageJsonFolder } from "@utils";
import fs from "fs-extra";
import os from "os";
import path from "path";

function getTemplateFolderPath(): Promise<TFolderPath> {
  return getPackageJsonFolder(import.meta.dir as TFolderPath);
}

abstract class BergComponent {
  constructor(protected bMgr: BergManager) {}
  /* package-private */ _resetManager(mgr: BergManager) {
    this.bMgr = mgr;
  }
}

class FsVCSManager extends BergComponent {
  constructor(protected fsVCSRootpath: TFsVCSRootPath) {
    super(null!);
  }
}

class FsDLManager extends BergComponent {
  constructor(protected fsDLRootPath: TFsDLRootPath) {
    super(null!);
  }
}

export class BergManager {
  constructor(
    protected _vcsMgr: FsVCSManager,
    protected _dlMgr: FsDLManager,
    protected _bergPath: TBergPath,
  ) {}

  get vcs() {
    return this._vcsMgr;
  }
  get dl() {
    return this._dlMgr;
  }
  get bergPath() {
    return this._bergPath;
  }

  // bergPath should already exist
  public static open(bergPath: TBergPath): Promise<BergManager> {
    console.log(`Opening ${bergPath} ...`);
    const fsVCSRootpath: TFsVCSRootPath = path.resolve(bergPath, "vcs") as TFsVCSRootPath;
    const fsDBRootPath: TFsDLRootPath = path.resolve(bergPath, "db") as TFsDLRootPath;

    const bMgr: BergManager = new BergManager(new FsVCSManager(fsVCSRootpath), new FsDLManager(fsDBRootPath), bergPath);
    bMgr._vcsMgr._resetManager(bMgr);
    bMgr._dlMgr._resetManager(bMgr);

    return Promise.resolve(bMgr);

    // return instance
    //   .setupDatabase(fsDBRootPath, "gitLakes" as TDuckLakeDBName)
    //   .then(() => instance.performRecoveryOperations())
    //   .then(() => instance.performCleanupOperations())
    //   .then(() => {
    //     console.log("ScannerOrchestrator initialized successfully");
    //     return instance;
    //   });
  }

  /**
   * Initialize the orchestrator on application startup. Creates the folder structure if needed. */
  public static initialize(
    userHome: TDriftPath = os.tmpdir() as TDriftPath,
    bergName: string = ".berg10",
  ): Promise<BergManager> {
    const bergPath: TBergPath = path.resolve(userHome, bergName) as TBergPath;
    // check if already exists, else copy the template folder to init
    return Bun.file(bergPath)
      .exists()
      .then((exists) => {
        if (exists) return BergManager.open(bergPath);
        console.log(`Initializing ${bergPath} ...`);
        // scaffold the template folder into userHome
        const desiredMode = 0o2775;
        return Promise.all([getTemplateFolderPath(), fs.ensureDir(bergPath, desiredMode)])
          .then(([templateParentDir]) => {
            return fs.copy(path.resolve(templateParentDir, "template", ".berg10"), bergPath);
          })
          .then(() => BergManager.open(bergPath));
      });
  }

  // Setup DuckDB lake database
  private async setupDatabase(dbRootPath: TFsDLRootPath, lakeDBName: TDuckLakeDBName) {
    console.log("Setting up DataLake...");
    return setupLake(dbRootPath, lakeDBName)
      .then(() => console.log("DataLake setup complete"))
      .catch((error) => {
        throw new Error(`Failed to setup DataLake at [${dbRootPath}].\n\t${(error as Error).message}\n`);
      });
  }

  public importRepo(gitRepo: TGitRepoRootPath) {
    // does it already exist?
    // is it valid git Repo, if not should vcs be created?
    // not a valid git repo and unable to create vcs => can not import
  }
}
