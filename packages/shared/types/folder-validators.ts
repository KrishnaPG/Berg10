// folderBehaviour.ts
import { type TSchema, Type } from "@sinclair/typebox";
import fs from "fs-extra";

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
  brand: B,
  behavior: TFolderBehavior,
  extraCheck?: (path: string) => Promise<void>,
): TSchema & { static: unknown } {
  return Type.Unsafe({
    type: "string",
    [Symbol.for("TypeBox.Kind")]: `${brand}:${behavior}`, // helps TypeBox introspection
    async $check(value: unknown) {
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
  });
}
