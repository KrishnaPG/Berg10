import { createHash } from "crypto";
import { join } from "path";

export class FileSystemStorage {
	private readonly basePath: string;

	constructor(basePath = ".semantic") {
		this.basePath = basePath;
	}

	async initialize(): Promise<void> {
		const dirs = [
			join(this.basePath),
			join(this.basePath, "index", "blobs"),
			join(this.basePath, "index", "lanes"),
			join(this.basePath, "groups"),
			join(this.basePath, "cache"),
		];

		for (const dir of dirs) {
			try {
				await Bun.mkdir(dir, { recursive: true });
			} catch (error) {
				console.error(`Failed to create directory ${dir}:`, error);
				throw error;
			}
		}

		// Create version file
		const versionPath = join(this.basePath, "version");
		try {
			await Bun.file(versionPath).text();
		} catch {
			await Bun.write(versionPath, "1.0.0");
		}
	}

	async writeFile(path: string, content: string | Uint8Array): Promise<string> {
		const fullPath = join(this.basePath, path);
		const dir = fullPath.split("/").slice(0, -1).join("/");

		await Bun.mkdir(dir, { recursive: true });
		await Bun.write(fullPath, content);

		return this.calculateChecksum(content);
	}

	async readFile(path: string): Promise<string> {
		const fullPath = join(this.basePath, path);
		return await Bun.file(fullPath).text();
	}

	async readFileBuffer(path: string): Promise<Uint8Array> {
		const fullPath = join(this.basePath, path);
		return await Bun.file(fullPath).bytes();
	}

	async deleteFile(path: string): Promise<void> {
		const fullPath = join(this.basePath, path);
		await Bun.remove(fullPath);
	}

	async fileExists(path: string): Promise<boolean> {
		try {
			const fullPath = join(this.basePath, path);
			const file = Bun.file(fullPath);
			return await file.exists();
		} catch {
			return false;
		}
	}

	async listFiles(path: string): Promise<string[]> {
		const fullPath = join(this.basePath, path);
		try {
			const dir = await Bun.readDir(fullPath);
			return Array.from(dir).map((entry) => entry.name);
		} catch {
			return [];
		}
	}

	async listFilesRecursive(path: string): Promise<string[]> {
		const fullPath = join(this.basePath, path);
		const files: string[] = [];

		try {
			const dir = await Bun.readDir(fullPath, { recursive: true });
			for await (const entry of dir) {
				if (entry.isFile) {
					files.push(join(path, entry.name));
				}
			}
		} catch {
			// Directory doesn't exist or is empty
		}

		return files;
	}

	private calculateChecksum(content: string | Uint8Array): string {
		const hash = createHash("sha256");
		if (typeof content === "string") {
			hash.update(content);
		} else {
			hash.update(content);
		}
		return hash.digest("hex");
	}

	async writeJson(path: string, data: unknown): Promise<string> {
		const content = JSON.stringify(data, null, 2);
		return await this.writeFile(path, content);
	}

	async readJson<T = unknown>(path: string): Promise<T> {
		const content = await this.readFile(path);
		return JSON.parse(content) as T;
	}

	async appendFile(path: string, content: string): Promise<void> {
		const fullPath = join(this.basePath, path);
		const dir = fullPath.split("/").slice(0, -1).join("/");

		await Bun.mkdir(dir, { recursive: true });

		const existing = (await this.fileExists(path))
			? await this.readFile(path)
			: "";
		await Bun.write(fullPath, existing + content);
	}

	async getFileStats(
		path: string,
	): Promise<{ size: number; modified: Date } | null> {
		try {
			const fullPath = join(this.basePath, path);
			const file = Bun.file(fullPath);
			const stats = await file.stat();
			return {
				size: stats.size,
				modified: new Date(stats.mtime),
			};
		} catch {
			return null;
		}
	}

	async createDirectory(path: string): Promise<void> {
		const fullPath = join(this.basePath, path);
		await Bun.mkdir(fullPath, { recursive: true });
	}

	async removeDirectory(path: string): Promise<void> {
		const fullPath = join(this.basePath, path);
		await Bun.remove(fullPath, { recursive: true });
	}
}
