import { ParquetSchema } from "@dsnp/parquetjs";
import { csvToParquet } from "@shared/ducklake";
import type { GitShell } from "@shared/git-shell";
import type {
  TEMail,
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
  since: TSecSinceEpoch,
) {
  const args = ["rev-list", "--all", "--topo-order", "--parents", "--format=%H|%P|%T|%ct|%cn|%ce|%s"];
  if (since) args.push(`--since=${since}`); // TODO: use SELECT max(commit_time) FROM parquet_scan(?);

  const tmpCSVFilePath = path.resolve(destFolder, `${destFileBaseName}.csv.tmp`) as TFilePath;

  return srcGitShell.execToFile(args, tmpCSVFilePath).then((tmpCSVFile: Bun.BunFile) => {
    const colProjection = `c[1] AS sha,
    string_split(c[2],' ') AS parents,
    c[3] AS tree,
    to_timestamp(c[4]::BIGINT) AS commit_time,
    c[5] AS author_name,
    c[6] AS author_email,
    c[7] AS subject`;
    return csvToParquet(tmpCSVFilePath, colProjection as TSQLString, destFolder, destFileBaseName, "|").finally(() =>
      tmpCSVFile.unlink(),
    );
  });
}
