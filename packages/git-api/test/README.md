# Git API Test Suite

This directory contains tests for the Git API backend implementations.

## Test Structure

- `setup.ts` - Test setup and teardown utilities
- `simple-test.test.ts` - Basic test to verify the test framework
- `isogit-backend.test.ts` - Comprehensive tests for the ISOGitBackend implementation

## Running Tests

To run the tests, use the following command from the `packages/git-api` directory:

```bash
bun test
```

## Test Organization

Tests are organized by functionality:

1. **Repository Operations** - Tests for initializing, opening, and managing repositories
2. **File Operations** - Tests for adding, updating, and removing files
3. **Commit Operations** - Tests for creating and managing commits
4. **Branch Operations** - Tests for branch creation and management
5. **Rollback Operations** - Tests for revert and reset functionality
6. **Merge/Rebase Operations** - Tests for merging and rebasing branches
7. **Index Operations** - Tests for staging and index management

## Test Environment

Tests create temporary repositories in the `.tmp/test-repos` directory, which is automatically cleaned up after tests run.

## Debugging

For manual debugging, you can use the debug drivers:

### ISOGit Backend Debugging
```bash
bun run test/debug-driver.ts
```

This will run through all the major functionality of the ISOGitBackend step by step, allowing you to debug any issues.

### Shell Backend Debugging
```bash
bun run test/shell-debug-driver.ts
```

This will run through all the major functionality of the ShellBackend step by step, allowing you to debug any issues.