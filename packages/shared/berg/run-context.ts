import { singletonPromise } from "@fict/utils";
import type { TBergName, TDriftPath, TFolderPath } from "@shared/types";
import { getPackageJsonFolder } from "@shared/utils";
import * as fs from "fs";
import os from "os";
import path from "path";
import { parseCliArgs } from "./cli-parser";

export interface IRunContext {
  userHome: TDriftPath; // the target path, usually user home `~/`
  templDir: TFolderPath; // path of the "template" folder that has `.berg10/` inside
  bergName: TBergName; // the target bergName, usually `.berg10`

  abortPrevSync: boolean; // if any prev sync is still in progress, should it be aborted
}

/**
 * Get default run context with business logic (env fallbacks, path resolution).
 * Defaults are resolved here, including async operations.
 */
async function getDefaultRunCtx(): Promise<IRunContext> {
  const pkgDir = await getPackageJsonFolder();
  return {
    userHome: (process.env.USER_HOME as TDriftPath) ?? (os.tmpdir()as TDriftPath),
    templDir: path.join(pkgDir, "template") as TFolderPath,
    bergName: (process.env.BERG_NAME as TBergName) ?? (".berg10" as TBergName),
    abortPrevSync: process.env.ABORT_PREV_SYNC === "true",
  };
}

/**
 * Merge base context with overrides (shallow merge, CLI > base).
 * Only applies defined overrides, skipping undefined to preserve defaults.
 * @param base - Default context from getDefaultRunCtx
 * @param overrides - Parsed CLI args or other partials
 */
function mergeRunCtx(base: IRunContext, overrides: Partial<IRunContext>): IRunContext {
  return { ...base, ...overrides };
}

function validate(runCtx: IRunContext) {
  runCtx.userHome = path.resolve(runCtx.userHome) as TDriftPath;
  runCtx.templDir = path.resolve(runCtx.templDir) as TFolderPath;
  if (typeof runCtx.templDir !== "string" || !fs.existsSync(path.join(runCtx.templDir, ".berg10"))) {
    throw new Error(`Invalid templDir: ${runCtx.templDir}`);
  }
  return runCtx;
}

export function init() {
  return singletonPromise(
    () =>
      getDefaultRunCtx()
        .then((defaults) => mergeRunCtx(defaults, parseCliArgs()))
        .then(validate),
    "runCtx.init",
  );
}

export const runCtx = await init();
