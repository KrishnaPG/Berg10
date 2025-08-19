import { createHash } from "crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "fs";
import { join } from "path";
import {
	FilterOperandType,
	GroupingConfigType,
	LaneConfigType,
	SemanticEntityType,
	type SemanticGroupConfigType,
} from "./types";

export class SemanticGroup {
	private config: SemanticGroupConfigType;
	private configPath: string;
	private repoPath: string;

	constructor(repoPath: string, groupName: string) {
		this.repoPath = repoPath;
		this.configPath = join(
			repoPath,
			".semantic",
			"groups",
			groupName,
			"config.json",
		);

		if (!existsSync(this.configPath)) {
			throw new Error(`Group config not found: ${this.configPath}`);
		}

		const configContent = readFileSync(this.configPath, "utf-8");
		this.config = JSON.parse(configContent) as SemanticGroupConfigType;
	}

	getConfig(): SemanticGroupConfigType {
		return this.config;
	}

	getName(): string {
		return this.config.name;
	}

	getSha256(): string {
		return this.config.sha256;
	}

	updateConfig(newConfig: Partial<SemanticGroupConfigType>): void {
		// Merge the new config with the existing one
		this.config = { ...this.config, ...newConfig };

		// Recalculate the SHA256 if filter or grouping changed
		if (newConfig.filter || newConfig.grouping) {
			const configForHash = {
				filter: this.config.filter,
				grouping: this.config.grouping,
			};
			this.config.sha256 = createHash("sha256")
				.update(JSON.stringify(configForHash))
				.digest("hex");
		}

		// Write the updated config to a temporary file first
		const tempPath = `${this.configPath}.tmp.${Date.now()}`;
		writeFileSync(tempPath, JSON.stringify(this.config, null, 2));

		// Atomic rename operation
		renameSync(tempPath, this.configPath);
	}

	getCachePath(commitSha: string): string {
		const groupSha = this.getSha256();
		return join(
			this.repoPath,
			".semantic",
			"cache",
			groupSha,
			`${commitSha}.entities.jsonl`,
		);
	}

	getLaneManifestPath(laneSha: string): string {
		return join(
			this.repoPath,
			".semantic",
			"index",
			"lanes",
			laneSha,
			"manifest.jsonl",
		);
	}

	getBlobPath(blobSha: string): string {
		return join(this.repoPath, ".semantic", "index", "blobs", blobSha);
	}

	createCacheDirectory(): void {
		const groupSha = this.getSha256();
		const cacheDir = join(this.repoPath, ".semantic", "cache", groupSha);

		if (!existsSync(cacheDir)) {
			mkdirSync(cacheDir, { recursive: true });
		}
	}

	createLaneDirectory(laneSha: string): void {
		const laneDir = join(this.repoPath, ".semantic", "index", "lanes", laneSha);

		if (!existsSync(laneDir)) {
			mkdirSync(laneDir, { recursive: true });
		}
	}

	createBlobDirectory(): void {
		const blobDir = join(this.repoPath, ".semantic", "index", "blobs");

		if (!existsSync(blobDir)) {
			mkdirSync(blobDir, { recursive: true });
		}
	}
}
