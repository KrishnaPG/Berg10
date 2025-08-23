import fs from "fs-extra";
import os from "os";
import path from "path";
import type { TPath } from "../../git-api/src/services/types";
import { generateBuiltInGroups } from "../tools/gen-builtin-groups";
import { getGroupsManifestPaths, getRootFolderPath } from "./repo-paths";
import type { TGroupChildren, TGroupHierarchy, TGroupID, TGroupInfo, TGroups } from "./types";

class SemanticRepo {
  constructor(
    protected _repoPath: TPath,
    protected _groups: TGroups,
    protected _hier: TGroupHierarchy,
  ) {}
  get RepoPath() {
    return this._repoPath;
  }
  get Groups() {
    return this._groups;
  }
  get Hierarchy() {
    return this._hier;
  }
  groupInfo(grpId: TGroupID): TGroupInfo | undefined {
    return this._groups[grpId];
  }
  children(grpId: TGroupID): TGroupChildren | undefined {
    return this._hier[grpId];
  }
  // saves the data structures to disk, but not committed yet.
  save() {
    const [infoJsonPath, hierJsonPath] = getGroupsManifestPaths(this._repoPath);
    return Promise.all([
      Bun.write(infoJsonPath as string, JSON.stringify(this._groups, null, 2)),
      Bun.write(hierJsonPath as string, JSON.stringify(this._hier, null, 2)),
    ]);
  }
}

const textDecoder = new TextDecoder("utf-8");

/**
 * @param repoPath the folder that contains `.berg10` folder
 */
export const openSemanticRepo = (repoPath: TPath): Promise<SemanticRepo> => {
  return Promise.all(getGroupsManifestPaths(repoPath).map((p) => Bun.file(p).arrayBuffer()))
    .then((arrayBuffers) => arrayBuffers.map((ab) => JSON.parse(textDecoder.decode(ab))))
    .then(([groups, hier]) => new SemanticRepo(repoPath, groups, hier));
};

// Converts a given bare folder into a semantic repo and
// returns a Semantic Repo object for the converted repo.
export const initSemanticRepo = async (repoPath: TPath): Promise<SemanticRepo> => {
  const rootFolder = getRootFolderPath(repoPath);
  // check if a semantic repo already exists at the destination;
  const alreadyExists = await fs
    .access(rootFolder)
    .then(() => true)
    .catch(() => false);
  if (alreadyExists) return openSemanticRepo(repoPath);

  // destination folder does not exist,  copy the template folder (../template) to destination
  const desiredMode = 0o2775;
  return fs
    .ensureDir(repoPath, desiredMode)
    .then(() => {
      return fs.copy(path.resolve(__dirname, "..", "template"), repoPath);
    })
    .then(() => openSemanticRepo(repoPath));
};

initSemanticRepo(os.tmpdir() as TPath)
  .then((sRepo) => {
    generateBuiltInGroups(sRepo.Groups);
    return sRepo.save();
  })
  .catch((ex) => console.error((ex as Error).message));
