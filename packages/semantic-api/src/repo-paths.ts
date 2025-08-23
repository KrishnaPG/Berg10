import path from "path";
import type { TPath } from "../../git-api/src/services/types";
import type { TGroupID, TLocalGroupID } from "./types";

export const sRootName = ".berg10";

export const getRootFolderPath = (repoPath: TPath): TPath => path.resolve(repoPath, sRootName) as TPath;

//#region Group Paths
export const getGroupsFolderPath = (repoPath: TPath): TPath => path.resolve(repoPath, sRootName, "groups") as TPath;
export const getGroupsManifestPaths = (repoPath: TPath): TPath[] => {
  const grpFolderPath = getGroupsFolderPath(repoPath);
  return [path.resolve(grpFolderPath, "info.json") as TPath, path.resolve(grpFolderPath, "hier.json") as TPath];
};
export const groupIdToConfigPaths = (grpId: TGroupID): string[] => {
  return [grpId.slice(0, 2), grpId.slice(2, 4), grpId.slice(4, 6), `${grpId.slice(6)}.json`];
};

// returns a local group id (shorter length < 25 chars)
export const newLocalGroupID = (i: number, r = Math.random(), t = Date.now()): TLocalGroupID =>
  r.toString(36).slice(2, 8) + t.toString(36) + i.toString(36);
//#endregion

//#region Entities Paths
export const getEntitiesFolderPath = (repoPath: TPath): TPath => path.resolve(repoPath, sRootName, "entities") as TPath;
//#endregion

//#region Index Folder Paths
export const getIndexFolderPath = (repoPath: TPath): TPath => path.resolve(repoPath, sRootName, "index") as TPath;
//#endregion
