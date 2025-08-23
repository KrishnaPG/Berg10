import { type Static, t as T } from "elysia";
import fs from "fs-extra";
import os from "os";
import path from "path";
import type { TPath } from "../../git-api/src/services/types";

// Create a branded type utility
declare const __brand: unique symbol;
type Brand<B> = { readonly [__brand]: B };
type Branded<K, T> = K & Brand<T>;

// Branded types for Semantic-Repo values
export type TB58String = Branded<string, "B58String">;

// Custom schemas
const TB58Schema = T.Unsafe<TB58String>(
  T.String({
    pattern: "^[1-9A-HJ-NP-Za-km-z]+$", // Base58 character set
    description: "Base58 encoded string",
  }),
);

// Group Info Defn.
export const GroupInfoSchema = T.Object({
  n: T.String({ maxLength: 32 }), // name
  d: T.String({ maxLength: 1024 }), // desc
  c: T.Date({ default: Date.now() }), // created_At
  u: T.Date({ default: Date.now() }), // updated_At
});
export type TGroupInfo = Static<typeof GroupInfoSchema>;

// GroupID schemas
const TLocalGroupIDSchema = T.String({ ...TB58Schema, maxLength: 25 });
const TGlobalGroupIDSchema = T.String({ ...TB58Schema, maxLength: 45 });
const TGroupIDSchema = T.Union([TLocalGroupIDSchema, TGlobalGroupIDSchema]);

export type TLocalGroupID = Static<typeof TLocalGroupIDSchema>;
export type TGlobalGroupID = Static<typeof TGlobalGroupIDSchema>;
export type TGroupID = TLocalGroupID | TGlobalGroupID;

// The Groups record
export type TGroups = Record<TGroupID, TGroupInfo>;
export type TGroupChildren = Array<TGroupID>;
export type TGroupHierarchy = Record<TGroupID, TGroupChildren>;

// returns a local group id (shorter length < 25 chars)
const newLocalGroupID = (i: number, r = Math.random(), t = Date.now()): TLocalGroupID =>
  r.toString(36).slice(2, 8) + i.toString(36) + t.toString(36);

const sRootName = ".berg10";

export const initSemanticRepo = async (repoPath: TPath) => {
  const target = path.resolve(repoPath, sRootName);
  // check if a semantic repo already exists at the destination;
  const alreadyExists = await fs
    .access(target)
    .then(() => true)
    .catch(() => false);
  if (alreadyExists) throw new Error(`initSemanticRepo: [${target}] already exists.`);

  // destination folder does not exist,  copy the template folder (../template) to destination
  const desiredMode = 0o2775;
  return fs.ensureDir(repoPath, desiredMode).then(() => {
    return fs.copy(path.resolve(__dirname, "..", "template"), repoPath);
  });
};

class SemanticRepo {
  constructor(
    protected _groups: TGroups,
    protected _hier: TGroupHierarchy,
  ) {}
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
}

/**
 * @param repoPath the folder that contains `.berg10` folder
 */
export const openSemanticRepo = (repoPath: TPath) => {
  return Promise.all([Bun.file(path.resolve(repoPath, sRootName, "groups", "info.json")).arrayBuffer()]).then(() => {});
};

initSemanticRepo(os.tmpdir() as TPath).catch((ex) => console.error((ex as Error).message));
