/**
 * Debug driver for ShellBackend
 * This file can be run directly with `bun run shell-debug-driver.ts` to manually debug the code
 */

import { mkdir, rm, writeFile } from "fs/promises";
import os from "os";
import { resolve } from "path";
import { ShellBackend } from "../src/services/drivers/shell";
import { asBranch, asCommitMessage, asPath, asSha, type TPath } from "../src/services/types/branded.types";

async function runDebug() {
  console.log("Starting ShellBackend debug session...");

  // Create test directory
  const testDir: TPath = resolve(os.tmpdir(), "shell-debug-test") as TPath;
  console.log(`Creating test directory: ${testDir}`);

  try {
    // Clean up any existing test directory
    await rm(testDir, { recursive: true, force: true });

    // Create new test directory
    await mkdir(testDir, { recursive: true });

    // Initialize backend
    const backend = new ShellBackend();
    console.log("ShellBackend instance created");

    // Test 1: Initialize repository
    console.log("\n--- Test 1: Initialize repository ---");
    await backend.init(testDir, { defaultBranch: "main" });
    console.log("Repository initialized");

    // Test 2: Open repository
    console.log("\n--- Test 2: Open repository ---");
    await backend.open(testDir);
    console.log("Repository opened");

    // Test 3: Get repository details
    console.log("\n--- Test 3: Get repository details ---");
    try {
      const repoDetails = await backend.getRepository();
      console.log("Repository details:", repoDetails);
    } catch (error) {
      console.log("getRepository not implemented yet:", (error as Error).message);
    }

    // Test 4: Create a file and add to index
    console.log("\n--- Test 4: Create file and add to index ---");
    const testFile = resolve(testDir, "test.txt");
    await writeFile(testFile, "Hello, World!");
    console.log("Test file created");

    await backend.addToIndex(testDir, "test.txt" as TPath);
    console.log("File added to index");

    // Test 5: List refs (branches)
    console.log("\n--- Test 5: List branches ---");
    try {
      const refs = await backend.listRefs("branch");
      console.log(`Found ${refs.length} branches:`);
      refs.forEach((ref) => {
        console.log(`  - ${ref.name}`);
      });
    } catch (error) {
      console.log("listRefs error:", (error as Error).message);
    }

    // Test 6: Create branch
    console.log("\n--- Test 6: Create branch ---");
    try {
      await backend.createBranch(asBranch("feature-branch"), asSha("HEAD"));
      console.log("Branch created");
    } catch (error) {
      console.log("createBranch error:", (error as Error).message);
    }

    // Test 7: List refs again
    console.log("\n--- Test 7: List branches after creation ---");
    try {
      const refs = await backend.listRefs("branch");
      console.log(`Found ${refs.length} branches:`);
      refs.forEach((ref) => {
        console.log(`  - ${ref.name}`);
      });
    } catch (error) {
      console.log("listRefs error:", (error as Error).message);
    }

    // Test 8: Create tag
    console.log("\n--- Test 8: Create tag ---");
    try {
      await backend.createTag("v1.0.0" as any, asSha("HEAD"));
      console.log("Tag created");
    } catch (error) {
      console.log("createTag error:", (error as Error).message);
    }

    // Test 9: List tags
    console.log("\n--- Test 9: List tags ---");
    try {
      const refs = await backend.listRefs("tag");
      console.log(`Found ${refs.length} tags:`);
      refs.forEach((ref) => {
        console.log(`  - ${ref.name}`);
      });
    } catch (error) {
      console.log("listRefs error:", (error as Error).message);
    }

    // Test 10: Get commit log
    console.log("\n--- Test 10: Get commit log ---");
    try {
      const logResult = await backend.getCommitLog({
        per_page: 10,
      });
      console.log(`Found ${logResult.items.length} commits`);
    } catch (error) {
      console.log("getCommitLog error:", (error as Error).message);
    }

    // Test 11: Reset
    console.log("\n--- Test 11: Reset ---");
    try {
      await backend.reset(asSha("HEAD"), "hard");
      console.log("Reset completed");
    } catch (error) {
      console.log("reset error:", (error as Error).message);
    }

    // Test 12: Revert
    console.log("\n--- Test 12: Revert ---");
    try {
      const revertResult = await backend.revert(asSha("HEAD"));
      console.log("Revert result:", revertResult);
    } catch (error) {
      console.log("revert error:", (error as Error).message);
    }

    // Test 13: Stage patch
    console.log("\n--- Test 13: Stage patch ---");
    try {
      await backend.stagePatch(asPath("test.txt"), "This is a patch");
      console.log("Patch staged");
    } catch (error) {
      console.log("stagePatch error:", (error as Error).message);
    }

    // Test 14: Merge
    console.log("\n--- Test 14: Merge ---");
    try {
      const mergeResult = await backend.merge(asBranch("feature-branch"));
      console.log("Merge result:", mergeResult);
    } catch (error) {
      console.log("merge error:", (error as Error).message);
    }

    // Test 15: Rebase
    console.log("\n--- Test 15: Rebase ---");
    try {
      const rebaseResult = await backend.rebase(asBranch("feature-branch"));
      console.log("Rebase result:", rebaseResult);
    } catch (error) {
      console.log("rebase error:", (error as Error).message);
    }

    // Test 16: Abort rebase
    console.log("\n--- Test 16: Abort rebase ---");
    try {
      await backend.abortRebase(asBranch("feature-branch"));
      console.log("Rebase aborted");
    } catch (error) {
      console.log("abortRebase error:", (error as Error).message);
    }

    // Test 17: Update repository
    console.log("\n--- Test 17: Update repository ---");
    try {
      const updateResult = await backend.updateRepository({
        description: "Updated description",
      });
      console.log("Repository updated:", updateResult);
    } catch (error) {
      console.log("updateRepository not implemented yet:", (error as Error).message);
    }

    // Test 18: Delete repository
    console.log("\n--- Test 18: Delete repository ---");
    try {
      await backend.deleteRepository();
      console.log("Repository deleted");
    } catch (error) {
      console.log("deleteRepository not implemented yet:", (error as Error).message);
    }

    // Test 19: Close backend
    console.log("\n--- Test 19: Close backend ---");
    await backend.close();
    console.log("Backend closed");

    // Clean up
    // await rm(testDir, { recursive: true, force: true });
    console.log("\n--- All tests completed! ---");
  } catch (error) {
    console.error((error as Error).message);

    // Uncomment to Clean up
    // try {
    //   await rm(testDir, { recursive: true, force: true });
    // } catch (cleanupError) {
    //   console.error("Error during cleanup:", cleanupError);
    // }
  }
}

// Run the debug function
runDebug().catch(console.error);
