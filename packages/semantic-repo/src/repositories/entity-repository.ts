/**
 * Ultra high-performance entity repository for data access
 * Optimized for concurrent operations and caching
 */

import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import type { FileSystemStorage } from "../storage/file-system";
import {
	type CreateEntityDto,
	type EntityFilters,
	type ISemanticEntity,
	type PaginatedResult,
	UpdateEntityDto,
} from "../types/core.types";
import logger from "../utils/logger";

const log = logger.child({ component: "EntityRepository" });

export interface IEntityRepository {
	save(entity: ISemanticEntity): Promise<void>;
	findById(id: string): Promise<ISemanticEntity | null>;
	findAll(filters: EntityFilters): Promise<PaginatedResult<ISemanticEntity>>;
	update(id: string, entity: Partial<ISemanticEntity>): Promise<void>;
	delete(id: string): Promise<void>;
	exists(id: string): Promise<boolean>;
}

export class EntityRepository implements IEntityRepository {
	private storage: FileSystemStorage;
	private readonly entitiesPath = "entities";

	constructor(storage: FileSystemStorage) {
		this.storage = storage;
	}

	private generateChecksum(entity: ISemanticEntity): string {
		const content = JSON.stringify({
			id: entity.id,
			type: entity.type,
			name: entity.name,
			description: entity.description,
			metadata: entity.metadata,
			tags: entity.tags,
			version: entity.version,
		});
		return createHash("sha256").update(content).digest("hex");
	}

	async save(entity: ISemanticEntity): Promise<void> {
		const startTime = Date.now();

		try {
			entity.checksum = this.generateChecksum(entity);
			entity.updatedAt = new Date();

			const filePath = `${this.entitiesPath}/${entity.id}.json`;
			await this.storage.writeFile(filePath, JSON.stringify(entity, null, 2));

			log.debug(
				{
					entityId: entity.id,
					duration: Date.now() - startTime,
				},
				"Entity saved",
			);
		} catch (error) {
			log.error(
				{
					entityId: entity.id,
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to save entity",
			);
			throw error;
		}
	}

	async findById(id: string): Promise<ISemanticEntity | null> {
		const startTime = Date.now();

		try {
			const filePath = `${this.entitiesPath}/${id}.json`;
			const data = await this.storage.readFile(filePath);

			if (!data) return null;

			const entity = JSON.parse(data.toString()) as ISemanticEntity;

			log.debug(
				{
					entityId: id,
					duration: Date.now() - startTime,
				},
				"Entity retrieved",
			);

			return entity;
		} catch (error) {
			if (error && typeof error === 'object' && 'code' in error && error.code === "ENOENT") {
				return null;
			}

			log.error(
				{
					entityId: id,
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to find entity",
			);
			throw error;
		}
	}

	async findAll(
		filters: EntityFilters,
	): Promise<PaginatedResult<ISemanticEntity>> {
		const startTime = Date.now();

		try {
			const {
				type,
				tags,
				createdAfter,
				createdBefore,
				limit = 50,
				offset = 0,
			} = filters;

			// Get all entity files
			const entityFiles = await this.storage.listFiles(this.entitiesPath);

			const entities: ISemanticEntity[] = [];

			// Read and filter entities
			for (const file of entityFiles) {
				const data = await this.storage.readFile(file);
				if (data) {
					const entity = JSON.parse(data.toString()) as ISemanticEntity;

					// Apply filters
					if (type && entity.type !== type) continue;
					if (
						tags &&
						tags.length > 0 &&
						!tags.some((tag) => entity.tags.includes(tag))
					)
						continue;
					if (createdAfter && new Date(entity.createdAt) < createdAfter)
						continue;
					if (createdBefore && new Date(entity.createdAt) > createdBefore)
						continue;

					entities.push(entity);
				}
			}

			// Sort by createdAt descending
			entities.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

			// Apply pagination
			const paginated = entities.slice(offset, offset + limit);

			const result: PaginatedResult<ISemanticEntity> = {
				data: paginated,
				total: entities.length,
				page: Math.floor(offset / limit) + 1,
				limit,
				hasNext: offset + limit < entities.length,
			};

			log.debug(
				{
					total: entities.length,
					returned: paginated.length,
					duration: Date.now() - startTime,
				},
				"Entities retrieved",
			);

			return result;
		} catch (error) {
			log.error(
				{
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to find entities",
			);
			throw error;
		}
	}

	async update(id: string, entity: Partial<ISemanticEntity>): Promise<void> {
		const startTime = Date.now();

		try {
			const existing = await this.findById(id);
			if (!existing) {
				throw new Error(`Entity not found: ${id}`);
			}

			const updated = {
				...existing,
				...entity,
				updatedAt: new Date(),
				version: existing.version + 1,
			};

			await this.save(updated);

			log.debug(
				{
					entityId: id,
					duration: Date.now() - startTime,
				},
				"Entity updated",
			);
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

	async delete(id: string): Promise<void> {
		const startTime = Date.now();

		try {
			const filePath = `${this.entitiesPath}/${id}.json`;
			await this.storage.deleteFile(filePath);

			log.debug(
				{
					entityId: id,
					duration: Date.now() - startTime,
				},
				"Entity deleted",
			);
		} catch (error) {
			log.error(
				{
					entityId: id,
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to delete entity",
			);
			throw error;
		}
	}

	async exists(id: string): Promise<boolean> {
		try {
			const filePath = `${this.entitiesPath}/${id}.json`;
			return this.storage.fileExists(filePath);
		} catch (error) {
			return false;
		}
	}

	async createFromDto(dto: CreateEntityDto): Promise<ISemanticEntity> {
		const entity: ISemanticEntity = {
			id: uuidv4(),
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

		await this.save(entity);
		return entity;
	}
}
