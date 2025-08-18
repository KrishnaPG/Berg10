/**
 * Ultra high-performance cache worker for semantic-repo
 * Built with BullMQ for maximum performance
 */

import { type Job, Worker } from "bullmq";
import type { IEntityService } from "../services/entity-service";
import type { IGroupService } from "../services/group-service";
import type { ILaneService } from "../services/lane-service";
import logger from "../utils/logger";

const log = logger.child({ component: "CacheWorker" });

export interface CacheJobData {
	operation: "refresh" | "invalidate" | "warmup";
	target: "entity" | "group" | "lane" | "all";
	id?: string;
	tags?: string[];
}

export class CacheWorker {
	private worker: Worker;

	constructor(
		private entityService: IEntityService,
		private groupService: IGroupService,
		private laneService: ILaneService,
		redisConnection: any,
	) {
		this.worker = new Worker(
			"cache-queue",
			async (job: Job<CacheJobData>) => {
				return await this.processJob(job);
			},
			{
				connection: redisConnection,
				concurrency: 10,
				limiter: {
					max: 100,
					duration: 1000,
				},
			},
		);

		this.setupEventListeners();
	}

	private async processJob(job: Job<CacheJobData>): Promise<any> {
		const { operation, target, id, tags } = job.data;

		log.info("Processing cache job", {
			jobId: job.id,
			operation,
			target,
			id,
			tags,
		} as any);

		try {
			switch (operation) {
				case "refresh":
					return await this.refreshCache(target, id, tags);
				case "invalidate":
					return await this.invalidateCache(target, id, tags);
				case "warmup":
					return await this.warmupCache(target, id);
				default:
					throw new Error(`Unknown cache operation: ${operation}`);
			}
		} catch (error) {
			log.error("Cache job failed", { jobId: job.id, error } as any);
			throw error;
		}
	}

	private async refreshCache(
		target: string,
		id?: string,
		tags?: string[],
	): Promise<any> {
		const startTime = Date.now();

		switch (target) {
			case "entity":
				if (id) {
					const entity = await this.entityService.findById(id);
					log.info("Refreshed entity cache", {
						entityId: id,
						duration: Date.now() - startTime,
					});
					return { success: true, entity };
				} else if (tags) {
					const entities = await this.entityService.findAll({
						tags,
						limit: 1000,
					});
					log.info("Refreshed entities cache by tags", {
						tags,
						count: entities.data.length,
						duration: Date.now() - startTime,
					});
					return { success: true, count: entities.data.length };
				} else {
					const entities = await this.entityService.findAll({ limit: 1000 });
					log.info("Refreshed all entities cache", {
						count: entities.data.length,
						duration: Date.now() - startTime,
					});
					return { success: true, count: entities.data.length };
				}

			case "group":
				if (id) {
					const group = await this.groupService.findById(id);
					log.info("Refreshed group cache", {
						groupId: id,
						duration: Date.now() - startTime,
					});
					return { success: true, group };
				} else {
					const groups = await this.groupService.findAll({ limit: 1000 });
					log.info("Refreshed all groups cache", {
						count: groups.data.length,
						duration: Date.now() - startTime,
					});
					return { success: true, count: groups.data.length };
				}

			case "lane":
				if (id) {
					const lane = await this.laneService.findById(id);
					log.info("Refreshed lane cache", {
						laneId: id,
						duration: Date.now() - startTime,
					});
					return { success: true, lane };
				} else {
					const lanes = await this.laneService.findAll({ limit: 1000 });
					log.info("Refreshed all lanes cache", {
						count: lanes.data.length,
						duration: Date.now() - startTime,
					});
					return { success: true, count: lanes.data.length };
				}

			case "all": {
				const [entities, groups, lanes] = await Promise.all([
					this.entityService.findAll({ limit: 1000 }),
					this.groupService.findAll({ limit: 1000 }),
					this.laneService.findAll({ limit: 1000 }),
				]);
				log.info("Refreshed all caches", {
					entityCount: entities.data.length,
					groupCount: groups.data.length,
					laneCount: lanes.data.length,
					duration: Date.now() - startTime,
				} as any);
				return {
					success: true,
					entityCount: entities.data.length,
					groupCount: groups.data.length,
					laneCount: lanes.data.length,
				};
			}

			default:
				throw new Error(`Unknown cache target: ${target}`);
		}
	}

	private async invalidateCache(
		target: string,
		id?: string,
		tags?: string[],
	): Promise<any> {
		// Implementation would depend on the caching solution used
		// This is a placeholder for cache invalidation logic
		log.info("Invalidated cache", { target, id, tags } as any);
		return { success: true };
	}

	private async warmupCache(target: string, id?: string): Promise<any> {
		// Implementation would depend on the caching solution used
		// This is a placeholder for cache warmup logic
		log.info("Warmed up cache", { target, id } as any);
		return { success: true };
	}

	private setupEventListeners(): void {
		this.worker.on("completed", (job) => {
			log.info("Cache job completed", { jobId: job.id } as any);
		});

		this.worker.on("failed", (job, err) => {
			log.error("Cache job failed", { jobId: job?.id, error: err } as any);
		});

		this.worker.on("error", (err) => {
			log.error("Cache worker error", { error: err } as any);
		});
	}

	public async close(): Promise<void> {
		await this.worker.close();
		log.info("Cache worker closed");
	}
}
