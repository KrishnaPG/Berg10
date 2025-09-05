import { type Static, Type } from "@sinclair/typebox";

export const TObjectType = Type.Union([
  Type.Literal("commit"),
  Type.Literal("tree"),
  Type.Literal("blob"),
  Type.Literal("tag"),
]);
export type ObjectType = Static<typeof TObjectType>;

export const TGitObject = Type.Object({
  sha: Type.String({ pattern: "^[0-9a-f]{40}$" }),
  type: TObjectType,
  size: Type.Integer({ minimum: 0 }),
  data: Type.Uint8Array(), // zero-copy slice
});
export type GitObject = Static<typeof TGitObject>;

export const TCheckpoint = Type.Object({
  reflogSeq: Type.Integer({ minimum: 0 }),
  lastCommitSha: Type.String({ pattern: "^[0-9a-f]{40}$" }),
  parquetSn: Type.Integer({ minimum: 0 }),
  txnId: Type.String({ format: "uuid" }),
  ts: Type.Integer(), // epoch ms
});
export type Checkpoint = Static<typeof TCheckpoint>;

export const TConfig = Type.Object({
  version: Type.Literal(1),
  parquet: Type.Object({
    targetRowGroupSize: Type.Integer({ minimum: 1024 }),
    compression: Type.Union([Type.Literal("zstd"), Type.Literal("snappy"), Type.Literal("gzip")]),
    pageChecksum: Type.Boolean(),
    maxOpenFiles: Type.Integer({ minimum: 1 }),
  }),
  sync: Type.Object({
    reflogLookbackHours: Type.Integer({ minimum: 0 }),
    workers: Type.Integer({ minimum: 0 }), // 0 == cpus
    channelCapacity: Type.Integer({ minimum: 1 }),
    memoryLimitMiB: Type.Integer({ minimum: 64 }),
  }),
  logging: Type.Object({
    level: Type.Union([
      Type.Literal("trace"),
      Type.Literal("debug"),
      Type.Literal("info"),
      Type.Literal("warn"),
      Type.Literal("error"),
    ]),
    file: Type.String(),
  }),
});
export type Config = Static<typeof TConfig>;
