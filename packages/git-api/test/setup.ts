import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';

// Test directory setup
const TEST_DIR = join(process.cwd(), '.tmp', 'test-repos');

beforeAll(async () => {
  // Create test directory
  await mkdir(TEST_DIR, { recursive: true });
});

afterAll(async () => {
  // Clean up test directory
  await rm(TEST_DIR, { recursive: true, force: true });
});

export { TEST_DIR };