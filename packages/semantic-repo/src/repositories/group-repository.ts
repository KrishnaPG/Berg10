import type { ISemanticGroup } from "../../../shared/types/semantic-group.types";
import type { FileSystemStorage } from "../storage/file-system";
import logger from "../utils/logger";
import { BaseRepository } from "./base-repository";

export class GroupRepository extends BaseRepository<ISemanticGroup> {
	protected readonly entityName = "group";

	constructor(storage: FileSystemStorage) {
		super(storage);
	}

	protected async persist(group: ISemanticGroup): Promise<void> {
		const path = `.semantic/groups/${group.name}/config.json`;
		await this.storage.writeJson(path, group);
	}

	protected async retrieve(name: string): Promise<ISemanticGroup | null> {
		const path = `.semantic/groups/${name}/config.json`;
		try {
			return await this.storage.readJson<ISemanticGroup>(path);
		} catch {
			return null;
		}
	}

	protected async retrieveAll(
		filters?: Record<string, unknown>,
	): Promise<ISemanticGroup[]> {
		const groups: ISemanticGroup[] = [];
		const files = await this.storage.listFiles(".semantic/groups");

		for (const file of files) {
			if (file.endsWith("/config.json")) {
				const group = await this.storage.readJson<ISemanticGroup>(
					`.semantic/groups/${file}`,
				);
				if (this.matchesFilters(group, filters)) {
					groups.push(group);
				}
			}
		}

		return groups;
	}

	protected async remove(name: string): Promise<boolean> {
		const path = `.semantic/groups/${name}/config.json`;
		try {
			await this.storage.deleteFile(path);
			return true;
		} catch {
			return false;
		}
	}

	private matchesFilters(
		group: ISemanticGroup,
		filters?: Record<string, unknown>,
	): boolean {
		if (!filters) return true;

		if (
			filters.name &&
			!group.name.toLowerCase().includes(String(filters.name).toLowerCase())
		) {
			return false;
		}

		return true;
	}
}
