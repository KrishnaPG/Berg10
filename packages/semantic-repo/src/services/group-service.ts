import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import type {
	IGrouping,
	ILane,
	IMetadata,
	ISemanticGroup,
	IVersionPolicy,
	TFilter,
} from "../../../shared/types/semantic-group.types.js";
import type { GroupRepository } from "../repositories/group-repository.js";
import type { PaginatedResult } from "../types/core.types.js";
import { SemanticRepoError } from "../utils/errors.js";
import { createChildLogger } from "../utils/logger.js";

// DTO types for group operations
export interface CreateGroupDto {
	name: string;
	description: string;
	filter: TFilter;
	versionPolicy: IVersionPolicy;
	grouping: IGrouping;
	lanes: ILane[];
	metadata: IMetadata;
}

export interface UpdateGroupDto {
	name?: string;
	description?: string;
	filter?: TFilter;
	versionPolicy?: IVersionPolicy;
	grouping?: IGrouping;
	lanes?: ILane[];
	metadata?: IMetadata;
}

export interface GroupFilters {
	name?: string;
	createdAfter?: Date;
	createdBefore?: Date;
	limit?: number;
	offset?: number;
}

const logger = createChildLogger("group-service");

export interface IGroupService {
	create(group: CreateGroupDto): Promise<ISemanticGroup>;
	findById(id: string): Promise<ISemanticGroup | null>;
	findAll(filters: GroupFilters): Promise<PaginatedResult<ISemanticGroup>>;
	update(id: string, update: UpdateGroupDto): Promise<ISemanticGroup>;
	delete(id: string): Promise<boolean>;
	addLane(groupId: string, laneId: string): Promise<ISemanticGroup>;
	removeLane(groupId: string, laneId: string): Promise<ISemanticGroup>;
}

export class GroupService implements IGroupService {
	constructor(private repository: GroupRepository) {}

	async create(group: CreateGroupDto): Promise<ISemanticGroup> {
		try {
			const sha256 = crypto
				.createHash("sha256")
				.update(JSON.stringify(group))
				.digest("hex");

			const newGroup: ISemanticGroup = {
				...group,
			};

			await this.repository.save(newGroup);
			logger.info("Group created", { sha256, name: newGroup.name });

			return newGroup;
		} catch (error) {
			logger.error("Failed to create group", { error, group });
			throw new SemanticRepoError(
				"CREATE_FAILED",
				"Failed to create group",
				500,
				{ group },
			);
		}
	}

	async findById(name: string): Promise<ISemanticGroup | null> {
		try {
			const group = await this.repository.findById(name);
			if (!group) {
				logger.debug("Group not found");
				return null;
			}

			return group;
		} catch (error) {
			logger.error("Failed to find group by ID", { error, name });
			throw new SemanticRepoError("FIND_FAILED", "Failed to find group", 500, {
				name,
			});
		}
	}

	async findAll(
		filters: GroupFilters = {},
	): Promise<PaginatedResult<ISemanticGroup>> {
		try {
			const groups = await this.repository.findAll(filters);

			const paginated: PaginatedResult<ISemanticGroup> = {
				data: groups,
				total: groups.length,
				page: 1,
				limit: filters.limit || 100,
				hasNext: false,
				hasPrev: false,
			};

			return paginated;
		} catch (error) {
			logger.error("Failed to find groups", { error, filters });
			throw new SemanticRepoError(
				"FIND_ALL_FAILED",
				"Failed to find groups",
				500,
				{ filters },
			);
		}
	}

	async update(name: string, update: UpdateGroupDto): Promise<ISemanticGroup> {
		try {
			const existing = await this.repository.findById(name);
			if (!existing) {
				throw new SemanticRepoError("NOT_FOUND", "Group not found", 404, {
					name,
				});
			}

			const updated: ISemanticGroup = {
				...existing,
				...update,
			};

			await this.repository.update(name, updated);
			logger.info("Group updated");

			return updated;
		} catch (error) {
			logger.error("Failed to update group");
			throw new SemanticRepoError(
				"UPDATE_FAILED",
				"Failed to update group",
				500,
				{ name, update },
			);
		}
	}

	async delete(name: string): Promise<boolean> {
		try {
			const result = await this.repository.delete(name);
			logger.info("Group deleted");
			return result;
		} catch (error) {
			logger.error("Failed to delete group");
			throw new SemanticRepoError(
				"DELETE_FAILED",
				"Failed to delete group",
				500,
				{ name },
			);
		}
	}

	async addLane(groupName: string, lane: ILane): Promise<ISemanticGroup> {
		try {
			const group = await this.repository.findById(groupName);
			if (!group) {
				throw new SemanticRepoError("NOT_FOUND", "Group not found", 404, {
					groupName,
				});
			}

			if (!group.lanes.find(l => l.id === lane.id)) {
				group.lanes.push(lane);
				await this.repository.update(groupName, group);
			}

			return group;
		} catch (error) {
			logger.error("Failed to add lane to group", { error, groupId, laneId });
			throw new SemanticRepoError(
				"ADD_LANE_FAILED",
				"Failed to add lane to group",
				500,
				{ groupName, lane },
			);
		}
	}

	async removeLane(groupName: string, laneId: string): Promise<ISemanticGroup> {
		try {
			const group = await this.repository.findById(groupName);
			if (!group) {
				throw new SemanticRepoError("NOT_FOUND", "Group not found", 404, {
					groupName,
				});
			}

			group.lanes = group.lanes.filter((lane) => lane.id !== laneId);
			await this.repository.update(groupName, group);

			return group;
		} catch (error) {
			logger.error("Failed to remove lane from group");
			throw new SemanticRepoError(
				"REMOVE_LANE_FAILED",
				"Failed to remove lane from group",
				500,
				{ groupName, laneId },
			);
		}
	}
}
