import { CONFIG } from "../../config";
import { ShellBackend } from "./shell";
import type { IGitBackend } from "./types";

// import { LibGit2Backend } from "./libgit2";

const active: IGitBackend = new ShellBackend(); //CONFIG.GIT_BACKEND === "libgit2" ? new LibGit2Backend() : new ShellBackend();

export const backend = {
  current: () => active,
  // TODO: implement switching later
  // switch: (kind: BackendKind) => {
  //   active = kind === "libgit2" ? new LibGit2Backend() : new ShellBackend();
  // },
};
