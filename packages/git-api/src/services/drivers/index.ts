import { CONFIG } from "../../config";
import type { IGitBackend, TGitBackendType } from "./backend";
import { createCachedBackend } from "./cached-backend";
import { LibGit2Backend } from "./libgit2";
import { ShellBackend } from "./shell";

const backends: Record<TGitBackendType, IGitBackend> = {};
const getCachedBackend = (kind: TGitBackendType): IGitBackend => {
  const cachedBackend = backends[kind];
  if (!cachedBackend)
    backends[kind] = createCachedBackend(kind === "libgit2" ? new LibGit2Backend() : new ShellBackend());
  return backends[kind];
};

let active: IGitBackend = getCachedBackend(CONFIG.GIT_BACKEND);

export const backend = {
  current: () => active,
  switch: (kind: TGitBackendType) => {
    active = getCachedBackend(kind);
    return active;
  },
};
