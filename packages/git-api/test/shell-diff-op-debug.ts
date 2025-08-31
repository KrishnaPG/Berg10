/**
 * Simple test script to validate DiffOperations functionality
 * Run from packages/git-api directory
 */
import os from "os";
import path from "path";
import { ShellBackend } from "../src/services/drivers/shell";
import type { TPath } from "../src/services/types";

async function testDiffOperations() {
  console.log("🧪 Testing DiffOperations...");

  try {
    // Use current directory as test repo
    const repoPath = path.resolve(process.cwd()) as TPath;
    const backend = new ShellBackend();

    console.log(`📁 Testing with repo: ${repoPath}`);

    // Open the repository
    const repo = await backend.open(repoPath);

    console.log("✅ Repository opened successfully");

    // Test diffWorktree (staged vs working directory)
    console.log("\n🔍 Testing diffWorktree...");
    const worktreeDiff = await repo.diffWorktree();
    console.log(`📊 Worktree diff: ${worktreeDiff.length} diffs found`);
    if (worktreeDiff.length > 0) {
      console.log(`📈 Files changed: ${worktreeDiff[0].files.length}`);
      console.log(`➕ Additions: ${worktreeDiff[0].stats.total_additions}`);
      console.log(`➖ Deletions: ${worktreeDiff[0].stats.total_deletions}`);
    }

    // Test diffIndex (HEAD vs index/staged)
    console.log("\n🔍 Testing diffIndex...");
    const indexDiff = await repo.diffIndex();
    console.log(`📊 Index diff: ${indexDiff.length} diffs found`);
    if (indexDiff.length > 0) {
      console.log(`📈 Files changed: ${indexDiff[0].files.length}`);
      console.log(`➕ Additions: ${indexDiff[0].stats.total_additions}`);
      console.log(`➖ Deletions: ${indexDiff[0].stats.total_deletions}`);
    }

    // Test getCommitDiff for latest commit
    console.log("\n🔍 Testing getCommitDiff...");
    const commits = await repo.listCommits({ maxCount: 1 });
    if (commits.length > 0) {
      const latestCommit = commits[0];
      const commitDiff = await repo.getCommitDiff(latestCommit.sha);
      console.log(`📊 Commit diff for ${latestCommit.sha.substring(0, 8)}:`);
      console.log(`📈 Files changed: ${commitDiff.files.length}`);
      console.log(`➕ Additions: ${commitDiff.stats.total_additions}`);
      console.log(`➖ Deletions: ${commitDiff.stats.total_deletions}`);

      // Show first few files
      commitDiff.files.slice(0, 3).forEach((file) => {
        console.log(`  📄 ${file.filename} (${file.status}): +${file.additions}/-${file.deletions}`);
      });
    }

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", (error as Error).message);
    process.exit(1);
  }
}

// Run the test
testDiffOperations();
