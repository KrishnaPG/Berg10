import { describe, it, expect } from 'bun:test';
import { ShellBackend } from '../src/services/drivers/shell';

describe('Shell Backend', () => {
  it('should create ShellBackend instance', () => {
    const backend = new ShellBackend();
    expect(backend).toBeDefined();
    expect(typeof backend).toBe('object');
  });
  
  it('should have all required methods', () => {
    const backend = new ShellBackend();
    
    // Repository operations
    expect(backend.init).toBeDefined();
    expect(backend.clone).toBeDefined();
    expect(backend.open).toBeDefined();
    expect(backend.close).toBeDefined();
    expect(backend.listRepositories).toBeDefined();
    expect(backend.getRepository).toBeDefined();
    expect(backend.updateRepository).toBeDefined();
    expect(backend.deleteRepository).toBeDefined();
    expect(backend.getCurrentBackend).toBeDefined();
    
    // Ref operations
    expect(backend.listRefs).toBeDefined();
    expect(backend.getRef).toBeDefined();
    expect(backend.createRef).toBeDefined();
    expect(backend.deleteRef).toBeDefined();
    expect(backend.renameRef).toBeDefined();
    expect(backend.createBranch).toBeDefined();
    expect(backend.createTag).toBeDefined();
    expect(backend.updateRef).toBeDefined();
    
    // Commit operations
    expect(backend.listCommits).toBeDefined();
    expect(backend.getCommit).toBeDefined();
    expect(backend.createCommit).toBeDefined();
    expect(backend.updateCommitMessage).toBeDefined();
    expect(backend.revert).toBeDefined();
    expect(backend.reset).toBeDefined();
    
    // Tree operations
    expect(backend.listFiles).toBeDefined();
    expect(backend.getBlob).toBeDefined();
    expect(backend.createTree).toBeDefined();
    expect(backend.createBlob).toBeDefined();
    expect(backend.getFileContents).toBeDefined();
    expect(backend.createOrUpdateFile).toBeDefined();
    expect(backend.deleteFile).toBeDefined();
    
    // Index operations
    expect(backend.getIndex).toBeDefined();
    expect(backend.addToIndex).toBeDefined();
    expect(backend.removeFromIndex).toBeDefined();
    expect(backend.updateIndex).toBeDefined();
    expect(backend.stagePatch).toBeDefined();
    expect(backend.discardWorktree).toBeDefined();
    
    // Stash operations
    expect(backend.listStashes).toBeDefined();
    expect(backend.saveStash).toBeDefined();
    expect(backend.applyStash).toBeDefined();
    expect(backend.dropStash).toBeDefined();
    
    // Diff operations
    expect(backend.diffCommits).toBeDefined();
    expect(backend.diffIndex).toBeDefined();
    expect(backend.diffWorktree).toBeDefined();
    expect(backend.getCommitDiff).toBeDefined();
    
    // Log operations
    expect(backend.getCommitLog).toBeDefined();
    expect(backend.getFileHistory).toBeDefined();
    expect(backend.blame).toBeDefined();
    
    // Merge/Rebase operations
    expect(backend.merge).toBeDefined();
    expect(backend.rebase).toBeDefined();
    expect(backend.getMergeStatus).toBeDefined();
    expect(backend.getRebaseStatus).toBeDefined();
    expect(backend.abortMerge).toBeDefined();
    expect(backend.abortRebase).toBeDefined();
  });
});