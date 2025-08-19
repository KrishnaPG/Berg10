import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from "fs";
import { join } from "path";
import { BackgroundWorker } from "./background-worker";
import { JobLedger } from "./job-ledger";
import { SemanticGroup } from "./semantic-group";
import {
	type JobEntryType,
	SemanticEntityType,
	type SemanticGroupConfigType,
} from "./types";
import { WorkQueue } from "./work-queue";

export class SemanticRepoManager {
	private repoPath: string;
	private jobLedger: JobLedger;
	private workQueue: WorkQueue;
	private backgroundWorker: BackgroundWorker;
	private running: boolean = false;
	private intervalId: NodeJS.Timeout | null = null;

	constructor(repoPath: string) {
		this.repoPath = repoPath;

		// Ensure the .semantic directory exists
		const semanticDir = join(repoPath, ".semantic");
		if (!existsSync(semanticDir)) {
			mkdirSync(semanticDir, { recursive: true });
		}

		// Initialize job ledger and work queue
		const dbPath = join(semanticDir, "semantic.db");
		this.jobLedger = new JobLedger(dbPath);
		this.workQueue = new WorkQueue(dbPath);

		// Initialize background worker
		this.backgroundWorker = new BackgroundWorker(
			repoPath,
			this.jobLedger,
			this.workQueue,
		);

		// Create version file if it doesn't exist
		const versionPath = join(semanticDir, "version");
		if (!existsSync(versionPath)) {
			writeFileSync(versionPath, "1");
		}
	}

	initialize(): void {
		// Create necessary directories
		const dirs = [
			join(this.repoPath, ".semantic", "groups"),
			join(this.repoPath, ".semantic", "index", "lanes"),
			join(this.repoPath, ".semantic", "index", "blobs"),
			join(this.repoPath, ".semantic", "cache"),
		];

		for (const dir of dirs) {
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
		}
	}

	startBackgroundProcessing(intervalMs: number = 30000): void {
		if (this.running) {
			return;
		}

		this.running = true;

		// Process any stale jobs first
		this.recoverStaleJobs();

		// Set up periodic processing
		this.intervalId = setInterval(async () => {
			try {
				await this.processPendingWork();
			} catch (error) {
				console.error("Error in background processing:", error);
			}
		}, intervalMs);

		// Set up file watchers for group configs
		this.setupGroupConfigWatchers();
	}

	stopBackgroundProcessing(): void {
		if (!this.running) {
			return;
		}

		this.running = false;

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	createGroup(name: string, config: SemanticGroupConfigType): void {
		const groupDir = join(this.repoPath, ".semantic", "groups", name);

		if (existsSync(groupDir)) {
			throw new Error(`Group ${name} already exists`);
		}

		// Create group directory
		mkdirSync(groupDir, { recursive: true });

		// Calculate SHA256 for the group
		const configForHash = {
			filter: config.filter,
			grouping: config.grouping,
		};
		config.sha256 = createHash("sha256")
			.update(JSON.stringify(configForHash))
			.digest("hex");

		// Write config file
		const configPath = join(groupDir, "config.json");
		writeFileSync(configPath, JSON.stringify(config, null, 2));

		// Create lock file
		const lockPath = join(groupDir, "lock.toml");
		writeFileSync(lockPath, "# This file pins model digests\n");
	}

	updateGroup(name: string, config: Partial<SemanticGroupConfigType>): void {
		const group = new SemanticGroup(this.repoPath, name);
		group.updateConfig(config);
	}

	deleteGroup(name: string): void {
		const groupDir = join(this.repoPath, ".semantic", "groups", name);

		if (!existsSync(groupDir)) {
			throw new Error(`Group ${name} does not exist`);
		}

		// In a real implementation, we would also clean up associated cache and index data
		// For now, we'll just remove the group directory

		// This is a simplified implementation - in a real system, we'd need to be more careful
		// about cleaning up resources

		// For now, just log a warning
		console.warn(
			`Group ${name} marked for deletion. Associated cache and index data should be cleaned up manually.`,
		);
	}

	getGroup(name: string): SemanticGroupConfigType | null {
		try {
			const group = new SemanticGroup(this.repoPath, name);
			return group.getConfig();
		} catch (error) {
			return null;
		}
	}

	listGroups(): string[] {
		const groupsDir = join(this.repoPath, ".semantic", "groups");

		if (!existsSync(groupsDir)) {
			return [];
		}

		// This is a simplified implementation - in a real system, we'd use a more robust method
		// to list directories

		// For now, return a dummy list
		return ["demo-group"];
	}

	triggerProcessing(groupName: string, commitSha: string): void {
		const group = new SemanticGroup(this.repoPath, groupName);
		this.backgroundWorker.processSemanticEntities(group, commitSha);
	}

	getJobStatus(jobId: string): JobEntryType | null {
		return this.jobLedger.getJob(jobId);
	}

	getQueueLength(laneSha?: string): number {
		return this.workQueue.getQueueLength(laneSha);
	}

	private async recoverStaleJobs(): Promise<void> {
		// Find stale jobs
		const staleJobs = this.jobLedger.getStaleJobs();

		for (const job of staleJobs) {
			// For simplicity, we'll just fail the stale jobs
			// In a real implementation, we might try to resume them
			this.jobLedger.failJob(job.job_id, "Stale job detected during recovery");
		}
	}

	private async processPendingWork(): Promise<void> {
		// Process indexing jobs
		await this.backgroundWorker.processIndexingJobs();
	}

	private setupGroupConfigWatchers(): void {
		const groupsDir = join(this.repoPath, ".semantic", "groups");

		if (!existsSync(groupsDir)) {
			return;
		}

		// Watch for changes to group config files
		// This is a simplified implementation - in a real system, we'd use a more robust method

		// For now, just log that we would set up watchers
		console.log(`Would set up watchers for group config files in ${groupsDir}`);
	}

	close(): void {
		this.stopBackgroundProcessing();
		this.jobLedger.close();
		this.workQueue.close();
	}
}
