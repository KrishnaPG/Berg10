/**
 * Ultra high-performance entity service layer
 * Business logic and orchestration layer
 */

import type { IEntityRepository } from "../repositories/entity-repository";
import type {
	CreateEntityDto,
	EntityFilters,
	ISemanticEntity,
	PaginatedResult,
	UpdateEntityDto,
} from "../types/core.types";
import logger from "../utils/logger";

const log = logger.child({ component: "EntityService" });

export interface IEntityService {
	create(dto: CreateEntityDto): Promise<ISemanticEntity>;
	findById(id: string): Promise<ISemanticEntity | null>;
	findAll(filters: EntityFilters): Promise<PaginatedResult<ISemanticEntity>>;
	update(id: string, dto: UpdateEntityDto): Promise<ISemanticEntity>;
	delete(id: string): Promise<boolean>;
	exists(id: string): Promise<boolean>;
	validateEntity(entity: ISemanticEntity): Promise<boolean>;
}

export class EntityService implements IEntityService {
	private entityRepository: IEntityRepository;

	constructor(entityRepository: IEntityRepository) {
		this.entityRepository = entityRepository;
	}

	async create(dto: CreateEntityDto): Promise<ISemanticEntity> {
		const startTime = Date.now();

		try {
			const entity: ISemanticEntity = {
				id: crypto.randomUUID(),
				type: dto.type,
				name: dto.name,
				description: dto.description,
				metadata: dto.metadata || {},
				tags: dto.tags || [],
				createdAt: new Date(),
				updatedAt: new Date(),
				version: 1,
				checksum: "",
			};

			await this.entityRepository.save(entity);

			log.debug(
				{
					entityId: entity.id,
					duration: Date.now() - startTime,
				},
				"Entity created",
			);

			return entity;
		} catch (error) {
			log.error(
				{
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to create entity",
			);
			throw error;
		}
	}

	async findById(id: string): Promise<ISemanticEntity | null> {
		return await this.entityRepository.findById(id);
	}

	async findAll(
		filters: EntityFilters,
	): Promise<PaginatedResult<ISemanticEntity>> {
		return await this.entityRepository.findAll(filters);
	}

	async update(id: string, dto: UpdateEntityDto): Promise<ISemanticEntity> {
		const startTime = Date.now();

		try {
			const existing = await this.entityRepository.findById(id);
			if (!existing) {
				throw new Error(`Entity not found: ${id}`);
			}

			const updated = {
				...existing,
				...dto,
				updatedAt: new Date(),
				version: existing.version + 1,
			};

			await this.entityRepository.save(updated);

			log.debug(
				{
					entityId: id,
					duration: Date.now() - startTime,
				},
				"Entity updated",
			);

			return updated;
		} catch (error) {
			log.error(
				{
					entityId: id,
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to update entity",
			);
			throw error;
		}
	}

	async delete(id: string): Promise<boolean> {
		await this.entityRepository.delete(id);
		return true;
	}

	async exists(id: string): Promise<boolean> {
		return await this.entityRepository.exists(id);
	}

	async validateEntity(entity: ISemanticEntity): Promise<boolean> {
		// Basic validation - can be extended with more complex validation logic
		return !!(
			entity.id &&
			entity.type &&
			entity.name &&
			entity.metadata &&
			entity.tags &&
			entity.createdAt &&
			entity.updatedAt &&
			entity.version
		);
	}
}
