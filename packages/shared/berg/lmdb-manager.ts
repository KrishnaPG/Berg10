import type { TFsVcsRepoId, THash, TLMDBRootPath, TMSSinceEpoch, TName } from "@shared/types";
import type { TGitDirPath, TWorkTreePath } from "@shared/types/git.types";
import type { Database, RootDatabaseOptions } from "lmdb";
import * as LMDB from "lmdb";
import path from "path";
import { BergComponent } from "./base";

/** the record entry that is stored in the LMDB repoImports table */
export interface IRepoImportRecord {
  name: TName;
  repoId: TFsVcsRepoId;
  workTree: TWorkTreePath; // the source workTree folder, always external
  gitDir: TGitDirPath; // the source .git/ folder (could be `vcs/<repoId>.git/` or external)
  firstImportAt: TMSSinceEpoch;
  lastSyncAt: TMSSinceEpoch;
  syncInProgress: boolean;
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
      repoImports: this._env.openDB<IRepoImportRecord, TWorkTreePath>({ name: "repos", useVersions: false }),
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
    return this._dbs.repoImports.putSync(rec.workTree, rec);
  }

  public abortPrevSync(rec: IRepoImportRecord) {
    rec.syncInProgress = false;
    return this.putImportRecord(rec);
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
