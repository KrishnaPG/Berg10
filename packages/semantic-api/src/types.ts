import { type Static, t as T } from "elysia";

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
  c: T.Number({ default: Date.now() }), // created_At
  u: T.Number({ default: Date.now() }), // updated_At
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
