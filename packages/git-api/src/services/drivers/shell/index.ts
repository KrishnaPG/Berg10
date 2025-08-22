import type { IGitBackend } from "../backend";
import { RepositoryOperations } from "./repository-operations";
import { RefOperations } from "./ref-operations";
import { CommitOperations } from "./commit-operations";
import { TreeOperations } from "./tree-operations";
import { IndexOperations } from "./index-operations";
import { StashOperations } from "./stash-operations";
import { DiffOperations } from "./diff-operations";
import { LogOperations } from "./log-operations";
import { MergeRebaseOperations } from "./merge-rebase-operations";

// Create instances of all operation classes
const repositoryOps = new RepositoryOperations();
const refOps = new RefOperations();
const commitOps = new CommitOperations();
const treeOps = new TreeOperations();
const indexOps = new IndexOperations();
const stashOps = new StashOperations();
const diffOps = new DiffOperations();
const logOps = new LogOperations();
const mergeRebaseOps = new MergeRebaseOperations();

// Export a class that implements IGitBackend by delegating to the operation classes
export class ShellBackend implements IGitBackend {
 // Repository operations
  init = repositoryOps.init.bind(repositoryOps);
  clone = repositoryOps.clone.bind(repositoryOps);
  open = repositoryOps.open.bind(repositoryOps);
 close = repositoryOps.close.bind(repositoryOps);
  listRepositories = repositoryOps.listRepositories.bind(repositoryOps);
  getRepository = repositoryOps.getRepository.bind(repositoryOps);
  updateRepository = repositoryOps.updateRepository.bind(repositoryOps);
  deleteRepository = repositoryOps.deleteRepository.bind(repositoryOps);
  getCurrentBackend = repositoryOps.getCurrentBackend.bind(repositoryOps);

  // Ref operations
  listRefs = refOps.listRefs.bind(refOps);
  getRef = refOps.getRef.bind(refOps);
  createRef = refOps.createRef.bind(refOps);
  deleteRef = refOps.deleteRef.bind(refOps);
  renameRef = refOps.renameRef.bind(refOps);
  createBranch = refOps.createBranch.bind(refOps);
  createTag = refOps.createTag.bind(refOps);
  updateRef = refOps.updateRef.bind(refOps);

  // Commit operations
  listCommits = commitOps.listCommits.bind(commitOps);
  getCommit = commitOps.getCommit.bind(commitOps);
  createCommit = commitOps.createCommit.bind(commitOps);
  updateCommitMessage = commitOps.updateCommitMessage.bind(commitOps);
  revert = commitOps.revert.bind(commitOps);
  reset = commitOps.reset.bind(commitOps);

  // Tree operations
  listFiles = treeOps.listFiles.bind(treeOps);
  getBlob = treeOps.getBlob.bind(treeOps);
  createTree = treeOps.createTree.bind(treeOps);
  createBlob = treeOps.createBlob.bind(treeOps);
  getFileContents = treeOps.getFileContents.bind(treeOps);
  createOrUpdateFile = treeOps.createOrUpdateFile.bind(treeOps);
  deleteFile = treeOps.deleteFile.bind(treeOps);

  // Index operations
  getIndex = indexOps.getIndex.bind(indexOps);
  addToIndex = indexOps.addToIndex.bind(indexOps);
  removeFromIndex = indexOps.removeFromIndex.bind(indexOps);
  updateIndex = indexOps.updateIndex.bind(indexOps);
  stagePatch = indexOps.stagePatch.bind(indexOps);
  discardWorktree = indexOps.discardWorktree.bind(indexOps);

  // Stash operations
  listStashes = stashOps.listStashes.bind(stashOps);
  saveStash = stashOps.saveStash.bind(stashOps);
  applyStash = stashOps.applyStash.bind(stashOps);
 dropStash = stashOps.dropStash.bind(stashOps);

  // Diff operations
  diffCommits = diffOps.diffCommits.bind(diffOps);
  diffIndex = diffOps.diffIndex.bind(diffOps);
  diffWorktree = diffOps.diffWorktree.bind(diffOps);
  getCommitDiff = diffOps.getCommitDiff.bind(diffOps);

  // Log operations
  getCommitLog = logOps.getCommitLog.bind(logOps);
 getFileHistory = logOps.getFileHistory.bind(logOps);
  blame = logOps.blame.bind(logOps);

  // Merge/Rebase operations
  merge = mergeRebaseOps.merge.bind(mergeRebaseOps);
  rebase = mergeRebaseOps.rebase.bind(mergeRebaseOps);
  getMergeStatus = mergeRebaseOps.getMergeStatus.bind(mergeRebaseOps);
  getRebaseStatus = mergeRebaseOps.getRebaseStatus.bind(mergeRebaseOps);
  abortMerge = mergeRebaseOps.abortMerge.bind(mergeRebaseOps);
  abortRebase = mergeRebaseOps.abortRebase.bind(mergeRebaseOps);
}
