import { parseArgs } from "node:util";
import { type TBergPath, type TDriftPath, TDuckLakeDBName } from "@shared/types";
import type { TFsDLRootPath } from "@shared/types/fs-dl.types";
import type { TFsVCSDotGitPath, TFsVCSRootPath } from "@shared/types/fs-vcs.types";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { runOnce } from "./coordinator";

const { values } = parseArgs({
  options: {
    repo: { type: "string", default: process.cwd() },
    config: { type: "string" },
    once: { type: "boolean", default: true },
  },
});

// bergPath should already exist
function open(bergPath: TBergPath): Promise<TFsVCSDotGitPath> {
  console.log(`Mounting ${bergPath} ...`);
  const fsVCSRootpath: TFsVCSRootPath = path.resolve(bergPath, "vcs") as TFsVCSRootPath;
  const fsDLRootPath: TFsDLRootPath = path.resolve(bergPath, "db") as TFsDLRootPath;
  const gitSha = "SomeSha.git";
  const vcsGitFolder: TFsVCSDotGitPath = path.resolve(fsVCSRootpath, gitSha) as TFsVCSDotGitPath;
  return fs.ensureDir(vcsGitFolder).then(() => {
    return vcsGitFolder;
  });
}

// Initialize the orchestrator on application startup. Creates the folder structure if needed.
function initialize(userHome: TDriftPath = os.tmpdir() as TDriftPath, bergName: string = ".berg10"): Promise<void> {
  const bergPath: TBergPath = path.resolve(userHome, bergName) as TBergPath;

  return open(bergPath);
}

(async () => {
  try {
    await runOnce(values.repo!, values.config);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
