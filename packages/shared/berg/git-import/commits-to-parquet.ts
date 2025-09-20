import type { GitShell } from "@shared/git-shell";
import type {
  TEMail,
  TFsVcsDbCommitBaseName,
  TFsVcsDbCommitsFolderPath,
  TName,
  TSecSinceEpoch,
  TSQLString,
} from "@shared/types";
import type { TGitSHA } from "@shared/types/git-internal.types";
import { shellCsvToParquet } from "./shell-csv-to-parquet";

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
  if (since) args.push(`--since='${since}'`);
  const colProjection = `
    c[1] AS sha,
    string_split(c[2],' ') AS parents,
    c[3] AS tree,
    to_timestamp(c[4]::BIGINT) AS commit_time,
    c[5] AS author_name,
    c[6] AS author_email,
    c[7] AS subject
  `;
  return shellCsvToParquet(srcGitShell, args, destFolder, destFileBaseName, colProjection as TSQLString);
}
