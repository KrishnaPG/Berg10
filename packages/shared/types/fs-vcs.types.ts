/**
 * FS VCS Types
 */

import type { Branded, TGitRepoRootPath } from "./branded.types";

export type TFsVCSRootPath = Branded<TGitRepoRootPath, "FsVCSRoot">;
