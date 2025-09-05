import { type Static, Type } from "@sinclair/typebox";

export const GitObjectTypeSchema = Type.Union([
  Type.Literal("commit"),
  Type.Literal("tree"),
  Type.Literal("blob"),
  Type.Literal("tag"),
]);
export type TGitObjectType = Static<typeof GitObjectTypeSchema>;

export const GitObjectSchema = Type.Object({
  sha: Type.String({ pattern: "^[0-9a-f]{64}$" }),
  type: GitObjectTypeSchema,
  size: Type.Integer({ minimum: 0 }),
  data: Type.Uint8Array(), // zero-copy slice
});
export type TGitObject = Static<typeof GitObjectSchema>;

export const ImportCheckpointSchema = Type.Object({
  reflogSeq: Type.Integer({ minimum: 0 }),
  lastCommitSha: Type.String({ pattern: "^[0-9a-f]{40}$" }),
  parquetSn: Type.Integer({ minimum: 0 }),
  txnId: Type.String({ format: "uuid" }),
  ts: Type.Integer(), // epoch ms
});
export type TImportCheckpoint = Static<typeof ImportCheckpointSchema>;

export const ImportConfigSchema = Type.Object({
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
export type TImportConfig = Static<typeof ImportConfigSchema>;
