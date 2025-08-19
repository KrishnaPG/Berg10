import { yoga as createYoga } from "@elysiajs/graphql-yoga";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { Elysia } from "elysia";
import { SemanticRepoManager } from "./semantic-repo-manager";
import type { GraphQLContext } from "./types";

// GraphQL type definitions
const typeDefs = `
  type SemanticEntity {
    entity_id: String!
    src_sha256: String!
    file_path: String!
    byte_range: [Int]
    mime_type: String!
    metadata: JSON
    git_commit: String!
  }

  type ManifestEntry {
    entity_id: String!
    src_sha256: String!
    blob_sha256: String!
    lane_sha256: String!
    embedder: String!
    model_cfg_digest: String!
    git_commit: String!
    created_at: String!
    tags: [String!]!
  }

  type JobEntry {
    job_id: String!
    status: String!
    created_at: String!
    worker_id: String
    heartbeat_ts: String
    progress: Float
    error_message: String
  }

  type QueueEntry {
    entity_id: String!
    src_sha256: String!
    lane_sha256: String!
    enqueue_ts: String!
    retries: Int!
    lease_expires: String
    worker_id: String
  }

  type SemanticGroup {
    sha256: String!
    name: String!
    description: String!
    filter: JSON!
    versionPolicy: JSON!
    grouping: JSON!
    lanes: [JSON!]!
    metadata: JSON!
  }

  type Query {
    groups: [String!]!
    group(name: String!): SemanticGroup
    job(jobId: String!): JobEntry
    queueLength(laneSha: String): Int!
    queueEntries(laneSha: String): [QueueEntry!]!
  }

  type Mutation {
    createGroup(name: String!, config: JSON!): Boolean!
    updateGroup(name: String!, config: JSON!): Boolean!
    deleteGroup(name: String!): Boolean!
    triggerProcessing(groupName: String!, commitSha: String!): Boolean!
  }

  type Subscription {
    jobUpdates(jobId: String!): JobEntry!
    systemEvents: String!
  }

  scalar JSON
`;

// GraphQL resolvers
const resolvers = {
	Query: {
		groups: (_: any, __: any, { repoManager }: GraphQLContext) => {
			return repoManager.listGroups();
		},

		group: (
			_: any,
			{ name }: { name: string },
			{ repoManager }: GraphQLContext,
		) => {
			return repoManager.getGroup(name);
		},

		job: (
			_: any,
			{ jobId }: { jobId: string },
			{ repoManager }: GraphQLContext,
		) => {
			return repoManager.getJobStatus(jobId);
		},

		queueLength: (
			_: any,
			{ laneSha }: { laneSha?: string },
			{ repoManager }: GraphQLContext,
		) => {
			return repoManager.getQueueLength(laneSha);
		},

		queueEntries: (
			_: any,
			{ laneSha }: { laneSha?: string },
			{ repoManager }: GraphQLContext,
		) => {
			// This would require adding a method to the repo manager
			// For now, return an empty array
			return [];
		},
	},

	Mutation: {
		createGroup: (
			_: any,
			{ name, config }: { name: string; config: any },
			{ repoManager }: GraphQLContext,
		) => {
			try {
				repoManager.createGroup(name, config);
				return true;
			} catch (error) {
				console.error("Error creating group:", error);
				return false;
			}
		},

		updateGroup: (
			_: any,
			{ name, config }: { name: string; config: any },
			{ repoManager }: GraphQLContext,
		) => {
			try {
				repoManager.updateGroup(name, config);
				return true;
			} catch (error) {
				console.error("Error updating group:", error);
				return false;
			}
		},

		deleteGroup: (
			_: any,
			{ name }: { name: string },
			{ repoManager }: GraphQLContext,
		) => {
			try {
				repoManager.deleteGroup(name);
				return true;
			} catch (error) {
				console.error("Error deleting group:", error);
				return false;
			}
		},

		triggerProcessing: (
			_: any,
			{ groupName, commitSha }: { groupName: string; commitSha: string },
			{ repoManager }: GraphQLContext,
		) => {
			try {
				repoManager.triggerProcessing(groupName, commitSha);
				return true;
			} catch (error) {
				console.error("Error triggering processing:", error);
				return false;
			}
		},
	},

	Subscription: {
		jobUpdates: {
			subscribe: (
				_: any,
				{ jobId }: { jobId: string },
				{ pubsub }: GraphQLContext,
			) => {
				// This would require implementing a pubsub system
				// For now, return a dummy async iterator
				const dummyIterator = {
					async next() {
						// In a real implementation, this would wait for actual job updates
						await new Promise((resolve) => setTimeout(resolve, 5000));
						return {
							value: { job_id: jobId, status: "COMPLETED" },
							done: false,
						};
					},
					async return() {
						return { value: undefined, done: true };
					},
					[Symbol.asyncIterator]() {
						return this;
					},
				};

				return dummyIterator;
			},
		},

		systemEvents: {
			subscribe: (_: any, __: any, { pubsub }: GraphQLContext) => {
				// This would require implementing a pubsub system
				// For now, return a dummy async iterator
				const dummyIterator = {
					async next() {
						// In a real implementation, this would wait for actual system events
						await new Promise((resolve) => setTimeout(resolve, 10000));
						return { value: "System event", done: false };
					},
					async return() {
						return { value: undefined, done: true };
					},
					[Symbol.asyncIterator]() {
						return this;
					},
				};

				return dummyIterator;
			},
		},
	},
};

// Create executable schema
const schema = makeExecutableSchema({
	typeDefs,
	resolvers,
});

// Create GraphQL Yoga instance
const yoga = createYoga({
	schema,
	context: (req): GraphQLContext => {
		// In a real implementation, we would create a new instance of the repo manager
		// or use a shared instance depending on the deployment model

		// For now, create a new instance for each request
		const repoManager = new SemanticRepoManager("./semantic-repo");
		repoManager.initialize();

		return {
			repoManager,
			req,
			pubsub: null, // Placeholder for pubsub system
		};
	},
	multipart: false,
});

// Create Elysia app
const app = new Elysia()
	.use(yoga)
	.get("/", ({ redirect }) => redirect("/graphql"))
	.listen(3000);

console.log(
	"🚀 Semantic Content Management System API running at http://localhost:3000/graphql",
);

export default app;
