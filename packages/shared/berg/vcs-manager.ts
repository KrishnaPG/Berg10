import { GitShell } from "@shared/git-shell";
import { assertRepo, NotAGitRepo } from "@shared/git-shell/helpers";
import type { TFolderPath, TFsVcsRepoId, TMSSinceEpoch, TName } from "@shared/types";
import type { TFsVCSRootPath } from "@shared/types/fs-vcs.types";
import type { TGitDirPath, TGitRepoRootPath, TWorkTreePath } from "@shared/types/git.types";
import { BergComponent } from "./base";
import { RepoSyncInProgress } from "./errors";
import type { IRepoImportRecord } from "./lmdb-manager";
import { FsVCS } from "./vcs";

export class FsVCSManager extends BergComponent {
  constructor(protected _fsVCSRootpath: TFsVCSRootPath) {
    super(null!);
  }
  get vcsRootFolder() {
    return this._fsVCSRootpath;
  }
  get importsDB() {
    return this.bMgr.db.dbs.repoImports;
  }
  get checkPointDB() {
    return this.bMgr.db.dbs.checkpoint;
  }

  public getImportRecord(workTree: TWorkTreePath): IRepoImportRecord | undefined {
    return this.importsDB.get(workTree);
  }
  public putImportRecord(rec: IRepoImportRecord) {
    return this.importsDB.putSync(rec.workTree, rec);
  }

  public abortPrevSync(rec: IRepoImportRecord) {
    rec.syncInProgress = false;
    return this.putImportRecord(rec);
  }

  /** We need to setup an internal VCS for the given working directory */
  protected setupGit(_workDir: TFolderPath): Promise<TGitDirPath> {
    throw new Error("Local VCS Setup Not Yet Implemented");
    // return GitShell.initExternalGit(this.vcs., workTree);
  }

  protected importReSync(rec: IRepoImportRecord) {
    //TODO: check if a sync already in progress
    // if (rec.syncInProgress) throw new RepoSyncInProgress(`repo: ${rec.name}, Sync already in Progress.`);
    // mark sync as ON
    rec.syncInProgress = true;
    this.putImportRecord(rec);

    const srcGitShell = new GitShell(rec.gitDir);
    // ... do the import ...
    return FsVCS.getInstance(this, rec.repoId, srcGitShell)
      .then((vcs) => vcs.buildGitPackIndex(srcGitShell.packDir))
      .then((vcs) => vcs.importCommits())
      .then((vcs) => vcs.importLsTree())
      .finally(() => {
        // mark sync as OFF
        return this.putImportRecord({
          ...rec,
          syncInProgress: false,
          lastSyncAt: Date.now() as TMSSinceEpoch,
        });
      });
  }
  protected importNewSync(srcWorkTree: TWorkTreePath, srcGitDir: TGitDirPath, repoName?: TName) {
    // this is a fresh import, first add an entry into the LMDB
    const now = Date.now() as TMSSinceEpoch;
    const rec: IRepoImportRecord = {
      name: repoName ?? ("default" as TName),
      repoId: (repoName + (Math.random() * Date.now()).toString(36)) as TFsVcsRepoId, // TODO: can we use first commit ID as repoId?
      workTree: srcWorkTree,
      gitDir: srcGitDir,
      firstImportAt: now,
      lastSyncAt: now,
      syncInProgress: false,
    };
    this.putImportRecord(rec);
    // starts a fresh resync
    return this.importReSync(rec);
  }

  /**
   * Takes care of importing/resyncing external git meta data into VCS DuckDB.
   *  LMDB is used for progress tracking (ACID/CRUD).
   *  `.git/` metadata is loaded into DuckDB for quick retrieval at `VCS/<repoId>.db/`
   */
  public importRepo(workTree: TWorkTreePath, name?: TName) {
    // check if it is already imported?
    const rec = this.getImportRecord(workTree);
    if (rec) return this.importReSync(rec);

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
        return this.importNewSync(workTree, gitDir, name);
      });
  }
}
