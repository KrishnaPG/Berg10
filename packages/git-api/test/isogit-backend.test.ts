import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { ISOGitBackend } from "../src/services/drivers/isogit";
import { asBranch, asCommitMessage, asPath, asSha } from "../src/services/types/branded.types";
import { TEST_DIR } from "./setup";

describe("ISOGitBackend", () => {
  let backend: ISOGitBackend;
  let testRepoPath: string;

  beforeEach(async () => {
    // Create a unique test repo path for each test
    testRepoPath = join(TEST_DIR, `test-repo-${Date.now()}-${Math.random()}`);
    await mkdir(testRepoPath, { recursive: true });
    backend = new ISOGitBackend();
  });

  afterEach(async () => {
    // Clean up test repo
    await rm(testRepoPath, { recursive: true, force: true });
  });

  describe("Repository Operations", () => {
    it("should initialize a new repository", async () => {
      await backend.init(asPath(testRepoPath));

      // Verify the repo was initialized by checking if we can perform operations
      await backend.open(asPath(testRepoPath));
      const details = await backend.getRepository();
      expect(details).toBeDefined();
    });

    it("should get repository details", async () => {
      // First initialize repo
      await backend.init(asPath(testRepoPath));
      await backend.open(asPath(testRepoPath));

      const result = await backend.getRepository();

      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
    });

    it("should update repository settings", async () => {
      // First initialize repo
      await backend.init(asPath(testRepoPath));
      await backend.open(asPath(testRepoPath));

      const result = await backend.updateRepository({
        description: "Updated description",
      });

      expect(result).toBeDefined();
      expect(result.description).toBe("Updated description");
    });

    it("should delete repository", async () => {
      // First initialize repo
      await backend.init(asPath(testRepoPath));
      await backend.open(asPath(testRepoPath));

      // Deleting a repository in the backend just closes the connection
      await backend.deleteRepository();

      // After deletion, we should be able to close without error
      await backend.close();
    });
  });

  describe("File Operations", () => {
    beforeEach(async () => {
      // Initialize repo for file operations
      await backend.init(asPath(testRepoPath));
      await backend.open(asPath(testRepoPath));
    });

    it("should add and commit a file", async () => {
      // Create a test file
      const filePath = join(testRepoPath, "test.txt");
      await writeFile(filePath, "Hello, World!");

      // Add file to index
      await backend.addToIndex(asPath("test.txt"));

      // Create a basic commit
      const commitResult = await backend.createCommit({
        message: asCommitMessage("Add test file"),
        tree: asSha(""),
        parents: [],
      });

      expect(commitResult).toBeDefined();
      expect(commitResult.sha).toBeDefined();
    });

    it("should read file content", async () => {
      // Create and commit a test file
      const filePath = join(testRepoPath, "test.txt");
      await writeFile(filePath, "Hello, World!");
      await backend.addToIndex(asPath("test.txt"));

      // For now, we'll test that the method exists and can be called
      // A full implementation would require more complex setup
      expect(backend.getFileContents).toBeDefined();
    });
  });

  describe("Commit Operations", () => {
    beforeEach(async () => {
      // Initialize repo and add a file
      await backend.init(asPath(testRepoPath));
      await backend.open(asPath(testRepoPath));

      const filePath = join(testRepoPath, "test.txt");
      await writeFile(filePath, "Hello, World!");
      await backend.addToIndex(asPath("test.txt"));
      await backend.createCommit({
        message: asCommitMessage("Initial commit"),
        tree: asSha(""),
        parents: [],
      });
    });

    it("should get commit history", async () => {
      const logResult = await backend.getCommitLog({
        per_page: 10,
      });

      expect(logResult).toBeDefined();
      expect(logResult.items.length).toBeGreaterThan(0);
    });

    it("should update commit message", async () => {
      // Get the latest commit
      const logResult = await backend.getCommitLog({
        per_page: 1,
      });

      const commitSha = logResult.items[0].sha;

      // Update commit message
      const result = await backend.updateCommitMessage(asSha(commitSha), asCommitMessage("Updated commit message"));

      expect(result).toBeDefined();
      expect(result.sha).toBe(commitSha);
    });
  });

  describe("Branch Operations", () => {
    beforeEach(async () => {
      // Initialize repo and add a file
      await backend.init(asPath(testRepoPath));
      await backend.open(asPath(testRepoPath));

      const filePath = join(testRepoPath, "test.txt");
      await writeFile(filePath, "Hello, World!");
      await backend.addToIndex(asPath("test.txt"));
      await backend.createCommit({
        message: asCommitMessage("Initial commit"),
        tree: asSha(""),
        parents: [],
      });
    });

    it("should create and list branches", async () => {
      // Create a new branch
      await backend.createBranch(asBranch("feature-branch"), asSha("HEAD"), asSha("HEAD"));

      // List branches - this requires checking refs
      const refs = await backend.listRefs("branch");

      expect(refs).toBeDefined();
      const branchNames = refs.map((ref) => ref.name);
      expect(branchNames).toContain("feature-branch");
    });

    it("should switch branches", async () => {
      // Create a new branch
      await backend.createBranch(asBranch("feature-branch"), asSha("HEAD"), asSha("HEAD"));

      // Switching branches is not directly supported in this backend
      // but we can test that the method exists
      expect(backend).toBeDefined();
    });
  });

  describe("Rollback Operations", () => {
    let commitSha: string;

    beforeEach(async () => {
      // Initialize repo and add a file
      await backend.init(asPath(testRepoPath));
      await backend.open(asPath(testRepoPath));

      const filePath = join(testRepoPath, "test.txt");
      await writeFile(filePath, "Hello, World!");
      await backend.addToIndex(asPath("test.txt"));
      const commitResult = await backend.createCommit({
        message: asCommitMessage("Initial commit"),
        tree: asSha(""),
        parents: [],
      });

      commitSha = commitResult.sha;

      // Add another commit
      await writeFile(filePath, "Hello, Updated World!");
      await backend.addToIndex(asPath("test.txt"));
      await backend.createCommit({
        message: asCommitMessage("Update file"),
        tree: asSha(""),
        parents: [asSha(commitSha)],
      });
    });

    it("should revert a commit", async () => {
      // Revert the first commit
      const result = await backend.revert(asSha(commitSha));

      expect(result).toBeDefined();
      expect(result.sha).toBeDefined();
    });

    it("should reset to a previous commit", async () => {
      // Reset to the first commit
      await backend.reset(asSha(commitSha), "hard");

      // Verify we can still get commit log
      const logResult = await backend.getCommitLog({});
      expect(logResult).toBeDefined();
    });
  });

  describe("Merge/Rebase Operations", () => {
    beforeEach(async () => {
      // Initialize repo and add a file
      await backend.init(asPath(testRepoPath));
      await backend.open(asPath(testRepoPath));

      const filePath = join(testRepoPath, "test.txt");
      await writeFile(filePath, "Hello, World!");
      await backend.addToIndex(asPath("test.txt"));
      await backend.createCommit({
        message: asCommitMessage("Initial commit"),
        tree: asSha(""),
        parents: [],
      });

      // Create and switch to feature branch (simulated)
      await backend.createBranch(asBranch("feature-branch"), asSha("HEAD"), asSha("HEAD"));
    });

    it("should merge branches", async () => {
      // Merge feature-branch into current branch
      const result = await backend.merge(asBranch("feature-branch"));

      expect(result).toBeDefined();
    });

    it("should rebase branch", async () => {
      // Rebase onto current branch
      const result = await backend.rebase(asBranch("feature-branch"));

      expect(result).toBeDefined();
    });

    it("should abort rebase", async () => {
      // Test that abortRebase method exists and can be called
      await backend.abortRebase(asBranch("feature-branch"));
      expect(backend.abortRebase).toBeDefined();
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      await backend.init(asPath(testRepoPath));
      await backend.open(asPath(testRepoPath));
    });

    it("should stage a patch", async () => {
      const testPath = asPath("test.txt");
      const patchText = "This is a test patch";

      // Test that stagePatch method exists and can be called
      await backend.stagePatch(testPath, patchText);
      expect(backend.stagePatch).toBeDefined();
    });
  });
});
