import type { GitShell } from "@shared/git-shell";
import type {
  TFileBaseName,
  TFilePath,
  TFolderPath,
  TFsVcsDbCommitBaseName,
  TFsVcsDbCommitsFolderPath,
  TFsVcsDbPIFilePath,
  TFsVcsDbPIFolderPath,
  TFsVcsDbPIName,
  TFsVcsDbTreeEntFolderPath,
  TFsVcsDotDBPath,
  TFsVcsDotGitPath,
  TFsVcsRepoId,
  TSecSinceEpoch,
} from "@shared/types";
import type { TGitPackDirPath } from "@shared/types/git.types";
import { cleanupFiles } from "@shared/utils/cleanup-files";
import { Locker } from "@shared/utils/locker";
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
    protected gitDL: FsVcsGitDL,  // holds the db folder: `vcs/<repoId>.db/` and shell executor for original source
    protected vcsMgr: FsVCSManager,
  ) {}

  public static getInstance(vcsMgr: FsVCSManager, vcsRepoId: TFsVcsRepoId, srcGitShell: GitShell): Promise<FsVCS> {
    const dotGitFolder = path.resolve(vcsMgr.vcsRootFolder, `${vcsRepoId}.git`) as TFsVcsDotGitPath;
    const dotDBFolder = path.resolve(vcsMgr.vcsRootFolder, `${vcsRepoId}.db`) as TFsVcsDotDBPath;
    // ensureDir for all required folders
    return Promise.all([
      fs.ensureDir(dotGitFolder),
      ...gitDLTableNames.map((d) => fs.ensureDir(path.resolve(dotDBFolder, d))),
    ]).then(() => {
      // setup DuckLake and mount GitDL
      return FsVcsGitDL.mount(srcGitShell, dotDBFolder).then(
        (gitDL) => new FsVCS(vcsRepoId, dotGitFolder, gitDL, vcsMgr),
      );
    });
  }

  get dotDBFolder(): TFsVcsDotDBPath { return this.gitDL.rootPath; }

  get syncLockFilePath() {
    return path.resolve(this.dotDBFolder, "_sync") as TFolderPath; // this becomes _sync.lock/ folder
  }

  /** removes any tmp files from previous import runs */
  cleanupTempFiles() {
    return cleanupFiles(this.dotDBFolder, ["tmp"]);
  }

  /** triggers a git -> db sync */
  public initSync(srcPackDir: TGitPackDirPath) {
    return lockfile
      .lock(this.syncLockFilePath, {realpath: false})
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

  protected dlTableFolderPath(tableName: TGitDLTableName) {
    return path.resolve(this.dotDBFolder, tableName);
  }

  get dbPIFolderPath(): TFsVcsDbPIFolderPath {
    return this.dlTableFolderPath("pack-index") as TFsVcsDbPIFolderPath;
  }
  getDBPackFilePath(packName: TFsVcsDbPIName): TFsVcsDbPIFilePath {
    return path.resolve(this.dbPIFolderPath, `${packName}.parquet`) as TFsVcsDbPIFilePath;
  }
  isPackImported(packName: TFsVcsDbPIName): boolean {
    return fs.existsSync(this.getDBPackFilePath(packName));
  }

  get dbCommitsFolderPath(): TFsVcsDbCommitsFolderPath {
    return this.dlTableFolderPath("commits") as TFsVcsDbCommitsFolderPath;
  }
  get dbTreeEntFolderPath(): TFsVcsDbTreeEntFolderPath {
    return this.dlTableFolderPath("tree-entries") as TFsVcsDbTreeEntFolderPath;
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
      p.push(this.gitDL.streamIDXtoParquet(srcIdxPath as TFilePath, this.dbPIFolderPath, packName));

      // run multiple in parallel, but do not stress the system too much
      if (p.length >= os.availableParallelism()) await Promise.all(p).then(() => (p.length = 0));
    }
    // wait for any pending promises, then return `this` for method chaining
    return Promise.all(p)
      .then(() => this.gitDL.refreshView(this.dotDBFolder, "pack-index"))
      .then(() => this); // for method chaining
  }

  async importCommits() {
    const tableExists = await this.gitDL.checkIfViewExists("commits");
    const lastCommitTime = tableExists && (await this.gitDL.lastCommitTime());
    const since: TSecSinceEpoch = (lastCommitTime ? lastCommitTime + 1 : 0) as TSecSinceEpoch;
    const destFilePath = path.resolve(this.dbCommitsFolderPath, `from-${since}.parquet`) as TFilePath;
    return this.gitDL
      .streamCommitsToParquet(destFilePath, since)
      .then(() => this.gitDL.refreshView("commits"))
      .then(() => this); // for method chaining
  }

  async importLsTree() {
    const dbTreeEntFolderPath = this.dbTreeEntFolderPath;
    const p: Promise<void>[] = [];
    for await (const rowBatch of this.gitDL.getUnlistedCommits()) {
      for (const row of rowBatch) {
        const destFilePath = path.resolve(dbTreeEntFolderPath, `${row.sha}.parquet`) as TFilePath;
        p.push(this.gitDL.streamLsTreeToParquet(destFilePath, row.tree));
        if (p.length >= os.availableParallelism()) await Promise.all(p).then(() => (p.length = 0));
      }
    }
    return Promise.all(p)
      .then(() => this.gitDL.refreshView("tree-entries"))
      .then(() => this); // for method chaining
  }
}
