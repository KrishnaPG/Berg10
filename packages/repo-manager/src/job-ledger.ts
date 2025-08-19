import { Database } from "bun:sqlite";
import { join } from "path";
import { type TJobEntry, TJobStatus } from "./types";

export class JobLedger {
	private db: Database;

	constructor(dbPath: string) {
		this.db = new Database(dbPath);
		this.initializeDb();
	}

	private initializeDb() {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        job_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        worker_id TEXT,
        heartbeat_ts TEXT,
        progress REAL,
        error_message TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_worker ON jobs(worker_id);
    `);
	}

	beginJob(jobId: string, workerId: string): boolean {
		const now = new Date().toISOString();

		try {
			const query = this.db.prepare(`
        INSERT INTO jobs (job_id, status, created_at, worker_id, heartbeat_ts, progress)
        VALUES (?, ?, ?, ?, ?, 0)
      `);

			query.run(jobId, "RUNNING", now, workerId, now);
			return true;
		} catch (error) {
			// Job might already exist
			return false;
		}
	}

	updateJobProgress(jobId: string, progress: number): void {
		const now = new Date().toISOString();

		const query = this.db.prepare(`
      UPDATE jobs SET progress = ?, heartbeat_ts = ? WHERE job_id = ?
    `);

		query.run(progress, now, jobId);
	}

	completeJob(jobId: string): void {
		const now = new Date().toISOString();

		const query = this.db.prepare(`
      UPDATE jobs SET status = ?, heartbeat_ts = ? WHERE job_id = ?
    `);

		query.run("COMPLETED", now, jobId);
	}

	failJob(jobId: string, errorMessage: string): void {
		const now = new Date().toISOString();

		const query = this.db.prepare(`
      UPDATE jobs SET status = ?, error_message = ?, heartbeat_ts = ? WHERE job_id = ?
    `);

		query.run("FAILED", errorMessage, now, jobId);
	}

	getJob(jobId: string): TJobEntry | null {
		const query = this.db.prepare(`
      SELECT job_id, status, created_at, worker_id, heartbeat_ts, progress, error_message
      FROM jobs WHERE job_id = ?
    `);

		const result = query.get(jobId) as TJobEntry | undefined;
		return result || null;
	}

	getStaleJobs(thresholdSeconds: number = 300): TJobEntry[] {
		const threshold = new Date(
			Date.now() - thresholdSeconds * 1000,
		).toISOString();

		const query = this.db.prepare(`
      SELECT job_id, status, created_at, worker_id, heartbeat_ts, progress, error_message
      FROM jobs 
      WHERE status = 'RUNNING' AND (heartbeat_ts IS NULL OR heartbeat_ts < ?)
    `);

		return query.all(threshold) as TJobEntry[];
	}

	close(): void {
		this.db.close();
	}
}
