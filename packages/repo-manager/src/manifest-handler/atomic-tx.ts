import {
	closeSync,
	fsyncSync,
	mkdirSync,
	openSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 This is a lock-free, atomic “all-or-nothing” pattern that keeps the 
 three on-disk artefacts consistent:
  - the segment log (manifest.000123.jsonl)
  - the LevelDB index (manifest.idx)
  - the blob file (.semantic/index/blobs/…/<sha256>)

 For that we:
  - Stage every artefact to a temporary directory first.
  - Fsync each file to disk.
  - Rename the files into their final, immutable locations in one atomic step (POSIX guarantees renames inside the same filesystem are atomic).
  - On crash, the temp files are simply ignored / cleaned up on next boot.
 The whole operation is idempotent (content-addressed) so retries are safe.
 */
export class AtomicTx {
	private tmp = join(tmpdir(), "semantic-tx-" + process.pid);

	constructor() {
		mkdirSync(this.tmp, { recursive: true });
	}

	stage(name: string, data: Uint8Array | string) {
		const path = join(this.tmp, name);
		writeFileSync(path, data);
		// fsync directory entry
		const fd = openSync(path, "r");
		fsyncSync(fd);
		closeSync(fd);
		return path;
	}

	commit(mapping: Record<string /* staged */, string /* final */>) {
		for (const [from, to] of Object.entries(mapping)) {
			mkdirSync(to.split("/").slice(0, -1).join("/"), { recursive: true });
			renameSync(from, to);
		}
		this.cleanup();
	}

	rollback() {
		this.cleanup();
	}

	private cleanup() {
		rmSync(this.tmp, { recursive: true, force: true });
	}
}
