import type { Branded, TFilePath, TFolderPath, TName } from "./branded.types";
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
export type TFsVcsRootPath = Branded<TFolderPath, "FsVCSRoot">;
/**
 * Usually this is `TFsVCSRootPath + "/<SrcRepoId>.git"`;
 *
 * Contains git internal files/folders such as {`objects`, `HEAD`, `refs`...}
 */
export type TFsVcsDotGitPath = TGitDirPath;
/** 
 * TFsVCSDotDBPath contains `pack-index/`, `commits.parquet`, `objects.parquet` etc.
 * 
 * Usually hosts the DuckDB parquet files created from .git/ metadata
 */
export type TFsVcsDotDBPath = Branded<TFolderPath, "VCSDBFolder">; 

/** The pack-index root folder under TFsVCSDotDBPath;
 *  Usually this is `TFsVCSDotDBPath + pack-index/`
 */
export type TFsVcsDBPackIndexRoot = Branded<TFolderPath, "VCSPackIndex">;
/** usually source .git/ will have `pack/<PackIndexName>.idx` files */
export type TFsVcsDBPackIndexName = Branded<TName, "PackIndexName">;
/** `TFsVCSPackIndexFilePath = <TFsVCSPackIndexRoot>/pack-index/<TFsVCSPackIndexName>.parquet`  */
export type TFsVcsDBPackIndexFilePath = Branded<TParquetFilePath, "<PackIndex>.Parquet">;

export type TBergShelfPath = TLMDBRootPath | TFsDLRootPath | TFsSemRootPath | TFsVcsRootPath;

export type TFsSrcFilePath = Branded<TFilePath, "FsSrcFile">;
export type TFSSrcFolderPath = Branded<TFolderPath, "FsSrcFolder">;
export type TFsSrcRootPath = Branded<TFSSrcFolderPath, "FsSrcRoot">;
