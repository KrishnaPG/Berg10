import type { IGitBackend, TGitBackendType } from "../backend";
import {clone, commit, push} from 'isomorphic-git'

export class ISOGitBackend implements IGitBackend {
  getCurrentBackend(): TGitBackendType {
    return "isogit";
  }
}
