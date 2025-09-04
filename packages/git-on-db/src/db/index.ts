import { getPackageJsonFolder } from "@utils";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import os from "os";
import path from "path";

const client = new Bun.SQL({
  // Required for SQLite
  // adapter: "sqlite",
  filename: ":memory:", //path.resolve(os.tmpdir(),"sqlite.db"), // or ":memory:" for in-memory database

  // SQLite-specific access modes
  readonly: false, // Open in read-only mode
  create: true, // Create database if it doesn't exist
  readwrite: true, // Allow read and write operations

  // SQLite data handling
  strict: true, // Enable strict mode for better type safety
  safeIntegers: false, // Use BigInt for integers exceeding JS number range

  // Callbacks
  onconnect: (client) => {
    console.log("SQLite database opened");
  },
  onclose: (client) => {
    console.log("SQLite database closed");
  },
});

export function initDB() {
  const gitInternalsDB = drizzle({ client });
  console.log("Running database migrations...");
  return getPackageJsonFolder()
    .then((packageJsonFolder) => {
      return migrate(gitInternalsDB, { migrationsFolder: path.resolve(packageJsonFolder, "migrations") });
    })
    .then(() => {
      console.log("Database migrations completed.");
      return gitInternalsDB;
    });
}
