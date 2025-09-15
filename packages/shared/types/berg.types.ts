import type { Branded, TFileBaseName, TFilePath, TFolderPath, TName } from "./branded.types";
import type { TDuckLakeRootPath, TParquetFilePath } from "./ducklake.types";
import type { TGitDirPath } from "./git.types";

/**
 * Usually this is same as user home folder;
 *
 * `TDriftPath` contains one or more `.berg10` folders (with different names, of course);
 */
export type TDriftPath = Branded<TFolderPath, "Where Bergs Live">;

/**
 * Usually this is the `TDriftPath + "/.berg10"`;
 *  - e.g. `~/.berg10`;
 *
 * Contains {`vcs`, `db`, `dl`, `sem`} folders;
 */
export type TBergPath = Branded<TFolderPath, "the .berg10 folder">;

/**
 * Usually this is `TBergPath + "/db"`;
 * Same as LMDB root path that contains .lmdb files
 */
export type TLMDBRootPath = Branded<TFolderPath, "LMDBRootPath">;
/** Usually `TLMDBRootPath + <name>.lmdb` file path */
export type TLMDBFilePath = Branded<TFilePath, "LMDBFilePath">;

/**
 * Usually this is `TBergPath + "/dl"`;
 *
 * Same as `TDuckLakeRootPath`, and contains {`TDuckLakeMetaFilePath`, `TDuckLakeDataFilesFolder`};
 *
 * A single `TFsDLRootPath` might contain multiple tables, metadata files inside it.
 */
export type TFsDLRootPath = TDuckLakeRootPath;

/** Usually this is `TBergPath + "/sem"`;
 *
 * Contains { `groups`, `index`, `entities` ...} folders;  */
export type TFsSemRootPath = Branded<TFolderPath, "FsSemRoot">;

/**
 * The TFsVcsRepoId is calculated based on either git first commit Id, or 
 * the workTree path hash;
 */
export type TFsVcsRepoId = Branded<string, "VcsRepoId">;

/** Usually this is `TBergPath + "/vcs"`;
 *
 * Contains multiple {<SrcRepoId>.git, <SrcRepoId>.db} paired folders, where 
 *  each a `.git` folder is created with `--separate-git-dir`, and
 *  the respective `.db` folder holds the .git -> db imported data;
 * 
 * When external .git repos are imported, the `<SrcRepoId>.git` may be missing
 * and only the `<SrcRepoId>.db` may exist. 
 * 
 * The details of `SrcRepoId`'s name, workTree etc. tracked in the LMDB (the `db/` berg-shelf);
 * */
export type TFsVcsRootPath = Branded<TFolderPath, "VcsRoot">;
/**
 * Usually this is `TFsVCSRootPath + "/<SrcRepoId>.git"`;
 *
 * Contains git internal files/folders such as {`objects`, `HEAD`, `refs`...}
 */
export type TFsVcsDotGitPath = TGitDirPath;
/** 
 * TFsVCSDotDBPath contains `pack-index/`, `commits/*.parquet`, `refs/*.parquet` etc.
 * 
 * Usually hosts the DuckDB parquet files created from .git/ metadata
 * 
 * Also acts as `TDuckLakeRootPath`, which means it contains 
 * `{TDuckLakeMetaFilePath, TDuckLakeDataFilesFolder}` with lake name `gitDL`;
 */
export type TFsVcsDotDBPath = Branded<TFolderPath, "VcsDbFolder">; 

/** The pack-index root folder under TFsVCSDotDBPath;
 * 
 *  Usually this is `TFsVCSDotDBPath + pack-index/`
 */
export type TFsVcsDbPIFolderPath = Branded<TFolderPath, "VcsDbPIRoot">;
/** usually source .git/ will have `pack/<PackIndexName>.idx` files */
export type TFsVcsDbPIName = Branded<TFileBaseName, "VcsDbPIName">;
/** `TFsVcsDbPIFilePath = <TFsVcsDbPIFolderPath>/<TFsVcsDbPIName>.parquet`  */
export type TFsVcsDbPIFilePath = Branded<TParquetFilePath, "<VcsDbPIName>.Parquet">;

export type TFsVcsDbCommitsFolderPath = Branded<TFolderPath, "VcsDbCommitsRoot">;
export type TFsVcsDbCommitBaseName = Branded<TFileBaseName, "VcsDbCommitBaseName">;
export type TFsVcsDbCommitFilePath = Branded<TParquetFilePath, "<VcsDbCommitBaseName>.Parquet">;



export type TBergShelfPath = TLMDBRootPath | TFsDLRootPath | TFsSemRootPath | TFsVcsRootPath;

export type TFsSrcFilePath = Branded<TFilePath, "FsSrcFile">;
export type TFsSrcFolderPath = Branded<TFolderPath, "FsSrcFolder">;
export type TFsSrcRootPath = Branded<TFsSrcFolderPath, "FsSrcRoot">;
