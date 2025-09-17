#!/usr/bin/env bun
import { Command } from "commander";
import type { IRunContext } from "./run-context";

export type TParsedCliArgs = Partial<IRunContext>

/**
 * Parse raw CLI arguments using Commander.
 * Returns undefined for missing flags; no defaults or validation here.
 * Help is auto-generated.
 */
export function parseCliArgs(): TParsedCliArgs {
  const program = new Command()
    .name("git-shell-to-parquet")
    .description("Convert Git repo to Parquet for Berg10")
    .version("1.0.0");

  program
    .option("-u, --user-home <path>", "Target home directory")
    .option("-t, --templ-dir <path>", "Template folder path")
    .option("-b, --berg-name <name>", "Berg name")
    .option("-a, --abort-prev-sync", "Clear checkpoints and progress to restart sync")
    .helpOption("-h, --help", "Show help")
    .addHelpText(
      "after",
      "\nExamples:\n  bun git-shell-to-parquet.ts --abort-prev-sync\n  bun git-shell-to-parquet.ts -u ~/custom -t ./my-template"
    );

  const opts = program.parse(process.argv).opts();

  // return only valid/defined options
  return Object.fromEntries(
    Object.entries(opts).filter(([, v]) => v !== undefined),
  );
}
