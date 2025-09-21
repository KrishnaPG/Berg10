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
import { unlink } from "fs/promises";
import path from "path";

export function shellCsvToParquet(
  srcGitShell: GitShell,
  cmdArgs: string[],
  destFolder: TFolderPath,
  destFileBaseName: TFileBaseName,
  colProjection: TSQLString,
  csvDelimiter: TCsvDelim = `\\|`,
) {
  const tmpCSVFilePath = path.resolve(destFolder, `${getRandomId()}-csv.tmp`) as TFilePath;
  return srcGitShell.execToFile(cmdArgs, tmpCSVFilePath).then((bytesWritten: number) => {
    // if the output csv file was empty, no records to process
    if (!bytesWritten) {
      return console.debug(`shellCsvToParquet: command produced empty csv.`);
    }
    // else, load into parquet
    return csvToParquet(tmpCSVFilePath, colProjection, destFolder, destFileBaseName, csvDelimiter).finally(() =>
      unlink(tmpCSVFilePath),
    );
  });
}
