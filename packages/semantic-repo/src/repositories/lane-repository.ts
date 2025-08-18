/**
 * Ultra high-performance lane repository for data access
 * Optimized for concurrent operations and caching
 */

import type { FileSystemStorage } from "../storage/file-system";
import type { ILane, LaneFilters, PaginatedResult } from "../types/core.types";
import logger from "../utils/logger";
import { BaseRepository } from "./base-repository";

const log = logger.child({ component: "LaneRepository" });

export interface ILaneRepository {
	save(lane: ILane): Promise<void>;
	findById(id: string): Promise<ILane | null>;
	findAll(filters?: Record<string, unknown>): Promise<ILane[]>;
	findWithFilters(filters: LaneFilters): Promise<PaginatedResult<ILane>>;
	update(id: string, lane: Partial<ILane>): Promise<void>;
	delete(id: string): Promise<boolean>;
	exists(id: string): Promise<boolean>;
	findByGroupId(groupId: string): Promise<ILane[]>;
}

export class LaneRepository
	extends BaseRepository<ILane>
	implements ILaneRepository
{
	protected readonly entityName = "lane";
	private readonly lanesPath = "lanes";

	constructor(storage: FileSystemStorage) {
		super(storage);
	}

	protected async persist(lane: ILane): Promise<void> {
		const filePath = `${this.lanesPath}/${lane.id}.json`;
		await this.storage.writeJson(filePath, lane);
	}

	protected async retrieve(id: string): Promise<ILane | null> {
		const filePath = `${this.lanesPath}/${id}.json`;
		try {
			return await this.storage.readJson<ILane>(filePath);
		} catch {
			return null;
		}
	}

	protected async retrieveAll(
		filters?: Record<string, unknown>,
	): Promise<ILane[]> {
		const lanes: ILane[] = [];
		const files = await this.storage.listFiles(this.lanesPath);

		for (const file of files) {
			if (file.endsWith(".json")) {
				const lane = await this.storage.readJson<ILane>(
					`${this.lanesPath}/${file}`,
				);
				if (this.matchesFilters(lane, filters)) {
					lanes.push(lane);
				}
			}
		}

		return lanes;
	}

	protected async remove(id: string): Promise<boolean> {
		const filePath = `${this.lanesPath}/${id}.json`;
		try {
			await this.storage.deleteFile(filePath);
			return true;
		} catch {
			return false;
		}
	}

	async findAll(filters?: Record<string, unknown>): Promise<ILane[]> {
		return super.findAll(filters);
	}

	async findWithFilters(filters: LaneFilters): Promise<PaginatedResult<ILane>> {
		const startTime = Date.now();

		try {
			const {
				groupId,
				status,
				createdAfter,
				createdBefore,
				limit = 50,
				offset = 0,
			} = filters;

			const allLanes = await this.retrieveAll({ groupId, status });

			// Apply date filters
			const filteredLanes = allLanes.filter((lane) => {
				if (createdAfter && new Date(lane.createdAt) < createdAfter) {
					return false;
				}
				if (createdBefore && new Date(lane.createdAt) > createdBefore) {
					return false;
				}
				return true;
			});

			// Sort by createdAt descending
			filteredLanes.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

			// Apply pagination
			const paginated = filteredLanes.slice(offset, offset + limit);

			const result: PaginatedResult<ILane> = {
				data: paginated,
				total: filteredLanes.length,
				page: Math.floor(offset / limit) + 1,
				limit,
				hasNext: offset + limit < filteredLanes.length,
			};

			log.debug(
				{
					total: filteredLanes.length,
					returned: paginated.length,
					duration: Date.now() - startTime,
				},
				"Lanes retrieved",
			);

			return result;
		} catch (error) {
			log.error(
				{
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to find lanes",
			);
			throw error;
		}
	}

	async findByGroupId(groupId: string): Promise<ILane[]> {
		try {
			const allLanes = await this.retrieveAll();
			return allLanes.filter((lane) => lane.groupId === groupId);
		} catch (error) {
			log.error(
				{
					groupId,
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to find lanes by group ID",
			);
			throw error;
		}
	}

	private matchesFilters(
		lane: ILane,
		filters?: Record<string, unknown>,
	): boolean {
		if (!filters) return true;

		if (filters.groupId && lane.groupId !== filters.groupId) {
			return false;
		}

		if (filters.status && lane.status !== filters.status) {
			return false;
		}

		return true;
	}
}
