/**
 * Ultra high-performance configuration management for semantic-repo
 * Built with environment variables and type safety
 */

import { config } from "dotenv";
import { z } from "zod";

// Load environment variables
config();

// Configuration schema with Zod validation
const ConfigSchema = z.object({
	// Server configuration
	server: z.object({
		port: z.number().default(3000),
		host: z.string().default("localhost"),
		cors: z.object({
			origin: z.union([z.string(), z.array(z.string())]).default("*"),
			credentials: z.boolean().default(true),
			allowedHeaders: z.array(z.string()).default(["Content-Type", "Authorization"]),
		}),
		graphiql: z.boolean().default(true),
	}),

	// Database configuration
	database: z.object({
		url: z.string().default("md:./semantic-repo.duckdb"),
		pool: z.object({
			min: z.number().default(2),
			max: z.number().default(10),
		}),
	}),

	// Redis configuration
	redis: z.object({
		host: z.string().default("localhost"),
		port: z.number().default(6379),
		password: z.string().optional(),
		db: z.number().default(0),
		tls: z.boolean().default(false),
	}),

	// Logging configuration
	logging: z.object({
		level: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
		pretty: z.boolean().default(true),
		file: z.object({
			enabled: z.boolean().default(true),
			path: z.string().default("./logs/semantic-repo.log"),
			maxSize: z.string().default("10m"),
			maxFiles: z.number().default(5),
		}),
	}),

	// BullMQ configuration
	bullmq: z.object({
		connection: z.object({
			host: z.string().default("localhost"),
			port: z.number().default(6379),
			password: z.string().optional(),
			db: z.number().default(1),
		}),
		defaultJobOptions: z.object({
			removeOnComplete: z.number().default(10),
			removeOnFail: z.number().default(5),
			attempts: z.number().default(3),
			backoff: z.object({
				type: z.enum(["fixed", "exponential"]).default("exponential"),
				delay: z.number().default(2000),
			}),
		}),
	}),

	// Storage configuration
	storage: z.object({
		type: z.enum(["file", "s3", "gcs"]).default("file"),
		path: z.string().default("./data"),
		s3: z.object({
			bucket: z.string().optional(),
			region: z.string().optional(),
			accessKeyId: z.string().optional(),
			secretAccessKey: z.string().optional(),
		}).optional(),
		gcs: z.object({
			bucket: z.string().optional(),
			projectId: z.string().optional(),
			keyFilename: z.string().optional(),
		}).optional(),
	}),

	// Security configuration
	security: z.object({
		jwt: z.object({
			secret: z.string().default("your-secret-key"),
			expiresIn: z.string().default("7d"),
		}),
		rateLimit: z.object({
			enabled: z.boolean().default(true),
			windowMs: z.number().default(900000), // 15 minutes
			max: z.number().default(100), // limit each IP to 100 requests per windowMs
		}),
	}),

	// Performance configuration
	performance: z.object({
		cache: z.object({
			ttl: z.number().default(3600), // 1 hour
			maxSize: z.number().default(1000),
		}),
		compression: z.boolean().default(true),
		etag: z.boolean().default(true),
	}),
});

// Export validated configuration
export const appConfig = ConfigSchema.parse({
	server: {
		port: parseInt(process.env.PORT || "3000"),
		host: process.env.HOST || "localhost",
		cors: {
			origin: process.env.CORS_ORIGIN?.split(",") || "*",
			credentials: process.env.CORS_CREDENTIALS === "true",
			allowedHeaders: process.env.CORS_HEADERS?.split(",") || ["Content-Type", "Authorization"],
		},
		graphiql: process.env.GRAPHIQL === "true",
	},
	database: {
		url: process.env.DATABASE_URL || "md:./semantic-repo.duckdb",
		pool: {
			min: parseInt(process.env.DB_POOL_MIN || "2"),
			max: parseInt(process.env.DB_POOL_MAX || "10"),
		},
	},
	redis: {
		host: process.env.REDIS_HOST || "localhost",
		port: parseInt(process.env.REDIS_PORT || "6379"),
		password: process.env.REDIS_PASSWORD,
		db: parseInt(process.env.REDIS_DB || "0"),
		tls: process.env.REDIS_TLS === "true",
	},
	logging: {
		level: process.env.LOG_LEVEL as any || "info",
		pretty: process.env.LOG_PRETTY !== "false",
		file: {
			enabled: process.env.LOG_FILE_ENABLED !== "false",
			path: process.env.LOG_FILE_PATH || "./logs/semantic-repo.log",
			maxSize: process.env.LOG_FILE_MAX_SIZE || "10m",
			maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || "5"),
		},
	},
	bullmq: {
		connection: {
			host: process.env.REDIS_HOST || "localhost",
			port: parseInt(process.env.REDIS_PORT || "6379"),
			password: process.env.REDIS_PASSWORD,
			db: parseInt(process.env.BULLMQ_REDIS_DB || "1"),
		},
		defaultJobOptions: {
			removeOnComplete: parseInt(process.env.BULLMQ_REMOVE_ON_COMPLETE || "10"),
			removeOnFail: parseInt(process.env.BULLMQ_REMOVE_ON_FAIL || "5"),
			attempts: parseInt(process.env.BULLMQ_ATTEMPTS || "3"),
			backoff: {
				type: (process.env.BULLMQ_BACKOFF_TYPE as any) || "exponential",
				delay: parseInt(process.env.BULLMQ_BACKOFF_DELAY || "2000"),
			},
		},
	},
	storage: {
		type: (process.env.STORAGE_TYPE as any) || "file",
		path: process.env.STORAGE_PATH || "./data",
		s3: process.env.AWS_S3_BUCKET ? {
			bucket: process.env.AWS_S3_BUCKET,
			region: process.env.AWS_REGION,
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		} : undefined,
		gcs: process.env.GCS_BUCKET ? {
			bucket: process.env.GCS_BUCKET,
			projectId: process.env.GCP_PROJECT_ID,
			keyFilename: process.env.GCP_KEY_FILENAME,
		} : undefined,
	},
	security: {
		jwt: {
			secret: process.env.JWT_SECRET || "your-secret-key",
			expiresIn: process.env.JWT_EXPIRES_IN || "7d",
		},
		rateLimit: {
			enabled: process.env.RATE_LIMIT_ENABLED !== "false",
			windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
			max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
		},
	},
	performance: {
		cache: {
			ttl: parseInt(process.env.CACHE_TTL || "3600"),
			maxSize: parseInt(process.env.CACHE_MAX_SIZE || "1000"),
		},
		compression: process.env.COMPRESSION !== "false",
		etag: process.env.ETAG !== "false",
	},
});

// Export configuration type
export type AppConfig = z.infer<typeof ConfigSchema>;

// Export configuration getter for use in other modules
export function getConfig(): AppConfig {
	return appConfig;
}

// Export individual configuration sections
export const serverConfig = appConfig.server;
export const databaseConfig = appConfig.database;
export const redisConfig = appConfig.redis;
export const loggingConfig = appConfig.logging;
export const bullmqConfig = appConfig.bullmq;
export const storageConfig = appConfig.storage;
export const securityConfig = appConfig.security;
export const performanceConfig = appConfig.performance;