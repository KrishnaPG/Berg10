import { csvToParquet, type TCsvDelim } from "@shared/ducklake";
import type { GitShell } from "@shared/git-shell";
import type {
  TEMail,
  TFileBaseName,
  TFilePath,
  TFolderPath,
  TFsVcsDbCommitBaseName,
  TFsVcsDbCommitsFolderPath,
  TName,
  TSecSinceEpoch,
  TSQLString,
} from "@shared/types";
import { getRandomId } from "@shared/utils";
import path from "path";

export function shellCsvToParquet(
  srcGitShell: GitShell,
  cmdArgs: string[],
  destFolder: TFolderPath,
  destFileBaseName: TFileBaseName,
  colProjection: TSQLString,
  csvDelimiter: TCsvDelim = `\\|`,
) {
  const tmpCSVFilePath = path.resolve(destFolder, `${getRandomId()}.csv.tmp`) as TFilePath;
  return srcGitShell.execToFile(cmdArgs, tmpCSVFilePath).then((tmpCSVFile: Bun.BunFile | null) => {
    // if the output csv file was empty, no records to process
    if (!tmpCSVFile) {
      console.debug(`shellCsvToParquet: command produced empty csv.`);
      return;
    }
    // else, load into parquet
    return csvToParquet(tmpCSVFilePath, colProjection, destFolder, destFileBaseName, csvDelimiter).finally(() =>
      tmpCSVFile.unlink(),
    );
  });
}
