/**
 * Ultra high-performance lane service layer
 * Business logic and orchestration layer
 */

import type { IEntityRepository } from "../repositories/entity-repository";
import type { ILaneRepository } from "../repositories/lane-repository";
import type {
	CreateLaneDto,
	ILane,
	LaneFilters,
	PaginatedResult,
	ProcessingResult,
	UpdateLaneDto,
} from "../types/core.types";
import logger from "../utils/logger";

const log = logger.child({ component: "LaneService" });

export interface ILaneService {
	create(dto: CreateLaneDto): Promise<ILane>;
	findById(id: string): Promise<ILane | null>;
	findAll(filters: LaneFilters): Promise<PaginatedResult<ILane>>;
	update(id: string, dto: UpdateLaneDto): Promise<ILane>;
	delete(id: string): Promise<boolean>;
	exists(id: string): Promise<boolean>;
	processLane(laneId: string): Promise<ProcessingResult>;
	validateLane(lane: ILane): boolean;
}

export class LaneService implements ILaneService {
	private laneRepository: ILaneRepository;
	private entityRepository: IEntityRepository;

	constructor(
		laneRepository: ILaneRepository,
		entityRepository: IEntityRepository,
	) {
		this.laneRepository = laneRepository;
		this.entityRepository = entityRepository;
	}

	async create(dto: CreateLaneDto): Promise<ILane> {
		const startTime = Date.now();

		try {
			const lane: ILane = {
				id: crypto.randomUUID(),
				name: dto.name,
				description: dto.description,
				groupId: dto.groupId,
				entities: [],
				processingConfig: {
					batchSize: dto.processingConfig?.batchSize || 100,
					concurrency: dto.processingConfig?.concurrency || 5,
					retryPolicy: {
						maxRetries: dto.processingConfig?.retryPolicy?.maxRetries || 3,
						backoffStrategy:
							dto.processingConfig?.retryPolicy?.backoffStrategy ||
							"exponential",
					},
					timeout: dto.processingConfig?.timeout || 30000,
				},
				metadata: dto.metadata || {},
				createdAt: new Date(),
				updatedAt: new Date(),
				status: "active" as any,
			};

			await this.laneRepository.save(lane);

			log.debug(
				{
					laneId: lane.id,
					duration: Date.now() - startTime,
				},
				"Lane created",
			);

			return lane;
		} catch (error) {
			log.error(
				{
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to create lane",
			);
			throw error;
		}
	}

	async findById(id: string): Promise<ILane | null> {
		return await this.laneRepository.findById(id);
	}

	async findAll(filters: LaneFilters): Promise<PaginatedResult<ILane>> {
		return await this.laneRepository.findWithFilters(filters);
	}

	async update(id: string, dto: UpdateLaneDto): Promise<ILane> {
		const startTime = Date.now();

		try {
			const existing = await this.laneRepository.findById(id);
			if (!existing) {
				throw new Error(`Lane not found: ${id}`);
			}

			const updated = {
				...existing,
				...dto,
				processingConfig: {
					...existing.processingConfig,
					...dto.processingConfig,
					retryPolicy: {
						...existing.processingConfig.retryPolicy,
						...dto.processingConfig?.retryPolicy,
					},
				},
				updatedAt: new Date(),
			};

			await this.laneRepository.save(updated);

			log.debug(
				{
					laneId: id,
					duration: Date.now() - startTime,
				},
				"Lane updated",
			);

			return updated;
		} catch (error) {
			log.error(
				{
					laneId: id,
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to update lane",
			);
			throw error;
		}
	}

	async delete(id: string): Promise<boolean> {
		return await this.laneRepository.delete(id);
	}

	async exists(id: string): Promise<boolean> {
		return await this.laneRepository.exists(id);
	}

	async processLane(laneId: string): Promise<ProcessingResult> {
		const startTime = Date.now();
		const errors: string[] = [];
		let processedCount = 0;

		try {
			const lane = await this.laneRepository.findById(laneId);
			if (!lane) {
				throw new Error(`Lane not found: ${laneId}`);
			}

			// Update lane status to processing
			lane.status = "processing" as any;
			lane.lastProcessedAt = new Date();
			await this.laneRepository.save(lane);

			// Process entities in the lane
			for (const entityId of lane.entities) {
				try {
					const entity = await this.entityRepository.findById(entityId);
					if (entity) {
						// Process the entity (placeholder for actual processing logic)
						// This would typically involve business logic specific to the lane
						processedCount++;
					} else {
						errors.push(`Entity not found: ${entityId}`);
					}
				} catch (error) {
					errors.push(
						`Failed to process entity ${entityId}: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}

			// Update lane status back to active
			lane.status = "active" as any;
			await this.laneRepository.save(lane);

			const result: ProcessingResult = {
				success: errors.length === 0,
				processedCount,
				errors,
				duration: Date.now() - startTime,
				timestamp: new Date(),
			};

			log.debug(
				{
					laneId,
					processedCount,
					errorsCount: errors.length,
					duration: result.duration,
				},
				"Lane processed",
			);

			return result;
		} catch (error) {
			// Ensure lane status is reset even on error
			try {
				const lane = await this.laneRepository.findById(laneId);
				if (lane) {
					lane.status = "error" as any;
					await this.laneRepository.save(lane);
				}
			} catch (resetError) {
				log.error(
					{
						laneId,
						error:
							resetError instanceof Error
								? resetError.message
								: String(resetError),
					},
					"Failed to reset lane status",
				);
			}

			log.error(
				{
					laneId,
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to process lane",
			);

			return {
				success: false,
				processedCount,
				errors: [error instanceof Error ? error.message : String(error)],
				duration: Date.now() - startTime,
				timestamp: new Date(),
			};
		}
	}

	validateLane(lane: ILane): boolean {
		if (!lane.name || lane.name.trim() === "") {
			return false;
		}

		if (!lane.groupId || lane.groupId.trim() === "") {
			return false;
		}

		if (
			!lane.processingConfig ||
			!lane.processingConfig.batchSize ||
			lane.processingConfig.batchSize <= 0
		) {
			return false;
		}

		if (
			!lane.processingConfig.concurrency ||
			lane.processingConfig.concurrency <= 0
		) {
			return false;
		}

		if (
			!lane.processingConfig.retryPolicy ||
			!lane.processingConfig.retryPolicy.maxRetries ||
			lane.processingConfig.retryPolicy.maxRetries < 0
		) {
			return false;
		}

		if (!lane.processingConfig.timeout || lane.processingConfig.timeout <= 0) {
			return false;
		}

		return true;
	}
}
