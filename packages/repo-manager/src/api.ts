import { yoga } from "@elysiajs/graphql-yoga";
import { Elysia } from "elysia";
import type { GraphQLSchema } from "graphql";
import { buildSchema } from "graphql";
import { createPubSub } from "graphql-yoga";
import { SemanticRepoManager } from "./semantic-repo-manager";

// ---------- Pub-Sub ----------
const pubsub = createPubSub<{
	indexingStarted: [payload: { laneSha: string; entityId: string }];
	indexingFinished: [
		payload: { laneSha: string; entityId: string; success: boolean },
	];
}>();

// ---------- Resolvers ----------
const repo = new SemanticRepoManager(process.env.REPO_ROOT ?? ".");

const resolvers = {
	Query: {
		groups: async () => {
			const names = await repo.listGroups();
			return Promise.all(names.map(async (n) => repo.getGroup(n)));
		},
		group: async (_: any, { name }: { name: string }) => repo.getGroup(name),

		lanes: async (_: any, { laneSha }: { laneSha: string }) => {
			const entries = await repo.listManifestEntries(laneSha);
			return { laneSha, entries };
		},

		entry: async (
			_: any,
			{ laneSha, entityId }: { laneSha: string; entityId: string },
		) => repo.readManifestEntry(laneSha, entityId),

		blob: async (_: any, { sha256 }: { sha256: string }) => {
			const buffer = await repo.readBlob(sha256);
			return buffer ? { sha256, size: buffer.length } : null;
		},
	},

	Mutation: {
		createGroup: async (
			_: any,
			{ name, config }: { name: string; config: any },
		) => repo.createGroup(name, config),

		updateGroup: async (
			_: any,
			{ name, patch }: { name: string; patch: any },
		) => repo.updateGroup(name, patch),

		deleteGroup: async (_: any, { name }: { name: string }) => {
			await repo.deleteGroup(name);
			return true;
		},

		triggerIndexing: async (
			_: any,
			{ laneSha, entityId }: { laneSha: string; entityId: string },
		) => {
			// 1. enqueue (dummy queue here)
			pubsub.publish("indexingStarted", { laneSha, entityId });

			// 2. simulate background work
			setTimeout(async () => {
				// pretend we produced embedding
				await repo.writeManifestEntry({
					entity_id: entityId,
					src_sha256: "dummy",
					blob_sha256: "dummy",
					lane_sha256: laneSha,
					embedder: "bert",
					model_cfg_digest: "sha256:xyz",
					git_commit: "HEAD",
					created_at: new Date().toISOString(),
					tags: ["auto"],
				});

				pubsub.publish("indexingFinished", {
					laneSha,
					entityId,
					success: true,
				});
			}, 2000);

			return true;
		},
	},

	Subscription: {
		indexingStarted: {
			subscribe: () => pubsub.subscribe("indexingStarted"),
			resolve: (payload: any) => payload,
		},
		indexingFinished: {
			subscribe: () => pubsub.subscribe("indexingFinished"),
			resolve: (payload: any) => payload,
		},
	},

	Group: {
		lanes: async (parent: any) => {
			// parent.lanes is already in config
			return parent.lanes.map((l: any) => ({ laneSha: l.sha256 }));
		},
	},

	Lane: {
		entries: async (parent: { laneSha: string }) =>
			repo.listManifestEntries(parent.laneSha),
	},

	ManifestEntry: {
		blob: async (parent: any) =>
			resolvers.Query.blob({}, { sha256: parent.blob_sha256 }),
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

console.log(
	"🚀 Semantic Content Management System API running at http://localhost:3000/graphql",
);

export default app;
