import { createHash } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { ManifestEntry, type TManifestEntry } from "./types";

// ---------- utils ----------------------------------------------------------
const shaToPath = (sha: string) => `${sha.slice(0, 2)}/${sha}`;
const atomicWrite = async (finalPath: string, data: Uint8Array | string) => {
  await mkdir(dirname(finalPath), { recursive: true });
  const tmp = finalPath + ".tmp";
  await writeFile(tmp, data);
  await rename(tmp, finalPath);
};

/*
  - stores every manifest entry as one JSON file under the respective lane folder
  - keeps embeddings inline (or in external blobs when > 8 KB, switchable)
  - guarantees atomic writes (tmp + rename)
  - uses Bun File API (promise based, non-blocking)
  - validates every object at runtime with `@sinclair/typebox`
  - exposes all CRUD / introspection methods expected by GraphQL resolvers
*/
export class SemanticRepo {
  private root: string;

  constructor(repoRoot = ".") {
    this.root = join(repoRoot, ".semantic");
  }

  /* ------------------ directories ------------------ */
  private groupDir(name: string) {
    return join(this.root, "groups", name);
  }
  private laneDir(laneSha: string) {
    return join(this.root, "index", "lanes", laneSha);
  }
  private blobDir(sha: string) {
    return join(this.root, "index", "blobs", shaToPath(sha));
  }

  /* ------------------ group CRUD ------------------ */
  async createGroup(name: string, config: any) {
    const dir = this.groupDir(name);
    await mkdir(dir, { recursive: true });
    const cfg = {
      ...config,
      sha256: createHash("sha256").update(JSON.stringify(config)).digest("hex"),
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

  async updateGroup(name: string, patch: any) {
    const cfg = await this.getGroup(name);
    if (!cfg) throw new Error("Group not found");
    const next = { ...cfg, ...patch };
    next.sha256 = createHash("sha256")
      .update(JSON.stringify(next))
      .digest("hex");
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
  private entryPath(laneSha: string, entityId: string) {
    const day = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    return join(this.laneDir(laneSha), day, `${entityId}.json`);
  }

  async writeManifestEntry(entry: TManifestEntry) {
    // validate
    if (!ManifestEntry.Check(entry)) throw new Error("Invalid manifest entry");

    // inline vs external embedding decision
    let embed = entry.embedding;
    if (embed && embed.data.length > 8192) {
      // offload to blob
      const blobPath = this.blobDir(entry.blob_sha256);
      await atomicWrite(blobPath, Buffer.from(embed.data, "base64"));
      embed = undefined; // keep pointer only
    }

    const final = { ...entry, ...(embed ? { embedding: embed } : {}) };
    const path = this.entryPath(entry.lane_sha256, entry.entity_id);
    await atomicWrite(path, JSON.stringify(final));
  }

  async readManifestEntry(
    laneSha: string,
    entityId: string,
  ): Promise<TManifestEntry | null> {
    const path = this.entryPath(laneSha, entityId);
    try {
      const buf = await readFile(path, "utf8");
      const parsed = JSON.parse(buf);
      return ManifestEntry.Check(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async listManifestEntries(laneSha: string) {
    const dir = this.laneDir(laneSha);
    try {
      const files = await readdir(dir, { recursive: true });
      const jsonFiles = files.filter((f) => f.endsWith(".json"));
      const entries = await Promise.all(
        jsonFiles.map(async (f) => {
          const buf = await readFile(join(dir, f as string), "utf8");
          const parsed = JSON.parse(buf);
          return ManifestEntry.Check(parsed) ? parsed : null;
        }),
      );
      return entries.filter(Boolean) as TManifestEntry[];
    } catch {
      return [];
    }
  }

  /* ------------------ blob helpers ------------------ */
  async writeBlob(sha256: string, buffer: Uint8Array) {
    const path = this.blobDir(sha256);
    await atomicWrite(path, buffer);
  }

  async readBlob(sha256: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.blobDir(sha256));
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
}
