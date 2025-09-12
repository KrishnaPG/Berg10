import { GitRepo } from "@shared/git-shell";
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

  /** We need to setup an internal VCS for the given working directory */
  protected setupGit(_workDir: TFolderPath): Promise<TGitDirPath> {
    throw new Error("Local VCS Setup Not Yet Implemented");
    // return GitRepo.initExternalGit(this.vcs., workTree);
  }

  protected importReSync(rec: IRepoImportRecord) {
    // check if a sync already in progress
    if (rec.syncInProgress) throw new RepoSyncInProgress(`repo: ${rec.name}, Sync already in Progress.`);
    // mark sync as ON
    rec.syncInProgress = true;
    this.bMgr.db.putImportRecord(rec);

    // ... do the import ...
    return FsVCS.getInstance(this, rec.repoId)
      .then((vcs) => vcs.buildGitPackIndex(new GitRepo(rec.gitDir)))
      .finally(() => {
        // mark sync as OFF
        return this.bMgr.db.putImportRecord({
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
    this.bMgr.db.putImportRecord(rec);
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
    const rec = this.bMgr.db.getImportRecord(workTree);
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
