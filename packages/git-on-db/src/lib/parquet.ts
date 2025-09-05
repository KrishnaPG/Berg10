import { createWriteStream, fsyncSync, mkdirSync, openSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import * as arrow from "apache-arrow";
import { writeParquet } from "parquet-wasm";
import type { Config, GitObject } from "./types";

const SCHEMAS = {
  commit: new arrow.Schema([
    { name: "sha", type: new arrow.Utf8() },
    { name: "author", type: new arrow.Utf8() },
    { name: "committer", type: new arrow.Utf8() },
    { name: "message", type: new arrow.Utf8() },
    { name: "tree", type: new arrow.Utf8() },
    { name: "parents", type: new arrow.List(new arrow.Utf8()) },
  ]),
  tree: new arrow.Schema([
    { name: "sha", type: new arrow.Utf8() },
    {
      name: "entries",
      type: new arrow.List(
        new arrow.Struct([
          { name: "name", type: new arrow.Utf8() },
          { name: "sha", type: new arrow.Utf8() },
          { name: "mode", type: new arrow.Int32() },
        ]),
      ),
    },
  ]),
  blob: new arrow.Schema([
    { name: "sha", type: new arrow.Utf8() },
    { name: "size", type: new arrow.Int64() },
    { name: "data", type: new arrow.Binary() },
  ]),
  tag: new arrow.Schema([
    { name: "sha", type: new arrow.Utf8() },
    { name: "object", type: new arrow.Utf8() },
    { name: "type", type: new arrow.Utf8() },
    { name: "tag", type: new arrow.Utf8() },
    { name: "tagger", type: new arrow.Utf8() },
    { name: "message", type: new arrow.Utf8() },
  ]),
};

export class ParquetWriter {
  private batches = new Map<string, arrow.RecordBatch[]>();
  private sizes = new Map<string, number>();
  private sn: number;
  private min = new Map<string, string>();
  private max = new Map<string, string>();

  constructor(
    private cfg: Config,
    private root: string,
    sn: number,
  ) {
    this.sn = sn;
  }

  append(o: GitObject): void {
    const type = o.type;
    let cols: arrow.Vector[];
    if (type === "blob") {
      cols = [arrow.vectorFromArray([o.sha]), arrow.vectorFromArray([BigInt(o.size)]), arrow.vectorFromArray([o.data])];
    } else {
      // For commit/tree/tag we do **zero parsing** – store raw bytes as Utf8
      cols = [arrow.vectorFromArray([o.sha]), arrow.vectorFromArray([o.data])];
    }
    const batch = new arrow.RecordBatch(SCHEMAS[type], cols);
    const arr = this.batches.get(type) || [];
    arr.push(batch);
    this.batches.set(type, arr);
    this.sizes.set(type, (this.sizes.get(type) || 0) + o.data.byteLength);
    if (!this.min.has(type)) this.min.set(type, o.sha);
    this.max.set(type, o.sha);
    if (this.sizes.get(type)! >= this.cfg.parquet.targetRowGroupSize) this.flush(type);
  }

  private flush(type: string) {
    const tbl = new arrow.Table(SCHEMAS[type], this.batches.get(type));
    const prefix = this.min.get(type)!.slice(0, 2);
    const dir = join(this.root, "v2", type, `part_hash=${prefix}`);
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, `tmp_${Math.random().toString(36).slice(2)}.parquet`);
    const final = join(
      dir,
      `batch_sn=${this.sn}__${this.min.get(type)!.slice(0, 7)}-${this.max.get(type)!.slice(0, 7)}.parquet`,
    );
    const ws = createWriteStream(tmp);
    writeParquet(tbl, ws);
    ws.end();
    ws.on("close", () => {
      renameSync(tmp, final);
      fsyncSync(openSync(dirname(final), "r"));
    });
    this.batches.delete(type);
    this.sizes.delete(type);
    this.min.delete(type);
    this.max.delete(type);
  }

  flushAll(): void {
    for (const t of this.batches.keys()) this.flush(t);
  }
}
