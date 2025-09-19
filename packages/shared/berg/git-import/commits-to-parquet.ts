import { ParquetSchema } from "@dsnp/parquetjs";
import { csvToParquet } from "@shared/ducklake";
import type { GitShell } from "@shared/git-shell";
import type {
  TEMail,
  TFileBaseName,
  TFilePath,
  TFsVcsDbCommitBaseName,
  TFsVcsDbCommitsFolderPath,
  TName,
  TParquetFilePath,
  TSecSinceEpoch,
  TSQLString,
} from "@shared/types";
import type { TGitSHA } from "@shared/types/git-internal.types";
import { atomicFileRename } from "@shared/utils";
import fs from "fs-extra";
import path from "path";
import { TransactionalParquetWriter } from "../parquet-writer";

export interface IGitCommitLine {
  hash: TGitSHA; // 40-char hex
  parents: TGitSHA[]; // hex strings
  tree: TGitSHA;
  timestamp: TSecSinceEpoch; // unix seconds since epoch
  committerName: TName;
  committerEmail: TEMail;
  subject: string;
}

export function streamCommitsToParquet(
  srcGitShell: GitShell,
  destFolder: TFsVcsDbCommitsFolderPath,
  destFileBaseName: TFsVcsDbCommitBaseName,
  since?: TSecSinceEpoch,
) {
  const args = ["log", "--all", "--reverse", "--date-order", `--format=%H|%P|%T|%ct|%cn|%ce|%s`];
  if (since) args.push(`--since=${since}`);

  const tmpCSVFilePath = path.resolve(destFolder, `${destFileBaseName}.csv.tmp`) as TFilePath;

  return srcGitShell.execToFile(args, tmpCSVFilePath).then((tmpCSVFile: Bun.BunFile) => {
    const colProjection = `c[1] AS sha,
    string_split(c[2],' ') AS parents,
    c[3] AS tree,
    to_timestamp(c[4]::BIGINT) AS commit_time,
    c[5] AS author_name,
    c[6] AS author_email,
    c[7] AS subject`;
    return csvToParquet(tmpCSVFilePath, colProjection as TSQLString, destFolder, destFileBaseName, `\\|`).finally(() =>
      tmpCSVFile.unlink(),
    );
  });
}

// const commitListRowSchema = new ParquetSchema({
//   hash: { type: "UTF8", encoding: "PLAIN", compression: "BROTLI" },
//   commitTime: {type:"TIMESTAMP_MILLIS", encoding: "PLAIN", compression: "BROTLI"}
// });

// const ROW_BATCH_SIZE = 1024;

// function getLatestCommits(
//   srcGitShell: GitShell,
//   destFolder: TFsVcsDbCommitsFolderPath,
//   destFileBaseName: TFsVcsDbCommitBaseName,
//   since?: TSecSinceEpoch,
// ) {
//   const args = ["log", "--all", "--reverse", "--date-order", `--format="%H|%P|%T|%ct|%cn|%ce|%s"`];
//   if (since) args.push(`--since=${since}`);

//   return TransactionalParquetWriter.open(commitListRowSchema, destFolder, `hashes-${since}` as TFileBaseName, {
//     rowGroupSize: ROW_BATCH_SIZE,
//   }).then(
//     (writer) =>
//       srcGitShell
//         .execStream(
//           args,
//           (idxLinesBatch: string[]) => {
//             const p = [];
//             // convert each line to a row and write to parquet
//             for (const idxLine of idxLinesBatch) {
//               const m = idxLine.match(idxFileLineRegEx);
//               if (!m?.groups) continue; // skip unnecessary lines
//               const g = m.groups;
//               const row: IdxFileLine = {
//                 sha1: g.sha1 as TGitSHA,
//                 type: g.type as IdxFileLine["type"],
//                 size: Number(g.size),
//                 sizeInPack: Number(g.sizeInPack),
//                 offset: Number(g.offset),
//                 depth: g.depth ? Number(g.depth) : undefined,
//                 base: g.base as TGitSHA,
//               };
//               p.push(writer.appendRow(row));
//             }
//             // wait for the the pending writes
//             return Promise.all(p).then(() => {});
//           },
//           ROW_BATCH_SIZE,
//         )
//         .then(() => writer.commit()), // commit to disk and rename the file atomically
//   );
// }

/**
 step1:  
 
 */
