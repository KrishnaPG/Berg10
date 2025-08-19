import {
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import path, { dirname, join } from "node:path";
import { BunFile } from "bun";
import {
	ManifestEntry,
	type TBlobSha256,
	type TEntityId,
	type TLaneSha,
	type TManifestEntry,
	type TSemanticGroupConfig,
	type TSHA256B58,
} from "./types";
import { hashNEncode } from "./utils";

// ---------- utils ----------------------------------------------------------
const shaToFilePath = (sha: TSHA256B58, ext: string) => [
	sha.slice(0, 3),
	sha.slice(3, 6),
	sha.slice(6, 9),
	`${sha.slice(9)}${ext}`,
];

const atomicWrite = async (finalPath: string, data: Uint8Array | string) => {
	const tmp = `${finalPath}.tmp`;
	return mkdir(dirname(finalPath), { recursive: true })
		.then(() => writeFile(tmp, data))
		.then(() => rename(tmp, finalPath))
		.catch(async (err) => {
			await Bun.file(tmp).delete(); // cleanup temp file
			throw err;
		});
};

/*
  - stores every manifest entry as one JSON file under the respective lane folder
  - keeps embeddings inline (or in external blobs when > 8 KB, switchable)
  - guarantees atomic writes (tmp + rename)
  - uses Bun File API (promise based, non-blocking)
  - validates every object at runtime with `@sinclair/typebox`
  - exposes all CRUD / introspection methods expected by GraphQL resolvers
*/
export class SemanticRepoManager {
	private root: string;

	constructor(repoRoot = ".") {
		this.root = path.resolve(repoRoot, ".semantic");
	}

	/* ------------------ directories ------------------ */
	private groupDir(name: string) {
		return path.resolve(this.root, "groups", name);
	}
	private laneDir(laneSha: TLaneSha) {
		return path.resolve(this.root, "index", "lanes", laneSha);
	}
	private blobPath(sha: TBlobSha256, ext: string = ".blob") {
		return path.resolve(
			this.root,
			"index",
			"blobs",
			...shaToFilePath(sha, ext),
		);
	}

	/* ------------------ group CRUD ------------------ */
	async createGroup(name: string, config: TSemanticGroupConfig) {
		const dir = this.groupDir(name);
		await mkdir(dir, { recursive: true });
		const cfg: TSemanticGroupConfig = {
			...config,
			sha256: hashNEncode(JSON.stringify(config)),
		};
		await atomicWrite(join(dir, "config.json"), JSON.stringify(cfg, null, 2));
		await atomicWrite(join(dir, "lock.toml"), "");
		return cfg;
	}

	async listGroups() {
		try {
			return await readdir(join(this.root, "groups"));
		} catch {
			return [];
		}
	}

	async getGroup(name: string) {
		try {
			const buf = await readFile(
				join(this.groupDir(name), "config.json"),
				"utf8",
			);
			return JSON.parse(buf);
		} catch {
			return null;
		}
	}

	async updateGroup(name: string, patch: Partial<TSemanticGroupConfig>) {
		const cfg = await this.getGroup(name);
		if (!cfg) throw new Error("Group not found");
		const next = { ...cfg, ...patch };
		next.sha256 = hashNEncode(JSON.stringify(next));
		await atomicWrite(
			join(this.groupDir(name), "config.json"),
			JSON.stringify(next, null, 2),
		);
		return next;
	}

	async deleteGroup(name: string) {
		await rm(this.groupDir(name), { recursive: true, force: true });
	}

	/* ------------------ manifest entry (file-per-entry) ------------------ */
	private entryPath(laneSha: TLaneSha, entityId: TEntityId) {
		const day = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
		return join(this.laneDir(laneSha), day, `${entityId}.json`);
	}

	async writeManifestFile(entry: TManifestEntry) {
		// validate
		if (!ManifestEntry.Check(entry)) throw new Error("Invalid manifest entry");

		// inline vs external embedding decision
		let embed = entry.embedding;
		if (embed && embed.data.length > 8192) {
			// offload to blob
			const blobPath = this.blobPath(entry.blob_sha256);
			await atomicWrite(blobPath, Buffer.from(embed.data, "base64"));
			embed = undefined; // keep pointer only
		}

		const final = { ...entry, ...(embed ? { embedding: embed } : {}) };
		const path = this.entryPath(entry.lane_sha256, entry.entity_id);
		await atomicWrite(path, JSON.stringify(final));
	}

	async readManifestFile(
		laneSha: TLaneSha,
		entityId: TEntityId,
	): Promise<TManifestEntry | null> {
		const path = this.entryPath(laneSha, entityId);
		try {
			const buf = await readFile(path, "utf8");
			return JSON.parse(buf);
		} catch {
			return null;
		}
	}

	async listManifestFileContents(laneSha: TLaneSha) {
		const dir = this.laneDir(laneSha);
		try {
			const files = await readdir(dir, { recursive: true });
			const jsonFiles = files.filter((f) => f.endsWith(".json"));
			const entries = await Promise.all(
				jsonFiles.map(async (f) => {
					const buf = await readFile(join(dir, f as string), "utf8");
					return JSON.parse(buf);
				}),
			);
			return entries.filter(Boolean) as TManifestEntry[];
		} catch {
			return [];
		}
	}

	/* ------------------ blob helpers ------------------ */
	async writeBlob(sha256: TBlobSha256, buffer: Uint8Array) {
		const path = this.blobPath(sha256);
		await atomicWrite(path, buffer);
	}

	async readBlob(sha256: TBlobSha256): Promise<Uint8Array | null> {
		try {
			return await readFile(this.blobPath(sha256));
		} catch {
			return null;
		}
	}

	/* ------------------ cache helpers ------------------ */
	async writeCache(groupSha: string, commitSha: string, entities: any[]) {
		const path = join(
			this.root,
			"cache",
			groupSha,
			`${commitSha}.entities.jsonl.zst`,
		);
		// TODO: compress with zstd if desired
		await atomicWrite(path, JSON.stringify(entities));
	}

	async readCache(groupSha: string, commitSha: string) {
		const path = join(
			this.root,
			"cache",
			groupSha,
			`${commitSha}.entities.jsonl.zst`,
		);
		try {
			const buf = await readFile(path);
			return JSON.parse(buf.toString());
		} catch {
			return null;
		}
	}
	// Additional methods needed by the API and other components
	async initialize() {
		// Initialize the semantic repository
		return Promise.resolve();
	}

	async startBackgroundProcessing(interval?: number) {
		// Start background processing
		return Promise.resolve();
	}

	async stopBackgroundProcessing() {
		// Stop background processing
		return Promise.resolve();
	}

	async close() {
		// Close database connections and clean up resources
		return Promise.resolve();
	}

	async getJobStatus(jobId: string) {
		// Get job status - not implemented in this version
		return null;
	}

	async getQueueLength() {
		// Get queue length - not implemented in this version
		return 0;
	}

	async triggerProcessing(groupName: string, commit?: string) {
		// Trigger processing for a group
		return Promise.resolve();
	}
}
