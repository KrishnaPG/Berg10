/**
 * Ultra high-performance validation schemas for semantic-repo
 * Built with Zod for maximum type safety and performance
 */

import { z } from "zod";

// Entity validation schemas
export const CreateEntitySchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, "Name is required"),
	type: z.string().min(1, "Type is required"),
	description: z.string().optional(),
	tags: z.array(z.string()).default([]),
	metadata: z.record(z.string(), z.any()).optional(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export const UpdateEntitySchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	type: z.string().min(1, "Type is required").optional(),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
	metadata: z.record(z.string(), z.any()).optional(),
	updatedAt: z.date().default(() => new Date()),
});

export const EntityFilterSchema = z.object({
	type: z.string().optional(),
	tags: z.array(z.string()).optional(),
	limit: z.number().min(1).max(1000).default(100),
	offset: z.number().min(0).default(0),
});

// Group validation schemas
export const CreateGroupSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	entityIds: z.array(z.string()).default([]),
	metadata: z.record(z.string(), z.any()).optional(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export const UpdateGroupSchema = z.object({
	name: z.string().min(1, "Name is required").optional(),
	description: z.string().optional(),
	entityIds: z.array(z.string()).optional(),
	metadata: z.record(z.string(), z.any()).optional(),
	updatedAt: z.date().default(() => new Date()),
});

export const GroupFilterSchema = z.object({
	name: z.string().optional(),
	limit: z.number().min(1).max(1000).default(100),
	offset: z.number().min(0).default(0),
});

// Lane validation schemas
export const CreateLaneSchema = z.object({
	id: z.string().optional(),
	groupId: z.string().min(1, "Group ID is required"),
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	status: z.enum(["active", "inactive", "pending", "completed"]).default("pending"),
	priority: z.number().min(1).max(10).default(5),
	entityIds: z.array(z.string()).default([]),
	config: z.record(z.string(), z.any()).optional(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional(),
});

export const UpdateLaneSchema = z.object({
	groupId: z.string().min(1, "Group ID is required").optional(),
	name: z.string().min(1, "Name is required").optional(),
	description: z.string().optional(),
	status: z.enum(["active", "inactive", "pending", "completed"]).optional(),
	priority: z.number().min(1).max(10).optional(),
	entityIds: z.array(z.string()).optional(),
	config: z.record(z.string(), z.any()).optional(),
	updatedAt: z.date().default(() => new Date()),
});

export const LaneFilterSchema = z.object({
	groupId: z.string().optional(),
	status: z.enum(["active", "inactive", "pending", "completed"]).optional(),
	limit: z.number().min(1).max(1000).default(100),
	offset: z.number().min(0).default(0),
});

// Job validation schemas
export const CacheJobSchema = z.object({
	operation: z.enum(["refresh", "invalidate", "warmup"]),
	target: z.enum(["entity", "group", "lane", "all"]),
	id: z.string().optional(),
	tags: z.array(z.string()).optional(),
});

export const IndexingJobSchema = z.object({
	operation: z.enum(["index", "reindex", "update", "delete"]),
	target: z.enum(["entity", "group", "lane", "all"]),
	id: z.string().optional(),
	groupId: z.string().optional(),
	laneId: z.string().optional(),
	force: z.boolean().default(false),
});

export const CleanupJobSchema = z.object({
	operation: z.enum(["cleanup", "purge", "archive", "optimize"]),
	target: z.enum(["entities", "groups", "lanes", "all", "temp", "logs"]),
	olderThan: z.string().datetime().optional(),
	dryRun: z.boolean().default(false),
	batchSize: z.number().min(1).max(1000).default(100),
});

// Error response schema
export const ErrorResponseSchema = z.object({
	error: z.string(),
	status: z.number(),
	timestamp: z.date().default(() => new Date()),
	path: z.string().optional(),
	method: z.string().optional(),
});

// Health check schema
export const HealthCheckSchema = z.object({
	status: z.enum(["healthy", "degraded", "unhealthy"]),
	timestamp: z.date(),
	version: z.string(),
	uptime: z.number(),
	database: z.object({
		status: z.enum(["up", "down"]),
		responseTime: z.number(),
	}),
	redis: z.object({
		status: z.enum(["up", "down"]),
		responseTime: z.number(),
	}),
	workers: z.object({
		cache: z.object({
			status: z.enum(["up", "down"]),
			activeJobs: z.number(),
		}),
		indexing: z.object({
			status: z.enum(["up", "down"]),
			activeJobs: z.number(),
		}),
		cleanup: z.object({
			status: z.enum(["up", "down"]),
			activeJobs: z.number(),
		}),
	}),
	memory: z.object({
		used: z.number(),
		total: z.number(),
		percentage: z.number(),
	}),
	cpu: z.object({
		usage: z.number(),
	}),
});

// Pagination schema
export const PaginationSchema = z.object({
	page: z.number().min(1).default(1),
	limit: z.number().min(1).max(1000).default(100),
	sortBy: z.string().optional(),
	sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Search schema
export const SearchSchema = z.object({
	query: z.string().min(1, "Search query is required"),
	type: z.enum(["entity", "group", "lane", "all"]).default("all"),
	filters: z.record(z.string(), z.any()).optional(),
	limit: z.number().min(1).max(1000).default(100),
	offset: z.number().min(0).default(0),
});

// Export schema types
export type CreateEntityDto = z.infer<typeof CreateEntitySchema>;
export type UpdateEntityDto = z.infer<typeof UpdateEntitySchema>;
export type EntityFilterDto = z.infer<typeof EntityFilterSchema>;

export type CreateGroupDto = z.infer<typeof CreateGroupSchema>;
export type UpdateGroupDto = z.infer<typeof UpdateGroupSchema>;
export type GroupFilterDto = z.infer<typeof GroupFilterSchema>;

export type CreateLaneDto = z.infer<typeof CreateLaneSchema>;
export type UpdateLaneDto = z.infer<typeof UpdateLaneSchema>;
export type LaneFilterDto = z.infer<typeof LaneFilterSchema>;

export type CacheJobData = z.infer<typeof CacheJobSchema>;
export type IndexingJobData = z.infer<typeof IndexingJobSchema>;
export type CleanupJobData = z.infer<typeof CleanupJobSchema>;

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type HealthCheckResponse = z.infer<typeof HealthCheckSchema>;
export type PaginationParams = z.infer<typeof PaginationSchema>;
export type SearchParams = z.infer<typeof SearchSchema>;

// Validation helpers
export function validateEntity(data: CreateEntityDto | UpdateEntityDto): CreateEntityDto | UpdateEntityDto {
	if ("id" in data && data.id) {
		return UpdateEntitySchema.parse(data);
	}
	return CreateEntitySchema.parse(data);
}

export function validateGroup(data: CreateGroupDto | UpdateGroupDto): CreateGroupDto | UpdateGroupDto {
	if ("id" in data && data.id) {
		return UpdateGroupSchema.parse(data);
	}
	return CreateGroupSchema.parse(data);
}

export function validateLane(data: CreateLaneDto | UpdateLaneDto): CreateLaneDto | UpdateLaneDto {
	if ("id" in data && data.id) {
		return UpdateLaneSchema.parse(data);
	}
	return CreateLaneSchema.parse(data);
}

export function validateFilters<T extends EntityFilterDto | GroupFilterDto | LaneFilterDto>(
	data: T,
	type: "entity" | "group" | "lane",
): T {
	switch (type) {
		case "entity":
			return EntityFilterSchema.parse(data) as T;
		case "group":
			return GroupFilterSchema.parse(data) as T;
		case "lane":
			return LaneFilterSchema.parse(data) as T;
		default:
			throw new Error(`Unknown filter type: ${type}`);
	}
}