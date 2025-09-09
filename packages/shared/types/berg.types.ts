import type { Branded, TFilePath, TFolderPath } from "./branded.types";
import type { TDuckLakeRootPath, TParquetFilePath } from "./ducklake.types";

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
 * Contains multiple `<sha256B58>.git` named folders, each a `.git` folder
 * created with `--separate-git-dir`;
 * */
export type TFsVCSRootPath = Branded<TFolderPath, "FsVCSRoot">;
/**
 * Usually this is `TFsVCSRootPath + "/<sha256B58>.git"`;
 *
 * Contains git internal files/folders such as {`objects`, `HEAD`, `refs`...}
 */
export type TFsVCSDotGitPath = Branded<TFolderPath, "<sha256B58>.git folder">;

/** The pack-index root folder under TFsVCSDotGitPath; 
 *  Usually this is `TFsVCSDotGitPath + pack-index/`
 */
export type TFsVCSPackIndexRoot = Branded<TFolderPath, "VCSPackIndex">;
export type TFsVCSPackIndexFilePath = Branded<TParquetFilePath, "<PackIndex>.Parquet">;


export type TBergShelfPath = TLMDBRootPath | TFsDLRootPath | TFsSemRootPath | TFsVCSRootPath;

export type TFsSrcFilePath = Branded<TFilePath, "FsSrcFile">;
export type TFSSrcFolderPath = Branded<TFolderPath, "FsSrcFolder">;
export type TFsSrcRootPath = Branded<TFSSrcFolderPath, "FsSrcRoot">;
