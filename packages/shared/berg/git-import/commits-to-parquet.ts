import { ParquetSchema } from "@dsnp/parquetjs";
import { csvToParquet } from "@shared/ducklake";
import type { GitShell } from "@shared/git-shell";
import type {
  TFileBaseName,
  TFilePath,
  TFsVcsDbCommitBaseName,
  TFsVcsDbCommitsFolderPath,
  TParquetFilePath,
} from "@shared/types";
import type { TGitSHA } from "@shared/types/git-internal.types";
import path from "path";
import { TransactionalParquetWriter } from "../parquet-writer";

const commitLineSchema = new ParquetSchema({
  sha: { type: "UTF8", optional: false },
  parents: { type: "UTF8", optional: false },
  tree: { type: "UTF8", optional: false },
  author_time: { type: "INT64", optional: false },
  author_name: { type: "UTF8", optional: false },
  author_email: { type: "UTF8", optional: false },
  message: { type: "UTF8", optional: false },
});

const ROW_BATCH_SIZE = 4096;

export function streamCommitsToParquet(
  srcGitShell: GitShell,
  lastCommit: TGitSHA,
  destFolder: TFsVcsDbCommitsFolderPath,
  destFileBaseName: TFsVcsDbCommitBaseName,
) {
  const args = ["rev-list", "--all", "--topo-order", "--parents", "--format=%H|%P|%T|%ct|%cn|%ce|%s"];
  if (lastCommit) args.push(`^${lastCommit}`);

  const tmpCSVFilePath = path.resolve(destFolder, `${destFileBaseName}.csv.tmp`) as TFilePath;
  const finalFilePath = path.resolve(destFolder, `${destFileBaseName}.parquet`) as TParquetFilePath;

  return srcGitShell.execToFile(args, tmpCSVFilePath).then((tmpCSVFile) => {
    csvToParquet(tmpCSVFile);
  });

  return TransactionalParquetWriter.open(commitLineSchema, destFolder, destFileBaseName, {
    rowGroupSize: ROW_BATCH_SIZE,
  }).then((writer) =>
    srcGitShell.execStream(args, (commitLinesBatch: string[]) => {
      const p = [];
      commitLinesBatch.forEach((commitLine) => {
        const line = commitLine.trim();
        if (!line || !line.startsWith("commit ")) return;
        const [sha, parents, tree, ts, name, email, ...msgArr] = line.slice(7).split("|");
        const currentCommit = sha;
        const currentTree = tree;
      });
    }),
  );
}
