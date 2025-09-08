import { setupLake } from "@shared/ducklake";
import { NotAGitRepo } from "@shared/git-shell/helpers";
import { initExternalGit } from "@shared/git-shell/stream";
import { FsDB, type TBergPath, type TDriftPath, type TDuckLakeDBName, type TFolderPath } from "@shared/types";
import { ExistingGitRepoPath } from "@shared/types/folder-schemas";
import type { TFsDLRootPath } from "@shared/types/fs-dl.types";
import { TFsVCSDotGitPath, type TFsVCSRootPath } from "@shared/types/fs-vcs.types";
import type { TGitRepoRootPath } from "@shared/types/git.types";
import { Value } from "@sinclair/typebox/value";
import { getPackageJsonFolder } from "@utils";
import fs, { exists } from "fs-extra";
import os from "os";
import path from "path";
import { assertRepo, InvalidGitRepo } from "./helpers";

function getTemplateFolderPath(currentDir: TFolderPath): Promise<TFolderPath> {
  return getPackageJsonFolder(currentDir);
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
  initWorkTree(workTree: TFolderPath) {}
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
    userHome: TDriftPath, // the target path, usually user home `~/`
    templDir: TFolderPath, // path of the "template" folder that has .berg10 inside
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

  // Setup DuckDB lake database
  private async setupDatabase(dbRootPath: TFsDLRootPath, lakeDBName: TDuckLakeDBName) {
    console.log("Setting up DataLake...");
    return setupLake(dbRootPath, lakeDBName)
      .then(() => console.log("DataLake setup complete"))
      .catch((error) => {
        throw new Error(`Failed to setup DataLake at [${dbRootPath}].\n\t${(error as Error).message}\n`);
      });
  }

  public importRepo(workTree: TGitRepoRootPath, bAutoGit = true) {
    // is it already imported?
    // TODO: check if already imported
    // is it valid git Repo, if not should vcs be created?
    return assertRepo(workTree)
      .catch((ex) => {
        if (ex instanceof NotAGitRepo) return initExternalGit(this.vcs., workTree); // create a local VCS repo
        throw ex; // re-throw other errors;
      })
      .then((gitDir) => new GitRepo(gitDir));

    return assertRepo(gitRepo).then((isRepo) => {
      if (!isRepo) {
        if (bAutoGit) setupLocalGit();
        else {
          // not a valid git repo and we are not allowed to import
          throw new InvalidGitRepo(`"${gitRepo}" is not a valid Git Repo`);
          // not a valid git repo and unable to create vcs => can not import
        }
      } else {
        // gitRepo is a valid Repo, lets import from it
      }
    });
  }

  /** We need to setup an internal VCS for the given working directory */
  public setupGit(workDir: TFolderPath) {}

  private async _importRepo(gitRepo: TExistingGitRepoPath) {}
}
