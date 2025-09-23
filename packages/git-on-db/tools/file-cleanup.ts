#!/usr/bin/env node

import type { TFolderPath } from "@shared/types";
import { cleanupFiles } from "@shared/utils/cleanup-files";

const USAGE = `usage: file-cleanup <folder> [ext1,ext2,…]

example:
  file-cleanup ./dist tmp,log
`;

const root = process.argv[2] as TFolderPath;
if (!root) {
  console.error(USAGE);
  process.exit(1);
}

const exts = (process.argv[3] ?? "tmp") // default: .tmp
  .split(",")
  .map((e) => (e.startsWith(".") ? e.slice(1) : e))
  .map((e) => e.toLowerCase());

// Launch the cleanup
cleanupFiles(root, exts).catch((err) => {
  console.error(err);
  process.exit(1);
});
