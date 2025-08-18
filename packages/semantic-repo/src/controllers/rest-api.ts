/**
 * Ultra high-performance REST API controller for semantic-repo
 * Built with Elysia for maximum performance
 */

import type { Queue } from "bullmq";
import type { Elysia } from "elysia";
import type { IEntityService } from "../services/entity-service";
import type { IGroupService } from "../services/group-service";
import type { ILaneService } from "../services/lane-service";
import type {
	CreateEntityDto,
	CreateGroupDto,
	CreateLaneDto,
	EntityFilterDto,
	GroupFilterDto,
	ILane,
	ISemanticEntity,
	ISemanticGroup,
	LaneFilterDto,
	UpdateEntityDto,
	UpdateGroupDto,
	UpdateLaneDto,
} from "../types/core.types";
import logger from "../utils/logger";

interface EntityParams {
	id: string;
}

interface GroupParams {
	id: string;
}

interface LaneParams {
	id: string;
}

interface EntityQuery {
	type?: string;
	tags?: string;
	limit?: string;
	offset?: string;
}

interface GroupQuery {
	name?: string;
	limit?: string;
	offset?: string;
}

interface LaneQuery {
	groupId?: string;
	status?: string;
	limit?: string;
	offset?: string;
}

interface JobBody {
	entityId?: string;
	groupId?: string;
	laneId?: string;
	[key: string]: any;
}

const log = logger.child({ component: "RestApiController" });

export class RestApiController {
	constructor(
		private app: Elysia,
		private entityService: IEntityService,
		private groupService: IGroupService,
		private laneService: ILaneService,
		private cacheQueue: Queue,
		private indexingQueue: Queue,
		private cleanupQueue: Queue,
	) {
		this.setupRoutes();
	}

	private setupRoutes(): void {
		// Entity endpoints
		this.app.get(
			"/api/v1/entities",
			async ({ query }: { query: EntityQuery }) => {
				const filters: EntityFilters = {
					type: query.type,
					tags: query.tags?.split(","),
					limit: parseInt(query.limit || "100"),
					offset: parseInt(query.offset || "0"),
				};
				return await this.entityService.findAll(filters);
			},
		);

		this.app.get(
			"/api/v1/entities/:id",
			async ({ params }: { params: EntityParams }) => {
				const entity = await this.entityService.findById(params.id);
				if (!entity) {
					throw new Error("Entity not found");
				}
				return entity;
			},
		);

		this.app.post(
			"/api/v1/entities",
			async ({ body }: { body: CreateEntityDto }) => {
				return await this.entityService.create(body);
			},
		);

		this.app.put(
			"/api/v1/entities/:id",
			async ({
				params,
				body,
			}: {
				params: EntityParams;
				body: UpdateEntityDto;
			}) => {
				return await this.entityService.update(params.id, body);
			},
		);

		this.app.delete(
			"/api/v1/entities/:id",
			async ({ params }: { params: EntityParams }) => {
				await this.entityService.delete(params.id);
				return { success: true };
			},
		);

		// Group endpoints
		this.app.get("/api/v1/groups", async ({ query }: { query: GroupQuery }) => {
			const filters: GroupFilters = {
				name: query.name,
				limit: parseInt(query.limit || "100"),
				offset: parseInt(query.offset || "0"),
			};
			return await this.groupService.findAll(filters);
		});

		this.app.get(
			"/api/v1/groups/:id",
			async ({ params }: { params: GroupParams }) => {
				const group = await this.groupService.findById(params.id);
				if (!group) {
					throw new Error("Group not found");
				}
				return group;
			},
		);

		this.app.post(
			"/api/v1/groups",
			async ({ body }: { body: CreateGroupDto }) => {
				return await this.groupService.create(body);
			},
		);

		this.app.put(
			"/api/v1/groups/:id",
			async ({
				params,
				body,
			}: {
				params: GroupParams;
				body: UpdateGroupDto;
			}) => {
				return await this.groupService.update(params.id, body);
			},
		);

		this.app.delete(
			"/api/v1/groups/:id",
			async ({ params }: { params: GroupParams }) => {
				await this.groupService.delete(params.id);
				return { success: true };
			},
		);

		// Lane endpoints
		this.app.get("/api/v1/lanes", async ({ query }: { query: LaneQuery }) => {
			const filters: LaneFilters = {
				groupId: query.groupId,
				status: query.status,
				limit: parseInt(query.limit || "100"),
				offset: parseInt(query.offset || "0"),
			};
			return await this.laneService.findAll(filters);
		});

		this.app.get(
			"/api/v1/lanes/:id",
			async ({ params }: { params: LaneParams }) => {
				const lane = await this.laneService.findById(params.id);
				if (!lane) {
					throw new Error("Lane not found");
				}
				return lane;
			},
		);

		this.app.post(
			"/api/v1/lanes",
			async ({ body }: { body: CreateLaneDto }) => {
				return await this.laneService.create(body);
			},
		);

		this.app.put(
			"/api/v1/lanes/:id",
			async ({ params, body }: { params: LaneParams; body: UpdateLaneDto }) => {
				return await this.laneService.update(params.id, body);
			},
		);

		this.app.delete(
			"/api/v1/lanes/:id",
			async ({ params }: { params: LaneParams }) => {
				await this.laneService.delete(params.id);
				return { success: true };
			},
		);

		// Lane processing endpoint
		this.app.post(
			"/api/v1/lanes/:id/process",
			async ({ params }: { params: LaneParams }) => {
				return await this.laneService.processLane(params.id);
			},
		);

		// Background job endpoints
		this.app.post("/api/v1/jobs/cache", async ({ body }: { body: JobBody }) => {
			const job = await this.cacheQueue.add("refresh-cache", body);
			return { jobId: job.id, status: "queued" };
		});

		this.app.post("/api/v1/jobs/index", async ({ body }: { body: JobBody }) => {
			const job = await this.indexingQueue.add("index-lane", body);
			return { jobId: job.id, status: "queued" };
		});

		this.app.post(
			"/api/v1/jobs/cleanup",
			async ({ body }: { body: JobBody }) => {
				const job = await this.cleanupQueue.add("cleanup-resources", body);
				return { jobId: job.id, status: "queued" };
			},
		);

		// Error handling
		this.app.onError(
			({ error, set }: any) => {
				log.error({ error }, "API Error");

				if (error.message.includes("not found")) {
					set.status = 404;
					return { error: error.message, status: 404 };
				}

				if (error.message.includes("validation")) {
					set.status = 400;
					return { error: error.message, status: 400 };
				}

				set.status = 500;
				return { error: "Internal server error", status: 500 };
			},
		);
	}

	public getApp(): Elysia {
		return this.app;
	}
}
