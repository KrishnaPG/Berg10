/**
 * Debug driver for ISOGitBackend
 * This file can be run directly with `bun run debug-driver.ts` to manually debug the code
 */

import { ISOGitBackend } from '../src/services/drivers/isogit';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { asSha, asBranch, asPath, asCommitMessage } from '../src/services/types/branded.types';

async function runDebug() {
  console.log('Starting ISOGitBackend debug session...');
  
  // Create test directory
  const testDir = join(process.cwd(), '.tmp', 'debug-test');
  console.log(`Creating test directory: ${testDir}`);
  
  try {
    // Clean up any existing test directory
    await rm(testDir, { recursive: true, force: true });
    
    // Create new test directory
    await mkdir(testDir, { recursive: true });
    
    // Initialize backend
    const backend = new ISOGitBackend();
    console.log('ISOGitBackend instance created');
    
    // Test 1: Initialize repository
    console.log('\n--- Test 1: Initialize repository ---');
    await backend.init(asPath(testDir));
    console.log('Repository initialized');
    
    // Test 2: Open repository
    console.log('\n--- Test 2: Open repository ---');
    await backend.open(asPath(testDir));
    console.log('Repository opened');
    
    // Test 3: Get repository details
    console.log('\n--- Test 3: Get repository details ---');
    const repoDetails = await backend.getRepository();
    console.log('Repository details:', repoDetails);
    
    // Test 4: Create a file and add to index
    console.log('\n--- Test 4: Create file and add to index ---');
    const testFile = join(testDir, 'test.txt');
    await writeFile(testFile, 'Hello, World!');
    console.log('Test file created');
    
    await backend.addToIndex(asPath('test.txt'));
    console.log('File added to index');
    
    // Test 5: Create commit
    console.log('\n--- Test 5: Create commit ---');
    const commitResult = await backend.createCommit({
      message: asCommitMessage('Initial commit'),
      tree: asSha(''),
      parents: []
    });
    console.log('Commit created:', commitResult.sha);
    
    // Test 6: Get commit log
    console.log('\n--- Test 6: Get commit log ---');
    const logResult = await backend.getCommitLog({
      per_page: 10
    });
    console.log(`Found ${logResult.items.length} commits`);
    console.log('Latest commit:', logResult.items[0]?.sha);
    
    // Test 7: Update commit message
    console.log('\n--- Test 7: Update commit message ---');
    if (logResult.items.length > 0) {
      const commitSha = logResult.items[0].sha;
      const updatedCommit = await backend.updateCommitMessage(
        asSha(commitSha), 
        asCommitMessage('Updated commit message')
      );
      console.log('Commit message updated:', updatedCommit.message);
    }
    
    // Test 8: Create branch
    console.log('\n--- Test 8: Create branch ---');
    await backend.createBranch(asBranch('feature-branch'), asSha('HEAD'), asSha('HEAD'));
    console.log('Branch created');
    
    // Test 9: List refs
    console.log('\n--- Test 9: List refs ---');
    const refs = await backend.listRefs('branch');
    console.log(`Found ${refs.length} branches:`);
    refs.forEach(ref => console.log(`  - ${ref.name}`));
    
    // Test 10: Reset
    console.log('\n--- Test 10: Reset ---');
    if (logResult.items.length > 0) {
      const commitSha = logResult.items[0].sha;
      await backend.reset(asSha(commitSha), 'hard');
      console.log('Reset completed');
    }
    
    // Test 11: Revert
    console.log('\n--- Test 11: Revert ---');
    if (logResult.items.length > 0) {
      const commitSha = logResult.items[0].sha;
      const revertResult = await backend.revert(asSha(commitSha));
      console.log('Revert commit created:', revertResult.sha);
    }
    
    // Test 12: Stage patch
    console.log('\n--- Test 12: Stage patch ---');
    await backend.stagePatch(asPath('test.txt'), 'This is a patch');
    console.log('Patch staged');
    
    // Test 13: Merge
    console.log('\n--- Test 13: Merge ---');
    const mergeResult = await backend.merge(asBranch('feature-branch'));
    console.log('Merge result:', mergeResult);
    
    // Test 14: Rebase
    console.log('\n--- Test 14: Rebase ---');
    const rebaseResult = await backend.rebase(asBranch('feature-branch'));
    console.log('Rebase result:', rebaseResult);
    
    // Test 15: Abort rebase
    console.log('\n--- Test 15: Abort rebase ---');
    await backend.abortRebase(asBranch('feature-branch'));
    console.log('Rebase aborted');
    
    // Test 16: Update repository
    console.log('\n--- Test 16: Update repository ---');
    const updateResult = await backend.updateRepository({
      description: 'Updated description'
    });
    console.log('Repository updated:', updateResult.description);
    
    // Test 17: Delete repository
    console.log('\n--- Test 17: Delete repository ---');
    await backend.deleteRepository();
    console.log('Repository deleted');
    
    // Test 18: Close backend
    console.log('\n--- Test 18: Close backend ---');
    await backend.close();
    console.log('Backend closed');
    
    console.log('\n--- All tests completed successfully! ---');
    
  } catch (error) {
    console.error('Error during debug session:', error);
    
    // Clean up
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
  }
}

// Run the debug function
runDebug().catch(console.error);