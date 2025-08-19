import app from "./api";
import { SemanticRepoManager } from "./semantic-repo-manager";

// Create and initialize the semantic repo manager
const repoManager = new SemanticRepoManager("./semantic-repo");
repoManager.initialize();

// Start background processing
repoManager.startBackgroundProcessing();

// Handle graceful shutdown
process.on("SIGINT", () => {
	console.log("Shutting down gracefully...");
	repoManager.stopBackgroundProcessing();
	repoManager.close();
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log("Shutting down gracefully...");
	repoManager.stopBackgroundProcessing();
	repoManager.close();
	process.exit(0);
});

// Start the API server
console.log("🚀 Semantic Content Management System starting...");
