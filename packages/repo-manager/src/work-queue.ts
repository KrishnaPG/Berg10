import { Database } from "bun:sqlite";
import { join } from "path";
import type { QueueEntryType } from "./types";

export class WorkQueue {
	private db: Database;

	constructor(dbPath: string) {
		this.db = new Database(dbPath);
		this.initializeDb();
	}

	private initializeDb() {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS work_queue (
        entity_id TEXT NOT NULL,
        src_sha256 TEXT NOT NULL,
        lane_sha256 TEXT NOT NULL,
        enqueue_ts TEXT NOT NULL,
        retries INTEGER NOT NULL DEFAULT 0,
        lease_expires TEXT,
        worker_id TEXT,
        PRIMARY KEY (entity_id, lane_sha256)
      );
      
      CREATE INDEX IF NOT EXISTS idx_queue_lease ON work_queue(lease_expires);
      CREATE INDEX IF NOT EXISTS idx_queue_lane ON work_queue(lane_sha256);
    `);
	}

	enqueue(entityId: string, srcSha256: string, laneSha256: string): void {
		const now = new Date().toISOString();

		const query = this.db.prepare(`
      INSERT OR REPLACE INTO work_queue 
      (entity_id, src_sha256, lane_sha256, enqueue_ts, retries, lease_expires, worker_id)
      VALUES (?, ?, ?, ?, 0, NULL, NULL)
    `);

		query.run(entityId, srcSha256, laneSha256, now);
	}

	dequeue(
		workerId: string,
		leaseDurationSeconds: number = 300,
	): QueueEntryType | null {
		const leaseExpires = new Date(
			Date.now() + leaseDurationSeconds * 1000,
		).toISOString();

		// Try to acquire a lease on an available item
		const query = this.db.prepare(`
      UPDATE work_queue 
      SET lease_expires = ?, worker_id = ?
      WHERE rowid IN (
        SELECT rowid FROM work_queue 
        WHERE lease_expires IS NULL OR lease_expires < ?
        ORDER BY enqueue_ts ASC
        LIMIT 1
      )
      RETURNING entity_id, src_sha256, lane_sha256, enqueue_ts, retries, lease_expires, worker_id
    `);

		const now = new Date().toISOString();
		const result = query.get(leaseExpires, workerId, now) as
			| QueueEntryType
			| undefined;

		return result || null;
	}

	complete(entityId: string, laneSha256: string): void {
		const query = this.db.prepare(`
      DELETE FROM work_queue WHERE entity_id = ? AND lane_sha256 = ?
    `);

		query.run(entityId, laneSha256);
	}

	releaseStaleLeases(thresholdSeconds: number = 300): number {
		const threshold = new Date(
			Date.now() - thresholdSeconds * 1000,
		).toISOString();

		const query = this.db.prepare(`
      UPDATE work_queue 
      SET lease_expires = NULL, worker_id = NULL, retries = retries + 1
      WHERE lease_expires IS NOT NULL AND lease_expires < ?
    `);

		const result = query.run(threshold);
		return result.changes;
	}

	getQueueLength(laneSha256?: string): number {
		let query = "SELECT COUNT(*) as count FROM work_queue";
		const params: any[] = [];

		if (laneSha256) {
			query += " WHERE lane_sha256 = ?";
			params.push(laneSha256);
		}

		const result = this.db.prepare(query).get(...params) as { count: number };
		return result.count;
	}

	getQueueEntries(laneSha256?: string): QueueEntryType[] {
		let query =
			"SELECT entity_id, src_sha256, lane_sha256, enqueue_ts, retries, lease_expires, worker_id FROM work_queue";
		const params: any[] = [];

		if (laneSha256) {
			query += " WHERE lane_sha256 = ?";
			params.push(laneSha256);
		}

		query += " ORDER BY enqueue_ts ASC";

		return this.db.prepare(query).all(...params) as QueueEntryType[];
	}

	close(): void {
		this.db.close();
	}
}
