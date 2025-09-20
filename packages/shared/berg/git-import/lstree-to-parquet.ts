import type { GitShell } from "@shared/git-shell";
import type {
  TEMail,
  TFileBaseName,
  TFolderPath,
  TFsVcsDbCommitBaseName,
  TFsVcsDbCommitsFolderPath,
  TName,
  TSecSinceEpoch,
  TSQLString,
} from "@shared/types";
import type { TGitSHA } from "@shared/types/git-internal.types";
import { shellCsvToParquet } from "./shell-csv-to-parquet";

export function streamLsTreeToParquet(
  srcGitShell: GitShell,
  destFolder: TFolderPath,
  destFileBaseName: TFileBaseName,
  tree: TGitSHA,
) {
  const args = ["ls-tree", "-r", `--format=%(objectmode)|%(objecttype)|%(objectname)|%(objectsize)|%(path)`, tree];
  const colProjection = `
    c[1]::UINT32 AS mode,
    c[2] AS type,
    c[3] AS sha,
    c[4]::BIGINT AS size,
    c[5] AS path
  `;
  return shellCsvToParquet(srcGitShell, args, destFolder, destFileBaseName, colProjection as TSQLString);
}
