/**
 * Ultra high-performance GraphQL API controller for semantic-repo
 * Built with GraphQL Yoga for maximum performance
 */

import { createServer } from "node:http";
import type { Queue } from "bullmq";
import { createSchema, createYoga } from "graphql-yoga";
import type { IEntityService } from "../services/entity-service";
import type { IGroupService } from "../services/group-service";
import type { ILaneService } from "../services/lane-service";
import type {
	CreateEntityDto,
	CreateGroupDto,
	CreateLaneDto,
	EntityFilters,
	GroupFilters,
	ILane,
	ISemanticEntity,
	ISemanticGroup,
	LaneFilters,
	UpdateEntityDto,
	UpdateGroupDto,
	UpdateLaneDto,
} from "../types/core.types";
import logger from "../utils/logger";

const log = logger.child({ component: "GraphQLApiController" });

// GraphQL Type Definitions
const typeDefs = `
  type SemanticEntity {
    id: ID!
    type: String!
    name: String!
    description: String
    metadata: JSON
    tags: [String!]!
    createdAt: String!
    updatedAt: String!
    version: Int!
    checksum: String!
  }

  type SemanticGroup {
    id: ID!
    name: String!
    description: String
    lanes: [Lane!]!
    metadata: JSON
    createdAt: String!
    updatedAt: String!
    version: Int!
  }

  type Lane {
    id: ID!
    name: String!
    description: String
    groupId: String!
    entities: [String!]!
    processingConfig: LaneProcessingConfig!
    metadata: JSON
    createdAt: String!
    updatedAt: String!
    lastProcessedAt: String
    status: LaneStatus!
  }

  type LaneProcessingConfig {
    batchSize: Int!
    concurrency: Int!
    retryPolicy: RetryPolicy!
    timeout: Int!
  }

  type RetryPolicy {
    maxRetries: Int!
    backoffStrategy: String!
  }

  enum LaneStatus {
    ACTIVE
    PROCESSING
    PAUSED
    ERROR
    COMPLETED
  }

  type PaginatedEntities {
    data: [SemanticEntity!]!
    total: Int!
    page: Int!
    limit: Int!
    hasNext: Boolean!
  }

  type PaginatedGroups {
    data: [SemanticGroup!]!
    total: Int!
    page: Int!
    limit: Int!
    hasNext: Boolean!
  }

  type PaginatedLanes {
    data: [Lane!]!
    total: Int!
    page: Int!
    limit: Int!
    hasNext: Boolean!
  }

  type JobResult {
    jobId: ID!
    status: String!
  }

  type ProcessingResult {
    success: Boolean!
    processedCount: Int!
    errors: [String!]!
    duration: Float!
    timestamp: String!
  }

  scalar JSON

  input EntityFilterInput {
    type: String
    tags: [String!]
    createdAfter: String
    createdBefore: String
    limit: Int
    offset: Int
  }

  input GroupFilterInput {
    name: String
    createdAfter: String
    createdBefore: String
    limit: Int
    offset: Int
  }

  input LaneFilterInput {
    groupId: String
    status: LaneStatus
    createdAfter: String
    createdBefore: String
    limit: Int
    offset: Int
  }

  input CreateEntityInput {
    type: String!
    name: String!
    description: String
    metadata: JSON
    tags: [String!]
  }

  input UpdateEntityInput {
    name: String
    description: String
    metadata: JSON
    tags: [String!]
  }

  input CreateGroupInput {
    name: String!
    description: String
    metadata: JSON
  }

  input UpdateGroupInput {
    name: String
    description: String
    metadata: JSON
  }

  input CreateLaneInput {
    name: String!
    description: String
    groupId: String!
    processingConfig: LaneProcessingConfigInput
    metadata: JSON
  }

  input UpdateLaneInput {
    name: String
    description: String
    processingConfig: LaneProcessingConfigInput
    metadata: JSON
  }

  input LaneProcessingConfigInput {
    batchSize: Int!
    concurrency: Int!
    retryPolicy: RetryPolicyInput!
    timeout: Int!
  }

  input RetryPolicyInput {
    maxRetries: Int!
    backoffStrategy: String!
  }

  type Query {
    # Entity queries
    entities(filters: EntityFilterInput): PaginatedEntities!
    entity(id: ID!): SemanticEntity

    # Group queries
    groups(filters: GroupFilterInput): PaginatedGroups!
    group(id: ID!): SemanticGroup

    # Lane queries
    lanes(filters: LaneFilterInput): PaginatedLanes!
    lane(id: ID!): Lane
  }

  type Mutation {
    # Entity mutations
    createEntity(input: CreateEntityInput!): SemanticEntity!
    updateEntity(id: ID!, input: UpdateEntityInput!): SemanticEntity!
    deleteEntity(id: ID!): Boolean!

    # Group mutations
    createGroup(input: CreateGroupInput!): SemanticGroup!
    updateGroup(id: ID!, input: UpdateGroupInput!): SemanticGroup!
    deleteGroup(id: ID!): Boolean!

    # Lane mutations
    createLane(input: CreateLaneInput!): Lane!
    updateLane(id: ID!, input: UpdateLaneInput!): Lane!
    deleteLane(id: ID!): Boolean!
    processLane(id: ID!): ProcessingResult!

    # Job mutations
    createCacheJob(input: JSON!): JobResult!
    createIndexJob(input: JSON!): JobResult!
    createCleanupJob(input: JSON!): JobResult!
  }
`;

export class GraphQLApiController {
	private yoga: ReturnType<typeof createYoga>;

	constructor(
		private entityService: IEntityService,
		private groupService: IGroupService,
		private laneService: ILaneService,
		private cacheQueue: Queue,
		private indexingQueue: Queue,
		private cleanupQueue: Queue,
	) {
		this.yoga = createYoga({
			schema: createSchema({
				typeDefs: [typeDefs],
				resolvers: this.createResolvers(),
			}),
			logging: {
				debug: (...args) => log.debug(args),
				info: (...args) => log.info(args),
				warn: (...args) => log.warn(args),
				error: (...args) => log.error(args),
			},
		});
	}

	private createResolvers() {
		return {
			Query: {
				entities: async (_: any, { filters }: { filters?: any }) => {
					const entityFilters: EntityFilters = {
						type: filters?.type,
						tags: filters?.tags,
						createdAfter: filters?.createdAfter
							? new Date(filters.createdAfter)
							: undefined,
						createdBefore: filters?.createdBefore
							? new Date(filters.createdBefore)
							: undefined,
						limit: filters?.limit || 100,
						offset: filters?.offset || 0,
					};
					return await this.entityService.findAll(entityFilters);
				},
				entity: async (_: any, { id }: { id: string }) => {
					const entity = await this.entityService.findById(id);
					if (!entity) {
						throw new Error("Entity not found");
					}
					return entity;
				},
				groups: async (_: any, { filters }: { filters?: any }) => {
					const groupFilters: GroupFilters = {
						name: filters?.name,
						createdAfter: filters?.createdAfter
							? new Date(filters.createdAfter)
							: undefined,
						createdBefore: filters?.createdBefore
							? new Date(filters.createdBefore)
							: undefined,
						limit: filters?.limit || 100,
						offset: filters?.offset || 0,
					};
					return await this.groupService.findAll(groupFilters);
				},
				group: async (_: any, { id }: { id: string }) => {
					const group = await this.groupService.findById(id);
					if (!group) {
						throw new Error("Group not found");
					}
					return group;
				},
				lanes: async (_: any, { filters }: { filters?: any }) => {
					const laneFilters: LaneFilters = {
						groupId: filters?.groupId,
						status: filters?.status,
						createdAfter: filters?.createdAfter
							? new Date(filters.createdAfter)
							: undefined,
						createdBefore: filters?.createdBefore
							? new Date(filters.createdBefore)
							: undefined,
						limit: filters?.limit || 100,
						offset: filters?.offset || 0,
					};
					return await this.laneService.findAll(laneFilters);
				},
				lane: async (_: any, { id }: { id: string }) => {
					const lane = await this.laneService.findById(id);
					if (!lane) {
						throw new Error("Lane not found");
					}
					return lane;
				},
			},
			Mutation: {
				createEntity: async (_: any, { input }: { input: CreateEntityDto }) => {
					return await this.entityService.create(input);
				},
				updateEntity: async (
					_: any,
					{ id, input }: { id: string; input: UpdateEntityDto },
				) => {
					return await this.entityService.update(id, input);
				},
				deleteEntity: async (_: any, { id }: { id: string }) => {
					await this.entityService.delete(id);
					return true;
				},
				createGroup: async (_: any, { input }: { input: CreateGroupDto }) => {
					return await this.groupService.create(input);
				},
				updateGroup: async (
					_: any,
					{ id, input }: { id: string; input: UpdateGroupDto },
				) => {
					return await this.groupService.update(id, input);
				},
				deleteGroup: async (_: any, { id }: { id: string }) => {
					await this.groupService.delete(id);
					return true;
				},
				createLane: async (_: any, { input }: { input: CreateLaneDto }) => {
					return await this.laneService.create(input);
				},
				updateLane: async (
					_: any,
					{ id, input }: { id: string; input: UpdateLaneDto },
				) => {
					return await this.laneService.update(id, input);
				},
				deleteLane: async (_: any, { id }: { id: string }) => {
					await this.laneService.delete(id);
					return true;
				},
				processLane: async (_: any, { id }: { id: string }) => {
					return await this.laneService.processLane(id);
				},
				createCacheJob: async (_: any, { input }: { input: any }) => {
					const job = await this.cacheQueue.add("refresh-cache", input);
					return { jobId: job.id, status: "queued" };
				},
				createIndexJob: async (_: any, { input }: { input: any }) => {
					const job = await this.indexingQueue.add("index-lane", input);
					return { jobId: job.id, status: "queued" };
				},
				createCleanupJob: async (_: any, { input }: { input: any }) => {
					const job = await this.cleanupQueue.add("cleanup-resources", input);
					return { jobId: job.id, status: "queued" };
				},
			},
			JSON: {
				parseValue: (value: any) => value,
				serialize: (value: any) => value,
			},
		};
	}

	public getIntegrations() {
		return {
			graphql: this.yoga,
		};
	}

	public getServer() {
		return createServer(this.yoga);
	}
}
