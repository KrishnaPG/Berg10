import { ParquetSchema } from "@dsnp/parquetjs";
import type { GitShell } from "@shared/git-shell";
import type { TFilePath, TFsVcsDbPIFolderPath, TFsVcsDbPIName } from "@shared/types";
import type { TGitSHA } from "@shared/types/git-internal.types";
import { TransactionalParquetWriter } from "../parquet-writer";

// NOTE: this has to match the interface `IdxFileLine` below
const idxFileLineSchema = new ParquetSchema({
  sha1: { type: "UTF8", encoding: "PLAIN", compression: "BROTLI" },
  type: { type: "UTF8", encoding: "PLAIN" }, // use RLE for repeating values in the column
  size: { type: "INT64", encoding: "PLAIN", compression: "BROTLI" },
  sizeInPack: { type: "INT64", encoding: "PLAIN", compression: "BROTLI" },
  offset: { type: "INT64", encoding: "PLAIN", compression: "BROTLI" },
  depth: { type: "INT64", optional: true },
  base: { type: "UTF8", encoding: "PLAIN", compression: "BROTLI", optional: true },
});

// NOTE: this interface has to match the groups of `idxFileLineRegEx` below
export interface IdxFileLine {
  sha: TGitSHA;
  type: "commit" | "tree" | "blob" | "tag";
  size: number;
  sizeInPack: number;
  offset: number;
  depth?: number;
  base?: TGitSHA;
  [key: string]: unknown; // to make it compatible with ParquetWriter.appendRow()
}

// The source of truth: comes from `git verify-pack -v` command output format
const idxFileLineRegEx =
  /^(?<sha>[0-9a-f]{40,64})\s+(?<type>commit|tree|blob|tag)\s+(?<size>\d+)\s+(?<sizeInPack>\d+)\s+(?<offset>\d+)(?:\s+(?<depth>\d+)\s+(?<base>[0-9a-f]{40,64}))?$/;

const ROW_BATCH_SIZE = 4096;

// read the idx file and write the content to output file
export function streamIDXtoParquet(
  srcGitShell: GitShell,
  srcIdxPath: TFilePath,
  destFolder: TFsVcsDbPIFolderPath,
  destFileBaseName: TFsVcsDbPIName,
) {
  return TransactionalParquetWriter.open(idxFileLineSchema, destFolder, destFileBaseName, {
    rowGroupSize: ROW_BATCH_SIZE,
  }).then(
    (writer) =>
      srcGitShell
        .execStream(
          ["verify-pack", "-v", srcIdxPath],
          (idxLinesBatch: string[]) => {
            const p = [];
            // convert each line to a row and write to parquet
            for (const idxLine of idxLinesBatch) {
              const m = idxLine.match(idxFileLineRegEx);
              if (!m?.groups) continue; // skip unnecessary lines
              const g = m.groups;
              const row: IdxFileLine = {
                sha: g.sha as TGitSHA,
                type: g.type as IdxFileLine["type"],
                size: Number(g.size),
                sizeInPack: Number(g.sizeInPack),
                offset: Number(g.offset),
                depth: g.depth ? Number(g.depth) : undefined,
                base: g.base as TGitSHA,
              };
              p.push(writer.appendRow(row));
            }
            // wait for the the pending writes
            return Promise.all(p).then(() => {});
          },
          ROW_BATCH_SIZE,
        )
        .then(() => writer.commit()), // commit to disk and rename the file atomically
  );
}
