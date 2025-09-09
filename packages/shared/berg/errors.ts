// Custom Error Types
export class RepoSyncInProgress extends Error {
  constructor(message: string, cause?: ErrorOptions) {
    super(message, cause); // Call the parent Error constructor
    this.name = "RepoSyncInProgress"; // Set a specific name for the error
    // Ensure correct prototype chain for instanceof checks after transpilation
    Object.setPrototypeOf(this, RepoSyncInProgress.prototype);
  }
}