import type { Branded, TFolderPath } from "./branded.types";

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
 * Contains {`vcs`, `db`, `sem`} folders;
 */ 
export type TBergPath = Branded<TFolderPath, "the .berg10 folder">;
