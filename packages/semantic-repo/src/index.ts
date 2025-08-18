/**
 * Ultra high-performance semantic-repo main entry point
 * Elysia + Bun server with BullMQ workers
 */

import { cors } from "@elysiajs/cors";
import { graphqlYoga } from "@elysiajs/graphql-yoga";
import { swagger } from "@elysiajs/swagger";
import { Queue } from "bullmq";
import { Elysia } from "elysia";
import { Redis } from "ioredis";
import pino from "pino";
import { RestApiController } from "./controllers/rest-api";
import { EntityRepository } from "./repositories/entity-repository";
import { GroupRepository } from "./repositories/group-repository";
import { LaneRepository } from "./repositories/lane-repository";
import { EntityService } from "./services/entity-service";
import { GroupService } from "./services/group-service";
import { LaneService } from "./services/lane-service";
import { FileSystemStorage } from "./storage/file-system";
import logger from "./utils/logger";

// Configuration
const config = {
	storage: {
		basePath: process.env.STORAGE_PATH || ".semantic",
		maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760"), // 10MB
		compression: process.env.COMPRESSION !== "false",
	},
	api: {
		port: parseInt(process.env.PORT || "3000"),
		host: process.env.HOST || "0.0.0.0",
		cors: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
		rateLimit: {
			windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || "900000"), // 15 minutes
			max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
		},
	},
	workers: {
		enabled: process.env.WORKERS_ENABLED !== "false",
		concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5"),
		retryAttempts: parseInt(process.env.WORKER_RETRIES || "3"),
		queues: {
			cache: "cache-queue",
			indexing: "indexing-queue",
			cleanup: "cleanup-queue",
		},
	},
	redis: {
		host: process.env.REDIS_HOST || "localhost",
		port: parseInt(process.env.REDIS_PORT || "6379"),
		password: process.env.REDIS_PASSWORD,
		db: parseInt(process.env.REDIS_DB || "0"),
	},
};

// Initialize Redis connection
const redis = new Redis({
	host: config.redis.host,
	port: config.redis.port,
	password: config.redis.password,
	db: config.redis.db,
	maxRetriesPerRequest: 3,
	retryDelayOnFailover: 100,
});

// Initialize BullMQ queues
const cacheQueue = new Queue(config.workers.queues.cache, {
	connection: redis,
});
const indexingQueue = new Queue(config.workers.queues.indexing, {
	connection: redis,
});
const cleanupQueue = new Queue(config.workers.queues.cleanup, {
	connection: redis,
});

// Initialize storage
const storage = new FileSystemStorage(config.storage.basePath);

// Initialize repositories
const entityRepository = new EntityRepository(storage);
const groupRepository = new GroupRepository(storage);
const laneRepository = new LaneRepository(storage);

// Initialize services
const entityService = new EntityService(entityRepository);
const groupService = new GroupService(groupRepository);
const laneService = new LaneService(laneRepository, entityRepository);

// Initialize Elysia app
const app = new Elysia({
	name: "semantic-repo",
	serve: {
		static: process.env.STATIC_PATH || "./public",
	},
});

// Add CORS
app.use(
	cors({
		origin: config.api.cors,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
		allowedHeaders: ["Content-Type", "Authorization"],
	}),
);

// Add Swagger documentation
app.use(
	swagger({
		documentation: {
			info: {
				title: "Semantic Repo API",
				version: "1.0.0",
				description: "Ultra high-performance semantic repository API",
			},
			tags: [
				{ name: "entities", description: "Entity management" },
				{ name: "groups", description: "Group management" },
				{ name: "lanes", description: "Lane management" },
			],
		},
	}),
);

// Add REST API controller
const restApiController = new RestApiController(
	app,
	entityService,
	groupService,
	laneService,
	cacheQueue,
	indexingQueue,
	cleanupQueue,
);

// Health check endpoint
app.get("/health", async () => {
	const health = {
		status: "ok",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		memory: process.memoryUsage(),
		redis: "unknown",
	};

	// Check Redis connection
	try {
		await redis.ping();
		health.redis = "connected";
	} catch (error) {
		health.redis = "disconnected";
	}

	return health;
});

// Graceful shutdown
process.on("SIGTERM", async () => {
	logger.info("SIGTERM received, shutting down gracefully");

	// Close BullMQ queues
	await cacheQueue.close();
	await indexingQueue.close();
	await cleanupQueue.close();

	// Close Redis connection
	await redis.quit();

	// Close server
	process.exit(0);
});

process.on("SIGINT", async () => {
	logger.info("SIGINT received, shutting down gracefully");

	// Close BullMQ queues
	await cacheQueue.close();
	await indexingQueue.close();
	await cleanupQueue.close();

	// Close Redis connection
	await redis.quit();

	// Close server
	process.exit(0);
});

// Start server
async function startServer() {
	try {
		// Initialize storage directories
		await storage.initialize();

		// Start server
		app.listen(config.api.port, config.api.host);

		logger.info(
			`Server started on http://${config.api.host}:${config.api.port}`,
		);
		logger.info(
			`Swagger documentation available at http://${config.api.host}:${config.api.port}/swagger`,
		);
		logger.info(
			`Health check available at http://${config.api.host}:${config.api.port}/health`,
		);
	} catch (error) {
		logger.error("Failed to start server", { error });
		process.exit(1);
	}
}

// Export for testing
export {
	app,
	config,
	storage,
	entityRepository,
	groupRepository,
	laneRepository,
	entityService,
	groupService,
	laneService,
	cacheQueue,
	indexingQueue,
	cleanupQueue,
	redis,
};

// Start server if this file is run directly
if (import.meta.main) {
	startServer();
}
