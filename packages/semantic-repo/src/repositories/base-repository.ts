/**
 * Ultra high-performance base repository class
 * Provides common functionality for all repositories
 */

import type { FileSystemStorage } from "../storage/file-system";
import logger from "../utils/logger";

const log = logger.child({ component: "BaseRepository" });

export abstract class BaseRepository<T> {
	protected readonly storage: FileSystemStorage;
	protected abstract readonly entityName: string;

	constructor(storage: FileSystemStorage) {
		this.storage = storage;
	}

	protected async persist(entity: T): Promise<void> {
		throw new Error("persist method must be implemented by subclass");
	}

	protected async retrieve(id: string): Promise<T | null> {
		throw new Error("retrieve method must be implemented by subclass");
	}

	protected async retrieveAll(filters?: Record<string, unknown>): Promise<T[]> {
		throw new Error("retrieveAll method must be implemented by subclass");
	}

	protected async remove(id: string): Promise<boolean> {
		throw new Error("remove method must be implemented by subclass");
	}

	async save(entity: T & { id: string }): Promise<void> {
		const startTime = Date.now();
		try {
			await this.persist(entity);
			log.debug(
				{
					entity: this.entityName,
					entityId: (entity as any).id,
					duration: Date.now() - startTime,
				},
				"Entity saved",
			);
		} catch (error) {
			log.error(
				{
					entity: this.entityName,
					entityId: (entity as any).id,
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to save entity",
			);
			throw error;
		}
	}

	async findById(id: string): Promise<T | null> {
		const startTime = Date.now();
		try {
			const entity = await this.retrieve(id);
			log.debug(
				{
					entity: this.entityName,
					entityId: id,
					duration: Date.now() - startTime,
					found: !!entity,
				},
				"Entity retrieved",
			);
			return entity;
		} catch (error) {
			log.error(
				{
					entity: this.entityName,
					entityId: id,
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to find entity",
			);
			throw error;
		}
	}

	async findAll(filters?: Record<string, unknown>): Promise<T[]> {
		const startTime = Date.now();
		try {
			const entities = await this.retrieveAll(filters);
			log.debug(
				{
					entity: this.entityName,
					count: entities.length,
					duration: Date.now() - startTime,
				},
				"Entities retrieved",
			);
			return entities;
		} catch (error) {
			log.error(
				{
					entity: this.entityName,
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to find entities",
			);
			throw error;
		}
	}

	async update(id: string, entity: Partial<T>): Promise<void> {
		const startTime = Date.now();
		try {
			const existing = await this.findById(id);
			if (!existing) {
				throw new Error(`${this.entityName} not found: ${id}`);
			}

			const updated = {
				...existing,
				...entity,
			} as T & { id: string; updatedAt?: Date };

			// Add updatedAt timestamp if the entity supports it
			if ('updatedAt' in updated) {
				updated.updatedAt = new Date() as any;
			}

			await this.persist(updated);
			log.debug(
				{
					entity: this.entityName,
					entityId: id,
					duration: Date.now() - startTime,
				},
				"Entity updated",
			);
		} catch (error) {
			log.error(
				{
					entity: this.entityName,
					entityId: id,
					error: error instanceof Error ? error.message : String(error),
				},
				"Failed to update entity",
			);
			throw error;
		}
	}

	async delete(id: string): Promise<boolean> {
		const startTime = Date.now();
		try {
			const result = await this.remove(id);
			log.debug(
				{
					entity: this.entityName,
					entityId: id,
					duration: Date.now() - startTime,
					success: result,
				},
				"Entity deleted",
			);
			return result;
		} catch (error) {
			log.error(
				{
					entity: this.entityName,
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
			const entity = await this.findById(id);
			return !!entity;
		} catch {
			return false;
		}
	}
}