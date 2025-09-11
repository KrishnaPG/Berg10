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
import type { TGitDirPath, TGitRepoRootPath, TWorkTreePath } from "@shared/types/git.types";
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
  cleanup() {}
}

export class FsVCSManager extends BergComponent {
  constructor(protected fsVCSRootpath: TFsVCSRootPath) {
    super(null!);
  }
  public buildGitPackIndex = buildGitPackIndex.bind(this);
  initWorkTree(workTree: TFolderPath) {}
}

/** The DuckLake Storage - for append only, immutable files */
export class FsDLManager extends BergComponent {
  constructor(protected fsDLRootPath: TFsDLRootPath) {
    super(null!);
  }
}

/** the record entry that is stored in the LMDB repoImports table */
export interface IRepoImportRecord {
  name: TName;
  workTree: TWorkTreePath; // the source workTree folder, always external
  gitDir: TGitDirPath; // the source .git/ folder (could be `vcs/<repoId>.git/` or external)
  first_import_at: TMSSinceEpoch;
  last_sync_at: TMSSinceEpoch;
  sync_in_progress: boolean;
}

export type ImportsLMDB = Database<IRepoImportRecord, TWorkTreePath>;
export interface ILMDBDBs {
  repoImports: ImportsLMDB;
  checkpoint: Database<string, string>;
  progress: Database<boolean, string>;
  packIndex: Database<Uint8Array, string>;
  packsDone: Database<boolean, string>;
}

/** For ACID transactional data */
export class LMDBManager extends BergComponent {
  protected _env: LMDB.RootDatabase;
  protected _dbs: ILMDBDBs;

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
    this._dbs = {
      repoImports: this._env.openDB<IRepoImportRecord, TWorkTreePath>({ name: "repos" }),
      checkpoint: this._env.openDB<string, string>({ name: "checkpoint" }),
      progress: this._env.openDB<boolean, string>({ name: "progress" }),
      packIndex: this._env.openDB<Uint8Array, string>({ name: "pack_index" }), // 16-byte value: 8-byte packfile-id, 8-byte offset
      packsDone: this._env.openDB<boolean, string>({ name: "packs_scanned" }), // checkpoint for packIndex data
    };
  }
  get dbs() {
    return this._dbs;
  }
  get env() {
    return this._env;
  }
  public getImportRecord(workTree: TWorkTreePath): IRepoImportRecord | undefined {
    return this._dbs.repoImports.get(workTree);
  }
  public putImportRecord(rec: IRepoImportRecord) {
    return this._dbs.repoImports.put(rec.workTree, rec);
  }
  public updateImportRecord(patch: Partial<IRepoImportRecord>) {
    if (!patch.workTree) throw new Error(`workTree not specified in the call to updateImportRecord()`);
    const workTree = patch.workTree;
    const importsDB = this.dbs.repoImports;
    return importsDB.transaction(async () => {
      const rec = await importsDB.get(workTree);
      if (!rec) throw new Error(`workTree record not found for "${workTree}" in updateImportRecord()`);
      return importsDB.put(workTree, { ...rec, ...patch });
    });
  }
  public importReSync(rec: IRepoImportRecord) {
    return this.updateImportRecord({ workTree: rec.workTree, sync_in_progress: true }).finally(() =>
      this.updateImportRecord({
        workTree: rec.workTree,
        sync_in_progress: false,
        last_sync_at: Date.now() as TMSSinceEpoch,
      }),
    );
  }
  public importNewSync(srcWorkTree: TWorkTreePath, srcGitDir: TGitDirPath, repoName?: TName) {
    // this is a fresh import, first add an entry into the LMDB
    const now = Date.now() as TMSSinceEpoch;
    const rec = {
      name: repoName ?? ("default" as TName),
      workTree: srcWorkTree,
      gitDir: srcGitDir,
      first_import_at: now,
      last_sync_at: now,
      sync_in_progress: false,
    };
    return this.putImportRecord(rec).then(() => this.importReSync(rec));
  }
  public cleanup() {
    return Promise.allSettled([
      this.dbs.checkpoint.close(),
      this.dbs.packIndex.close(),
      this.dbs.progress.close(),
      this.dbs.repoImports.close(),
    ]).finally(() => this.env.close());
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

  public cleanup(): Promise<unknown> {
    return Promise.allSettled([this.vcs.cleanup(), this.db.cleanup(), this.dl.cleanup()]);
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

  /** re-syncs an earlier imported repo */
  public resyncRepo(rec: IRepoImportRecord) {
    // check if a sync already in progress
    if (rec.sync_in_progress) throw new RepoSyncInProgress(`repo: ${rec.name}, Sync already in Progress.`);
    const srcGitRepo = new GitRepo(rec.gitDir);
  }

  /**
   * Takes care of importing/resyncing external git meta data into VCS DuckDB.
   *  LMDB is used for progress tracking (ACID/CRUD).
   *  `.git/` metadata is loaded into DuckDB for quick retrieval at `VCS/<repoId>.db/`
   */
  public importRepo(workTree: TWorkTreePath, name?: TName) {
    // check if it is already imported?
    const rec = this.db.getImportRecord(workTree);
    if (rec) return this.db.importReSync(rec);

    // is workTree a valid git Repo?
    return assertRepo(workTree as TGitRepoRootPath)
      .catch((ex) => {
        // we are given a normal folder (not a git repo).
        // create a local VCS repo so that we can track the changes.
        if (ex instanceof NotAGitRepo) return this.setupGit(workTree);
        throw ex; // re-throw other errors;
      })
      .then((gitDir) => {
        // gitDir is now a valid git repo (either pre-existing git, or our own local vcs)
        return this.db.importNewSync(workTree, gitDir, name);
      });
  }

  /** We need to setup an internal VCS for the given working directory */
  public setupGit(workDir: TFolderPath): Promise<TGitDirPath> {
    throw new Error("Local VCS Setup Not Yet Implemented");
    // return GitRepo.initExternalGit(this.vcs., workTree);
  }
}
