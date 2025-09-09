import { setupLake } from "@shared/ducklake";
import { GitRepo } from "@shared/git-shell";
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
import type { TGitDirPath, TGitRepoRootPath } from "@shared/types/git.types";
import fs from "fs-extra";
import type { Database, RootDatabaseOptions } from "lmdb";
import * as LMDB from "lmdb";
import path from "path";
import { RepoSyncInProgress } from "./errors";
import { buildGitPackIndex } from "./vcs";

export abstract class BergComponent {
  constructor(protected bMgr: BergManager) {}
  /* package-private */ _resetManager(mgr: BergManager) {
    this.bMgr = mgr;
  }
}

export class FsVCSManager extends BergComponent {
  constructor(protected fsVCSRootpath: TFsVCSRootPath) {
    super(null!);
  }
  public buildGitPackIndex = buildGitPackIndex.bind(this);
  initWorkTree(workTree: TFolderPath) {}
}

export class FsDLManager extends BergComponent {
  constructor(protected fsDLRootPath: TFsDLRootPath) {
    super(null!);
  }
}

export interface IRepoImportRecord {
  name: TName;
  workTree: TGitRepoRootPath;
  gitDir: TGitDirPath;
  first_import_at: TMSSinceEpoch;
  last_sync_at: TMSSinceEpoch;
  sync_in_progress: boolean;
}

export interface ILMDBDBs {
  repoImports: Database<IRepoImportRecord, TGitRepoRootPath>;
  checkpoint: Database<string, string>;
  progress: Database<boolean, string>;
  packIndex: Database<Uint8Array, string>;
  packsDone: Database<boolean, string>;
}

export class LMDBManager extends BergComponent {
  protected _env: LMDB.RootDatabase;
  protected _db: ILMDBDBs;

  constructor(
    protected dbRootPath: TLMDBRootPath,
    options?: RootDatabaseOptions,
  ) {
    super(null!);
    this._env = LMDB.open({
      path: path.join(dbRootPath, "meta.lmdb"),
      compression: true,
      // high perf options
      mapSize: 100 * 1024 * 1024, // 100 MB
      commitDelay: 0,
      overlappingSync: false,
      ...options,
    });
    this._db = {
      repoImports: this._env.openDB<IRepoImportRecord, TGitRepoRootPath>({ name: "repos" }),
      checkpoint: this._env.openDB<string, string>({ name: "checkpoint" }),
      progress: this._env.openDB<boolean, string>({ name: "progress" }),
      packIndex: this._env.openDB<Uint8Array, string>({ name: "pack_index" }), // 16-byte value: 8-byte packfile-id, 8-byte offset
      packsDone: this._env.openDB<boolean, string>({ name: "packs_scanned" }), // checkpoint for packIndex data
    };
  }
  get db() {
    return this._db;
  }
  get env() {
    return this._env;
  }
}

export class BergManager {
  constructor(
    protected _bergPath: TBergPath,
    protected _dbMgr: LMDBManager,
    protected _vcsMgr: FsVCSManager,
    protected _dlMgr: FsDLManager,
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
  get db() {
    return this._dbMgr.db;
  }
  get dbEnv() {
    return this._dbMgr.env;
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
      new FsDLManager(fsDLRootPath),
    );
    bMgr._vcsMgr._resetManager(bMgr);
    bMgr._dlMgr._resetManager(bMgr);
    bMgr._dbMgr._resetManager(bMgr);

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
    // check if it is already imported?
    const rec = this.db.repoImports.get(workTree);

    // Yes, imported and sync in progress
    if (rec?.sync_in_progress) throw new RepoSyncInProgress(`${workTree} already imported and Sync In Progress.`);

    if (rec) {
      /* imported earlier, but may be stale, do a fresh sync */
      new GitRepo(rec.gitDir);
    } /* never imported earlier */ else {
      // is workTree a valid git Repo?
      return assertRepo(workTree)
        .catch((ex) => {
          // we are given a normal folder (not a git repo).
          // create a local VCS repo so that we can track the changes.
          if (ex instanceof NotAGitRepo) return this.setupGit(workTree);
          throw ex; // re-throw other errors;
        })
        .then((gitDir) => {
          // gitDir is now a valid git repo (either pre-existing git, or our own local vcs)
          new GitRepo(gitDir);
        });
    }
  }

  /** We need to setup an internal VCS for the given working directory */
  public setupGit(workDir: TFolderPath): Promise<TGitDirPath> {
    throw new Error("Local VCS Setup Not Yet Implemented");
    // return GitRepo.initExternalGit(this.vcs., workTree);
  }
}
