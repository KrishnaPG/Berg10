import { createWriteStream, statSync, type WriteStream } from "node:fs";
import path from "node:path";
import type { BunFile } from "bun";
import type { AtomicTx } from "./atomic-tx";

/**
 * segmented manifest writer that rotates files on demand
 */
export class ManifestWriter {
	private segment = 0;
	private stream?: WriteStream;
	private refFile: BunFile;
	private bytesWrittenInSegment = 0;

	constructor(private laneDir: string) {
		this.refFile = Bun.file(path.resolve(laneDir, "manifest.ref"));
		this.refFile
			.exists()
			.then((exists) => {
				return exists ? this.refFile.text() : "0";
			})
			.then((segment) => {
				this.segment = Number(segment);
				this.open();
			});
	}

	private open() {
		const filePath = path.resolve(
			this.laneDir,
			`manifest.${String(this.segment).padStart(6, "0")}.jsonl`,
		);
		this.stream = createWriteStream(filePath, { flags: "a" });
		this.bytesWrittenInSegment = statSync(filePath).size; // so that offset is exact even if the process restarts mid-segment.
	}

	/**
	 * Append a line and return (segment, byteOffsetBeforeWrite)
	 */
	append(line: string): { segment: number; offset: number } {
		if (!this.stream) throw new Error("ManifestLog stream is Null");

		const offset = this.bytesWrittenInSegment;
		this.stream.write(`${line}\n`); // TODO: error handling is missing !!
		this.bytesWrittenInSegment += Buffer.byteLength(line) + 1; // + newline
		return { segment: this.segment, offset };
	}

	appendAtomic(tx: AtomicTx, line: string, segment: number) {
		const segName = `manifest.${String(segment).padStart(6, "0")}.jsonl`;
		const staged = tx.stage(segName, `${line}\n`);
		return { staged, segment };
	}

	rotate(): Promise<void> {
		if (!this.stream) throw new Error("ManifestLog stream is Null");

		this.stream.end();
		this.segment += 1;
		return this.refFile.write(String(this.segment)).then(() => {
			this.bytesWrittenInSegment = 0;
			return this.open();
		});
	}

	close() {
		this.stream?.end();
	}
}
