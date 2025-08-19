import { createHash, randomUUID } from "crypto";
import {
	closeSync,
	existsSync,
	fstatSync,
	ftruncateSync,
	openSync,
	readFileSync,
	readSync,
	renameSync,
	writeFileSync,
	writeSync,
} from "fs";
import { join } from "path";
import { Indexer } from "./indexer";
import type { JobLedger } from "./job-ledger";
import { SemanticGroup } from "./semantic-group";
import type { SemanticEntityType } from "./types";
import type { WorkQueue } from "./work-queue";

export class BackgroundWorker {
	private repoPath: string;
	private jobLedger: JobLedger;
	private workQueue: WorkQueue;
	private workerId: string;

	constructor(repoPath: string, jobLedger: JobLedger, workQueue: WorkQueue) {
		this.repoPath = repoPath;
		this.jobLedger = jobLedger;
		this.workQueue = workQueue;
		this.workerId = `worker-${randomUUID()}`;
	}

	async processSemanticEntities(
		group: SemanticGroup,
		commitSha: string,
	): Promise<void> {
		const jobId = createHash("sha256")
			.update(group.getSha256() + commitSha + Date.now().toString())
			.digest("hex");

		// Try to begin the job
		if (!this.jobLedger.beginJob(jobId, this.workerId)) {
			// Job already exists, check if it's completed
			const existingJob = this.jobLedger.getJob(jobId);
			if (existingJob && existingJob.status === "COMPLETED") {
				return; // Job already completed
			}

			// If it's stale, we'll take it over
			if (existingJob && existingJob.status === "RUNNING") {
				// For simplicity, we'll just fail the existing job and create a new one
				this.jobLedger.failJob(jobId, "Stale job detected");
				if (!this.jobLedger.beginJob(jobId, this.workerId)) {
					throw new Error(`Failed to acquire job ${jobId}`);
				}
			}
		}

		try {
			// Create cache directory if it doesn't exist
			group.createCacheDirectory();

			// Determine the output path
			const outputPath = group.getCachePath(commitSha);
			const tempPath = `${outputPath}.tmp.${randomUUID()}`;

			// Check if we have a partial file from a previous run
			let existingOffset = 0;
			if (existsSync(tempPath)) {
				// Get the file size
				const fd = openSync(tempPath, "r");
				try {
					const stats = fstatSync(fd);
					existingOffset = stats.size;
				} finally {
					closeSync(fd);
				}
			}

			// Open the temp file for appending
			const fd = openSync(tempPath, "a");

			try {
				// In a real implementation, this would query LakeFS for files matching the filter
				// For simulation, we'll generate some dummy entities
				const entities = await this.generateEntities(
					group,
					commitSha,
					existingOffset,
				);

				// Process each entity
				let processedCount = 0;
				for (const entity of entities) {
					// Write the entity to the temp file
					const line = JSON.stringify(entity) + "\n";
					writeSync(fd, line, { position: existingOffset });

					existingOffset += line.length;
					processedCount++;

					// Update progress every 100 entities
					if (processedCount % 100 === 0) {
						const progress =
							(existingOffset /
								(existingOffset + entities.length - processedCount)) *
							100;
						this.jobLedger.updateJobProgress(jobId, progress);
					}

					// Enqueue the entity for indexing in each lane
					for (const lane of group.getConfig().lanes) {
						this.workQueue.enqueue(
							entity.entity_id,
							entity.src_sha256,
							lane.sha256,
						);
					}
				}

				// Ensure all data is written to disk
				fdatasyncSync(fd);
			} finally {
				closeSync(fd);
			}

			// Atomically rename the temp file to the final location
			renameSync(tempPath, outputPath);

			// Mark the job as completed
			this.jobLedger.completeJob(jobId);
		} catch (error) {
			// Mark the job as failed
			this.jobLedger.failJob(
				jobId,
				error instanceof Error ? error.message : String(error),
			);
			throw error;
		}
	}

	async processIndexingJobs(): Promise<void> {
		// Release any stale leases
		this.workQueue.releaseStaleLeases();

		// Process up to 10 jobs at a time
		const jobsToProcess = 10;
		for (let i = 0; i < jobsToProcess; i++) {
			const job = this.workQueue.dequeue(this.workerId);

			if (!job) {
				break; // No more jobs in the queue
			}

			try {
				// Find the group for this lane
				const groupName = this.findGroupNameForLane(job.lane_sha256);
				if (!groupName) {
					throw new Error(`No group found for lane ${job.lane_sha256}`);
				}

				const group = new SemanticGroup(this.repoPath, groupName);
				const indexer = new Indexer(this.repoPath, group);

				// Load the entity
				const entity = this.loadEntity(group, job.entity_id);
				if (!entity) {
					throw new Error(`Entity ${job.entity_id} not found`);
				}

				// Process the entity
				await indexer.processEntity(entity, job.lane_sha256);

				// Mark the job as completed
				this.workQueue.complete(job.entity_id, job.lane_sha256);
			} catch (error) {
				// Log the error but don't rethrow, continue with other jobs
				console.error(
					`Error processing indexing job for entity ${job.entity_id}:`,
					error,
				);
			}
		}
	}

	private async generateEntities(
		group: SemanticGroup,
		commitSha: string,
		offset: number,
	): Promise<SemanticEntityType[]> {
		// In a real implementation, this would query LakeFS for files matching the filter
		// and apply the grouping rules to create semantic entities

		// For simulation, we'll generate some dummy entities
		const entities: SemanticEntityType[] = [];
		const count = 1000; // Generate 1000 entities

		// Skip entities we've already processed based on the offset
		const startIndex = Math.floor(offset / 200); // Approximate entity size

		for (let i = startIndex; i < count; i++) {
			const entity: SemanticEntityType = {
				entity_id: `entity-${group.getName()}-${i}`,
				src_sha256: createHash("sha256").update(`content-${i}`).digest("hex"),
				file_path: `path/to/file-${i}.pdf`,
				mime_type: "application/pdf",
				metadata: {
					author: "Test Author",
					created: new Date().toISOString(),
				},
				git_commit: commitSha,
			};

			entities.push(entity);
		}

		return entities;
	}

	private loadEntity(
		group: SemanticGroup,
		entityId: string,
	): SemanticEntityType | null {
		// In a real implementation, this would load the entity from the cache
		// For simulation, we'll return a dummy entity

		const parts = entityId.split("-");
		if (parts.length < 3) {
			return null;
		}

		const index = parseInt(parts[2]);
		if (isNaN(index)) {
			return null;
		}

		return {
			entity_id: entityId,
			src_sha256: createHash("sha256").update(`content-${index}`).digest("hex"),
			file_path: `path/to/file-${index}.pdf`,
			mime_type: "application/pdf",
			metadata: {
				author: "Test Author",
				created: new Date().toISOString(),
			},
			git_commit: "dummy-commit",
		};
	}

	private findGroupNameForLane(laneSha: string): string | null {
		// In a real implementation, this would look up the group that contains the lane
		// For simulation, we'll return a dummy group name

		// This is a simplified implementation - in a real system, we'd need to scan all group configs
		const groupsDir = join(this.repoPath, ".semantic", "groups");

		// For simulation, just return a dummy group name
		return "demo-group";
	}
}
