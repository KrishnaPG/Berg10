import type { GitShell } from "@shared/git-shell";
import type {
  TFilePath,
  TFolderPath,
  TFsVcsDbPIFilePath,
  TFsVcsDbPIName,
  TFsVcsDbPITblPath,
  TFsVcsDotDBPath,
  TFsVcsDotDbTablePath,
  TFsVcsDotGitPath,
  TFsVcsRepoId,
  TSecSinceEpoch,
} from "@shared/types";
import type { TGitPackDirPath } from "@shared/types/git.types";
import { cleanupFiles } from "@shared/utils/cleanup-files";
import fs from "fs-extra";
import os from "os";
import path from "path";
import lockfile from "proper-lockfile";
import { RepoSyncInProgress } from "./errors";
import { FsVcsGitDL, gitDLTableNames, type TGitDLTableName } from "./vcs-git-dl";
import type { FsVCSManager } from "./vcs-manager";

/** Manages one specific vcs repo */
export class FsVCS {
  constructor(
    protected repoId: TFsVcsRepoId,
    protected dotGitFolder: TFsVcsDotGitPath, // aux .git folder, probably `vcs/<repoId>.git/`, if exists
    protected dotDBFolder: TFsVcsDotDBPath, // db folder: `vcs/<repoId>.db/`
    protected vcsMgr: FsVCSManager,
    protected gitDL: FsVcsGitDL,  // TODO: implement close on this
  ) {}

  public static getInstance(vcsMgr: FsVCSManager, vcsRepoId: TFsVcsRepoId, srcGitShell: GitShell): Promise<FsVCS> {
    const dotGitFolder = path.resolve(vcsMgr.vcsRootFolder, `${vcsRepoId}.git`) as TFsVcsDotGitPath;
    const dotDBFolder = path.resolve(vcsMgr.vcsRootFolder, `${vcsRepoId}.db`) as TFsVcsDotDBPath;
    // ensureDir for all required folders
    return Promise.all([
      fs.ensureDir(dotGitFolder),
      ...gitDLTableNames.map((d) => fs.ensureDir(path.join(dotDBFolder, d))),
    ]).then(() => {
      // setup DuckLake and mount GitDL
      return FsVcsGitDL.mount(srcGitShell, dotDBFolder).then(
        (gitDL) => new FsVCS(vcsRepoId, dotGitFolder, dotDBFolder, vcsMgr, gitDL),
      );
    });
  }

  get syncLockFilePath() {
    return path.join(this.dotDBFolder, "_sync") as TFolderPath; // this becomes _sync.lock/ folder
  }

  /** removes any tmp files from previous import runs */
  cleanupTempFiles() {
    return cleanupFiles(this.dotDBFolder, ["tmp"]);
  }

  /** triggers a git -> db sync */
  public initSync(srcPackDir: TGitPackDirPath) {
    return lockfile
      .lock(this.syncLockFilePath, { realpath: false })
      .then(async (lockRelease) => {
        await this.cleanupTempFiles(); // remove tmp files of prev runs, if any
        await this.buildGitPackIndex(srcPackDir);
        await this.importCommits();
        await this.importLsTree();
        // Call the provided release function when done,
        // which will also return a promise
        return lockRelease();
      })
      .catch((e) => {
        // either lock could not be acquired
        if (e.code === "ELOCKED")
          throw new RepoSyncInProgress(`repo: ${this.repoId}, Sync already in Progress.`, { cause: e });
        // or releasing it failed
        console.error(e);
      });
  }

  protected getDBTableFolderPath(tableName: TGitDLTableName): TFsVcsDotDbTablePath {
    return path.join(this.dotDBFolder, tableName) as TFsVcsDotDbTablePath;
  }

  get dbPITablePath(): TFsVcsDbPITblPath {
    return this.getDBTableFolderPath("pack-index") as TFsVcsDbPITblPath;
  }
  getDBPackFilePath(packName: TFsVcsDbPIName): TFsVcsDbPIFilePath {
    return path.join(this.dbPITablePath, `${packName}.parquet`) as TFsVcsDbPIFilePath;
  }
  isPackImported(packName: TFsVcsDbPIName): boolean {
    return fs.existsSync(this.getDBPackFilePath(packName));
  }

  refreshView(viewName: TGitDLTableName) {
    return this.gitDL.refreshView(viewName, this.getDBTableFolderPath(viewName));
  }

  checkIfViewExists(viewName: TGitDLTableName): Promise<boolean> {
    // there could be parquet files in the view folder but the view
    // may not have been created (in case of app crash/error). So
    // we have to first refresh the view to give a chance to load
    // those parquet files before we check for existence of view in the DL.
    // Of course, if there are no parquet files, refreshView throws, so we
    // handle the catch silently.
    return this.refreshView(viewName)
      .catch(() => {})
      .then(() => this.gitDL.checkIfViewExists(viewName));
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
  async buildGitPackIndex(srcGitPackDirPath: TGitPackDirPath) {
    /* 1. locate .git/objects/pack */
    const srcPackDir = srcGitPackDirPath;
    // it is an optional path, may or may not exist - check it
    if (!fs.existsSync(srcPackDir)) return this;

    /* 2. iterate over *.idx files */
    const srcIdxFiles = fs
      .readdirSync(srcPackDir)
      .filter((f) => f.endsWith(".idx"))
      .map((f) => path.join(srcPackDir, f));

    const p = []; // batch multiples idx loads

    /* 3. write the .idx file content to a .parquet file */
    for (const srcIdxPath of srcIdxFiles) {
      const packName = path.basename(srcIdxPath, ".idx") as TFsVcsDbPIName; // "pack-1234…"
      if (this.isPackImported(packName)) continue; // already captured

      // write to parquet file with atomic filename swap
      p.push(this.gitDL.streamIDXtoParquet(srcIdxPath as TFilePath, this.dbPITablePath, packName));

      // run multiple in parallel, but do not stress the system too much
      if (p.length >= os.availableParallelism()) await Promise.all(p).then(() => (p.length = 0));
    }
    // wait for any pending promises, then return `this` for method chaining
    return Promise.all(p)
      .then(() => this.refreshView("pack-index"))
      .then(() => this); // for method chaining
  }

  async importCommits() {
    const tableExists = await this.gitDL.checkIfViewExists("commits");
    const lastCommitTime = tableExists && (await this.gitDL.lastCommitTime());
    const since: TSecSinceEpoch = (lastCommitTime ? lastCommitTime + 1 : 0) as TSecSinceEpoch;
    const destFilePath = path.join(this.getDBTableFolderPath("commits"), `from-${since}.parquet`) as TFilePath;

    return this.gitDL
      .streamCommitsToParquet(destFilePath, since)
      .then(() => this.refreshView("commits"))
      .then(() => this); // for method chaining
  }

  async importLsTree() {
    const tableExists = await this.checkIfViewExists("tree-entries");

    const dbTreeEntFolderPath = this.getDBTableFolderPath("tree-entries");
    const p: Promise<void>[] = [];

    for await (const rowBatch of this.gitDL.getUnlistedCommits(tableExists)) {
      for (const row of rowBatch) {
        const destFilePath = path.join(dbTreeEntFolderPath, `${row.sha}.parquet`) as TFilePath;
        p.push(this.gitDL.streamLsTreeToParquet(destFilePath, row.tree));
        if (p.length >= os.availableParallelism()) await Promise.all(p).then(() => (p.length = 0));
      }
    }

    return Promise.all(p)
      .then(() => this.refreshView("tree-entries"))
      .then(() => this); // for method chaining
  }
}
