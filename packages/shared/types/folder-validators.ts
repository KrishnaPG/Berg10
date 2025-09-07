// folderBehaviour.ts
import { Static, type TSchema, Type } from "@sinclair/typebox";
import fs from "fs-extra";
import type { Branded } from "./branded.types";

export type TFolderBehavior = "FolderPath" | "ExistingFolderPath" | "EnsuredFolderPath";

/* internal helpers */
const dirExists = (p: string) =>
  fs.stat(p).then(
    (s) => s.isDirectory(),
    () => false,
  );
const ensureDir = (p: string) => fs.ensureDir(p);

/**
 * Returns a TypeBox schema that validates a string as a folder path
 * and optionally enforces existence or creates the directory.
 * The returned value is already cast to the branded type `B`.
 */
export function folder<B extends string>(
  brand: string,
  behavior: TFolderBehavior,
  extraCheck?: (path: string) => Promise<void>,
): TSchema & Branded<B, "FolderSchema"> {
  const raw = {
    type: "string",
    [Symbol.for("TypeBox.Kind")]: `${brand}:${behavior}`, // helps TypeBox introspection
    async check(value: unknown) {
      if (typeof value !== "string") return { error: "Expected string" };

      switch (behavior) {
        case "FolderPath":
          break; // only syntax, nothing to do
        case "ExistingFolderPath":
          if (!(await dirExists(value))) return { error: "Directory does not exist" };
          break;
        case "EnsuredFolderPath":
          await ensureDir(value);
          break;
      }

      if (extraCheck) {
        try {
          await extraCheck(value);
        } catch (e: unknown) {
          return { error: (e as Error).message };
        }
      }
      return { value }; // cast happens at call-site via static type
    },
  };
  return Type.Unsafe(raw) as TSchema & Branded<B, "FolderSchema">;
}
