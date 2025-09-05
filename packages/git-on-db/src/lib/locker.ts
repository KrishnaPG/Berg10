import { constants } from "node:fs";
import { open, readFile, unlink, writeFile } from "node:fs/promises";

export class Locker {
  private fd: any = null; // FileHandle from fs/promises
  private isLocked = false;

  constructor(private file: string) {}

  async acquire(): Promise<void> {
    if (this.isLocked) {
      throw new Error("Lock already acquired");
    }

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 100; // ms

    while (retryCount < maxRetries) {
      try {
        // Try to create the lock file exclusively (fails if exists)
        this.fd = await open(this.file, "wx+");

        // Write our PID to the lock file
        await writeFile(this.file, String(process.pid), "utf8");

        this.isLocked = true;
        return; // Success!
      } catch (error: any) {
        // Clean up any partial state
        await this.safeCleanup();

        if (error.code === "EEXIST") {
          // Lock file exists, check if it's stale
          try {
            const existingPidStr = await readFile(this.file, "utf8");
            const existingPid = parseInt(existingPidStr.trim());

            // Validate PID
            if (isNaN(existingPid) || existingPid <= 0) {
              // Invalid PID in lock file, remove it and retry
              try {
                await unlink(this.file);
              } catch (unlinkError: any) {
                if (unlinkError.code !== "ENOENT") {
                  throw unlinkError;
                }
              }
              retryCount++;
              await this.delay(retryDelay);
              continue;
            }

            // Check if the process is still alive
            try {
              process.kill(existingPid, 0);
              // Process is alive, lock is held
              throw new Error(`Lock held by process ${existingPid}`);
            } catch (killError: any) {
              if (killError.code === "ESRCH") {
                // Process is dead, remove stale lock and retry
                try {
                  await unlink(this.file);
                } catch (unlinkError: any) {
                  if (unlinkError.code !== "ENOENT") {
                    throw unlinkError;
                  }
                  // File was already removed by someone else
                }
                retryCount++;
                await this.delay(retryDelay);
              } else {
                // Other error (permissions, etc.)
                throw new Error(`Failed to check process ${existingPid}: ${killError.message}`);
              }
            }
          } catch (readError: any) {
            if (readError.code === "ENOENT") {
              // File was removed between check and read, retry immediately
              retryCount++;
              continue;
            }
            throw new Error(`Failed to read lock file: ${readError.message}`);
          }
        } else {
          // Other file system error
          throw new Error(`Failed to create lock file: ${error.message}`);
        }
      }
    }

    throw new Error("Failed to acquire lock after maximum retries");
  }

  async release(): Promise<void> {
    if (!this.isLocked) {
      return;
    }

    await this.safeCleanup();
    this.isLocked = false;
  }

  private async safeCleanup(): Promise<void> {
    // Close file handle if open
    if (this.fd !== null) {
      try {
        await this.fd.close();
      } catch (error) {
        // Ignore close errors - file might already be closed
      } finally {
        this.fd = null;
      }
    }

    // Remove lock file
    try {
      await unlink(this.file);
    } catch (error: any) {
      // Ignore if file doesn't exist
      if (error.code !== "ENOENT") {
        // Log but don't throw for cleanup operations
        console.warn(`Warning: Failed to remove lock file ${this.file}: ${error.message}`);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  get isAcquired(): boolean {
    return this.isLocked;
  }
}
