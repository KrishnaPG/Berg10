import { Level } from "level";
import type { AtomicTx } from "./atomic-tx";

export interface IManifestIdxRecord {
	segment: number;
	offset: number;
	blob_sha256: string;
}

/**
 * Fast look-up:  entity_id -> {segment, offset, blob_sha256}
 * 'segment' tells us which file (manifest.000123.jsonl)
 * 'offset'   is the byte offset inside that file
 */
export class ManifestIndex {
	private db: Level<string, IManifestIdxRecord>;

	constructor(laneDir: string) {
		this.db = new Level<string, IManifestIdxRecord>(laneDir, {
			valueEncoding: "json",
		});
	}

	async put(entityId: string, rec: IManifestIdxRecord) {
		await this.db.put(entityId, rec);
	}

	stagePut(tx: AtomicTx, entityId: string, rec: IManifestIdxRecord) {
		const staged = tx.stage(`idx-${entityId}`, JSON.stringify(rec));
		return staged;
	}

	async get(entityId: string): Promise<IManifestIdxRecord | null> {
		try {
			return await this.db.get(entityId);
		} catch {
			return null;
		}
	}

	async close() {
		await this.db.close();
	}
}
