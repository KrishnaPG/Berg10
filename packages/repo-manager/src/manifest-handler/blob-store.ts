import { createHash } from "node:crypto";
import {
	createReadStream,
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { AtomicTx } from "./atomic-tx";

export class BlobStore {
	private base = join(".semantic", "index", "blobs");

	path(sha256: string) {
		return join(this.base, sha256.slice(0, 2), sha256);
	}

	async write(sha256: string, buffer: Uint8Array) {
		const file = this.path(sha256);
		mkdirSync(join(this.base, sha256.slice(0, 2)), { recursive: true });
		await Bun.write(file, buffer);
		return file;
	}

	async read(sha256: string): Promise<Uint8Array | null> {
		const file = Bun.file(this.path(sha256));
		return (await file.exists()) ? file.bytes() : null;
	}

	createReadStream(sha256: string) {
		return createReadStream(this.path(sha256));
	}

	stage(tx: AtomicTx, buffer: Uint8Array): string {
		const sha = createHash("sha256").update(buffer).digest("hex");
		const rel = `${sha.slice(0, 2)}/${sha}`;
		const staged = tx.stage(`blob-${sha}`, buffer);
		return staged; // will be renamed to base/rel
	}

	finalPath(sha: string) {
		return join(this.base, sha.slice(0, 2), sha);
	}
}
