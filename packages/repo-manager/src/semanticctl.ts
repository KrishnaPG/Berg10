import { Command } from "commander";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { SemanticRepoManager } from "./semantic-repo-manager";

const program = new Command();

program
	.name("semanticctl")
	.description("CLI for managing the semantic content management system")
	.version("1.0.0");

program
	.command("init")
	.description("Initialize a new semantic repository")
	.argument("<path>", "Path to the semantic repository")
	.action((path) => {
		const repoManager = new SemanticRepoManager(path);
		repoManager.initialize();
		console.log(`Semantic repository initialized at ${path}`);
		repoManager.close();
	});

program
	.command("create-group")
	.description("Create a new semantic group")
	.argument("<name>", "Name of the group")
	.argument("<config>", "Path to the group configuration file")
	.option(
		"-p, --path <path>",
		"Path to the semantic repository",
		"./semantic-repo",
	)
	.action((name, configPath, options) => {
		const repoManager = new SemanticRepoManager(options.path);
		repoManager.initialize();

		try {
			const configContent = readFileSync(configPath, "utf-8");
			const config = JSON.parse(configContent);
			repoManager.createGroup(name, config);
			console.log(`Group '${name}' created successfully`);
		} catch (error) {
			console.error("Error creating group:", error);
		} finally {
			repoManager.close();
		}
	});

program
	.command("list-groups")
	.description("List all semantic groups")
	.option(
		"-p, --path <path>",
		"Path to the semantic repository",
		"./semantic-repo",
	)
	.action(async (options) => {
		const repoManager = new SemanticRepoManager(options.path);
		repoManager.initialize();

		try {
			const groups = await repoManager.listGroups();
			console.log("Semantic groups:");
			groups.forEach((group: string) => console.log(`- ${group}`));
		} catch (error) {
			console.error("Error listing groups:", error);
		} finally {
			repoManager.close();
		}
	});

program
	.command("get-group")
	.description("Get a semantic group configuration")
	.argument("<name>", "Name of the group")
	.option(
		"-p, --path <path>",
		"Path to the semantic repository",
		"./semantic-repo",
	)
	.action((name, options) => {
		const repoManager = new SemanticRepoManager(options.path);
		repoManager.initialize();

		try {
			const group = repoManager.getGroup(name);
			if (group) {
				console.log(JSON.stringify(group, null, 2));
			} else {
				console.error(`Group '${name}' not found`);
			}
		} catch (error) {
			console.error("Error getting group:", error);
		} finally {
			repoManager.close();
		}
	});

program
	.command("update-group")
	.description("Update a semantic group configuration")
	.argument("<name>", "Name of the group")
	.argument("<config>", "Path to the updated group configuration file")
	.option(
		"-p, --path <path>",
		"Path to the semantic repository",
		"./semantic-repo",
	)
	.action((name, configPath, options) => {
		const repoManager = new SemanticRepoManager(options.path);
		repoManager.initialize();

		try {
			const configContent = readFileSync(configPath, "utf-8");
			const config = JSON.parse(configContent);
			repoManager.updateGroup(name, config);
			console.log(`Group '${name}' updated successfully`);
		} catch (error) {
			console.error("Error updating group:", error);
		} finally {
			repoManager.close();
		}
	});

program
	.command("delete-group")
	.description("Delete a semantic group")
	.argument("<name>", "Name of the group")
	.option(
		"-p, --path <path>",
		"Path to the semantic repository",
		"./semantic-repo",
	)
	.action((name, options) => {
		const repoManager = new SemanticRepoManager(options.path);
		repoManager.initialize();

		try {
			repoManager.deleteGroup(name);
			console.log(`Group '${name}' deleted successfully`);
		} catch (error) {
			console.error("Error deleting group:", error);
		} finally {
			repoManager.close();
		}
	});

program
	.command("process")
	.description("Trigger processing for a semantic group")
	.argument("<name>", "Name of the group")
	.argument("<commit>", "Commit SHA to process")
	.option(
		"-p, --path <path>",
		"Path to the semantic repository",
		"./semantic-repo",
	)
	.action((name, commit, options) => {
		const repoManager = new SemanticRepoManager(options.path);
		repoManager.initialize();

		try {
			repoManager.triggerProcessing(name, commit);
			console.log(
				`Processing triggered for group '${name}' with commit '${commit}'`,
			);
		} catch (error) {
			console.error("Error triggering processing:", error);
		} finally {
			repoManager.close();
		}
	});

program
	.command("status")
	.description("Show system status")
	.option(
		"-p, --path <path>",
		"Path to the semantic repository",
		"./semantic-repo",
	)
	.option("-j, --job <jobId>", "Show status for a specific job")
	.action(async (options) => {
		const repoManager = new SemanticRepoManager(options.path);
		repoManager.initialize();

		try {
			if (options.job) {
				const job = await repoManager.getJobStatus(options.job);
				if (job) {
					console.log("Job status:");
					console.log(JSON.stringify(job, null, 2));
				} else {
					console.error(`Job '${options.job}' not found`);
				}
			} else {
				const groups = await repoManager.listGroups();
				console.log(`Semantic repository at ${options.path}`);
				console.log(`Groups: ${groups.length}`);
				console.log(`Queue length: ${await repoManager.getQueueLength()}`);
			}
		} catch (error) {
			console.error("Error getting status:", error);
		} finally {
			repoManager.close();
		}
	});

program
	.command("dev")
	.description("Start development server with background processing")
	.option(
		"-p, --path <path>",
		"Path to the semantic repository",
		"./semantic-repo",
	)
	.option(
		"-i, --interval <ms>",
		"Background processing interval in ms",
		"30000",
	)
	.action((options) => {
		const repoManager = new SemanticRepoManager(options.path);
		repoManager.initialize();

		try {
			console.log(`Starting development server with background processing...`);
			console.log(`Repository path: ${options.path}`);
			console.log(`Processing interval: ${options.interval}ms`);

			// Start background processing
			repoManager.startBackgroundProcessing(parseInt(options.interval));

			// Keep the process running
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.on("data", (key) => {
				if (key[0] === 3) {
					// Ctrl+C
					console.log("Shutting down...");
					repoManager.stopBackgroundProcessing();
					repoManager.close();
					process.exit(0);
				}
			});

			console.log("Press Ctrl+C to stop");
		} catch (error) {
			console.error("Error starting development server:", error);
			repoManager.close();
		}
	});

program.parse();
