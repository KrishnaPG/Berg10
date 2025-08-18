/**
 * Ultra high-performance logging configuration using pino
 */

import { randomUUID } from "crypto";
import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";

const logger = pino({
	level: process.env.LOG_LEVEL || "info",
	transport: isDevelopment
		? {
				target: "pino-pretty",
				options: {
					colorize: true,
					translateTime: "HH:MM:ss",
					ignore: "pid,hostname",
				},
			}
		: undefined,
	formatters: {
		level: (label: string) => ({ level: label }),
		bindings: () => ({
			pid: process.pid,
			hostname: undefined,
		}),
	},
	timestamp: pino.stdTimeFunctions.isoTime,
	redact: {
		paths: ["password", "token", "secret", "key", "authorization"],
		censor: "[REDACTED]",
	},
	serializers: {
		err: pino.stdSerializers.err,
		req: pino.stdSerializers.req,
		res: pino.stdSerializers.res,
	},
	base: {
		service: "semantic-repo",
		version: process.env.npm_package_version || "1.0.0",
		instance: randomUUID(),
	},
});

export default logger;

export const createChildLogger = (name: string) =>
	logger.child({ component: name });
