import { type Static, Type as T } from "@sinclair/typebox";

// Core types for the semantic repository system
export const SemanticEntity = T.Object({
	entity_id: T.String(),
	src_sha256: T.String(),
	file_path: T.String(),
	byte_range: T.Optional(T.Tuple([T.Number(), T.Number()])),
	mime_type: T.String(),
	metadata: T.Optional(T.Record(T.String(), T.Any())),
	git_commit: T.String(),
});

export type TSemanticEntity = Static<typeof SemanticEntity>;

export const ManifestEntry = T.Object({
	entity_id: T.String(),
	src_sha256: T.String(),
	blob_sha256: T.String(),
	lane_sha256: T.String(),
	embedder: T.String(),
	model_cfg_digest: T.String(),
	git_commit: T.String(),
	created_at: T.String({ format: "date-time" }),
	tags: T.Array(T.String()),
	embedding: T.Optional(
		T.Object({
			dtype: T.Literal("float32"),
			shape: T.Array(T.Number()),
			data: T.String(), // base64
		}),
	),
});

export type TManifestEntry = Static<typeof ManifestEntry>;

export const FilterOperator = T.Union([
	T.Literal("AND"),
	T.Literal("OR"),
	T.Literal("NOT"),
]);

export const FilterCondition = T.Object({
	field: T.String(),
	op: T.String(),
	value: T.Any(),
});

export const FilterOperand = T.Union([
	FilterCondition,
	T.Object({
		operator: FilterOperator,
		operands: T.Any(),
	}),
]);

export type TFilterOperand = Static<typeof FilterOperand>;

export const VersionPolicy = T.Object({
	mode: T.String(),
	branch: T.Optional(T.String()),
	tag: T.Optional(T.String()),
});

export type TVersionPolicy = Static<typeof VersionPolicy>;

export const GroupingRule = T.Object({
	match: T.Record(T.String(), T.Any()),
	strategy: T.String(),
	pageRange: T.Optional(T.Array(T.Number())),
	entityNameTemplate: T.String(),
});

export type TGroupingRule = Static<typeof GroupingRule>;

export const GroupingConfig = T.Object({
	strategy: T.String(),
	rules: T.Array(GroupingRule),
});

export type TGroupingConfig = Static<typeof GroupingConfig>;

export const EmbedderConfig = T.Object({
	model: T.String(),
	uri: T.String(),
	digest: T.String(),
	parameters: T.Record(T.String(), T.Any()),
	modality: T.String(),
	postProcessing: T.Array(T.String()),
});

export type TEmbedderConfig = Static<typeof EmbedderConfig>;

export const IndexConfig = T.Object({
	chunkSize: T.Number(),
	overlap: T.Number(),
	storeVectors: T.Boolean(),
	storeMetadata: T.Boolean(),
});

export type TIndexConfig = Static<typeof IndexConfig>;

export const VisibilityConfig = T.Object({
	scope: T.String(),
	teams: T.Array(T.String()),
});

export type TVisibilityConfig = Static<typeof VisibilityConfig>;

export const RetentionPolicy = T.Object({
	policy: T.String(),
	n: T.Optional(T.Number()),
	maxAge: T.Optional(T.String()),
});

export type TRetentionPolicy = Static<typeof RetentionPolicy>;

export const LaneConfig = T.Object({
	sha256: T.String(),
	displayName: T.String(),
	embedder: EmbedderConfig,
	indexConfig: IndexConfig,
	tags: T.Array(T.String()),
	visibility: VisibilityConfig,
	retention: RetentionPolicy,
});

export type TLaneConfig = Static<typeof LaneConfig>;

export const SemanticGroupConfig = T.Object({
	sha256: T.String(),
	name: T.String(),
	description: T.String(),
	filter: FilterOperand,
	versionPolicy: VersionPolicy,
	grouping: GroupingConfig,
	lanes: T.Array(LaneConfig),
	metadata: T.Record(T.String(), T.Any()),
});

export type TSemanticGroupConfig = Static<typeof SemanticGroupConfig>;

export const JobStatus = T.Union([
	T.Literal("PENDING"),
	T.Literal("RUNNING"),
	T.Literal("COMPLETED"),
	T.Literal("FAILED"),
]);

export type TJobStatus = Static<typeof JobStatus>;

export const JobEntry = T.Object({
	job_id: T.String(),
	status: JobStatus,
	created_at: T.String(),
	worker_id: T.Optional(T.String()),
	heartbeat_ts: T.Optional(T.String()),
	progress: T.Optional(T.Number()),
	error_message: T.Optional(T.String()),
});

export type TJobEntry = Static<typeof JobEntry>;

export const QueueEntry = T.Object({
	entity_id: T.String(),
	src_sha256: T.String(),
	lane_sha256: T.String(),
	enqueue_ts: T.String(),
	retries: T.Number(),
	lease_expires: T.Optional(T.String()),
	worker_id: T.Optional(T.String()),
});

export type TQueueEntry = Static<typeof QueueEntry>;


// Branded types for better type safety
export type SHA256 = string & { readonly __brand: unique symbol };
export type LaneSha = SHA256 & { readonly __laneBrand: unique symbol };
export type EntityId = string & { readonly __entityBrand: unique symbol };
export type BlobSha256 = SHA256 & { readonly __blobBrand: unique symbol };
