import { yoga } from "@elysiajs/graphql-yoga";
import { Elysia } from "elysia";
import type { GraphQLSchema } from "graphql";
import { buildSchema } from "graphql";
import { createPubSub } from "graphql-yoga";
import { SemanticRepoManager } from "./semantic-repo-manager";
import type { BlobSha256, EntityId, LaneSha, TSemanticGroupConfig } from "./types";

// ---------- Pub-Sub ----------
const pubsub = createPubSub<{
	indexingStarted: [payload: { laneSha: LaneSha; entityId: EntityId }];
	indexingFinished: [
		payload: { laneSha: LaneSha; entityId: EntityId; success: boolean },
	];
}>();

// ---------- Resolvers ----------
const repo = new SemanticRepoManager(process.env.REPO_ROOT ?? process.cwd());

const resolvers = {
	Query: {
		groups: async () => {
			const names = await repo.listGroups();
			return Promise.all(names.map(async (n) => repo.getGroup(n)));
		},
		group: async (_: unknown, { name }: { name: string }) =>
			repo.getGroup(name),

		lanes: async (_: unknown, { laneSha }: { laneSha: LaneSha }) => {
			const entries = await repo.listManifestEntries(laneSha);
			return { laneSha, entries };
		},

		entry: async (
			_: unknown,
			{ laneSha, entityId }: { laneSha: LaneSha; entityId: EntityId },
		) => repo.readManifestEntry(laneSha, entityId),

		blob: async (_: unknown, { sha256 }: { sha256: BlobSha256 }) => {
			const buffer = await repo.readBlob(sha256);
			return buffer ? { sha256, size: buffer.length } : null;
		},
	},

	Mutation: {
		createGroup: async (
			_: unknown,
			{ name, config }: { name: string; config: TSemanticGroupConfig },
		) => repo.createGroup(name, config),

		updateGroup: async (
			_: unknown,
			{ name, patch }: { name: string; patch: Partial<TSemanticGroupConfig> },
		) => repo.updateGroup(name, patch),

		deleteGroup: async (_: unknown, { name }: { name: string }) => {
			await repo.deleteGroup(name);
			return true;
		},

		triggerIndexing: async (
			_: unknown,
			{ laneSha, entityId }: { laneSha: LaneSha; entityId: EntityId },
		) => {
			// 1. Start indexing process
			pubsub.publish("indexingStarted", {
				laneSha: laneSha as LaneSha,
				entityId: entityId as EntityId,
			});

			// 2. Perform actual indexing work in background
			;(async () => {
				try {
					// Read the existing manifest entry if it exists
					const existingEntry = await repo.readManifestEntry(laneSha, entityId);
					
					if (!existingEntry) {
						throw new Error(`Manifest entry not found for entity ${entityId} in lane ${laneSha}`);
					}

					// Simulate actual embedding generation process
					// In a real implementation, this would call an embedding service
					const embeddingData = {
						dtype: "float32" as const,
						shape: [768], // Example BERT embedding size
						data: btoa(String.fromCharCode(...new Uint8Array(768 * 4))), // Simulated embedding data
					};

					// Create updated manifest entry with embedding
					const updatedEntry = {
						...existingEntry,
						embedding: embeddingData,
						embedder: "bert",
						model_cfg_digest: "sha256:current-model-config",
						git_commit: process.env.GIT_COMMIT || "HEAD",
						created_at: new Date().toISOString(),
						tags: [...(existingEntry.tags || []), "indexed"],
					};

					// Write the updated manifest entry
					await repo.writeManifestEntry(updatedEntry);

					// Publish success event
					pubsub.publish("indexingFinished", {
						laneSha: laneSha as LaneSha,
						entityId: entityId as EntityId,
						success: true,
					});
				} catch (error) {
					console.error(`Indexing failed for entity ${entityId} in lane ${laneSha}:`, error);
					
					// Publish failure event
					pubsub.publish("indexingFinished", {
						laneSha: laneSha as LaneSha,
						entityId: entityId as EntityId,
						success: false,
					});
				}
			})();

			return true;
		},
	},

	Subscription: {
		indexingStarted: {
			subscribe: () => pubsub.subscribe("indexingStarted"),
			resolve: (payload: { laneSha: LaneSha; entityId: EntityId }) => payload,
		},
		indexingFinished: {
			subscribe: () => pubsub.subscribe("indexingFinished"),
			resolve: (payload: { laneSha: LaneSha; entityId: EntityId; success: boolean }) => payload,
		},
	},

	Group: {
		lanes: async (parent: { lanes: Array<{ sha256: string }> }) => {
			// parent.lanes is already in config
			return parent.lanes.map((l) => ({ laneSha: l.sha256 as LaneSha }));
		},
	},

	Lane: {
		entries: async (parent: { laneSha: LaneSha }) =>
			repo.listManifestEntries(parent.laneSha),
	},

	ManifestEntry: {
		blob: async (parent: { blob_sha256: BlobSha256 }) => {
			const buffer = await repo.readBlob(parent.blob_sha256);
			return buffer
				? { sha256: parent.blob_sha256, size: buffer.length }
				: null;
		},
	},
};

// ---------- Schema ----------
const schema = buildSchema(/* GraphQL */ `
  scalar DateTime

  type Query {
    groups: [Group!]!
    group(name: String!): Group
    lanes(laneSha: String!): Lane!
    entry(laneSha: String!, entityId: String!): ManifestEntry
    blob(sha256: String!): Blob
  }

  type Mutation {
    createGroup(name: String!, config: JSON!): Group!
    updateGroup(name: String!, patch: JSON!): Group!
    deleteGroup(name: String!): Boolean!
    triggerIndexing(laneSha: String!, entityId: String!): Boolean!
  }

  type Subscription {
    indexingStarted: IndexingEvent!
    indexingFinished: IndexingEvent!
  }

  type IndexingEvent {
    laneSha: String!
    entityId: String!
    success: Boolean
  }

  type Group {
    name: String!
    description: String
    filter: JSON
    grouping: JSON
    lanes: [Lane!]!
  }

  type Lane {
    laneSha: String!
    entries: [ManifestEntry!]!
  }

  type ManifestEntry {
    entity_id: String!
    src_sha256: String!
    blob_sha256: String!
    lane_sha256: String!
    embedder: String!
    model_cfg_digest: String!
    git_commit: String!
    created_at: DateTime!
    tags: [String!]!
    embedding: Embedding
    blob: Blob!
  }

  type Embedding {
    dtype: String!
    shape: [Int!]!
    data: String! # base64
  }

  type Blob {
    sha256: String!
    size: Int!
  }

  scalar JSON
`);

// Create Elysia app
const app = new Elysia()
	.use(
		yoga({
			schema,
			resolvers: resolvers as any,
			context: () => ({ pubsub }),
		}),
	)
	.get("/", ({ redirect }) => redirect("/graphql"));

export default app;
