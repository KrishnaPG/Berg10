/**
 * Ultra high-performance error handling utilities
 * Custom error classes for semantic-repo
 */

export class SemanticRepoError extends Error {
	constructor(
		public code: string,
		public message: string,
		public statusCode: number,
		public details?: any
	) {
		super(message);
		this.name = 'SemanticRepoError';
	}
}

export class ValidationError extends SemanticRepoError {
	constructor(field: string, message: string) {
		super('VALIDATION_ERROR', message, 400, { field });
		this.name = 'ValidationError';
	}
}

export class NotFoundError extends SemanticRepoError {
	constructor(resource: string, id: string) {
		super('NOT_FOUND', `${resource} not found: ${id}`, 404, { resource, id });
		this.name = 'NotFoundError';
	}
}

export class ConflictError extends SemanticRepoError {
	constructor(resource: string, id: string, message?: string) {
		super('CONFLICT', message || `${resource} conflict: ${id}`, 409, { resource, id });
		this.name = 'ConflictError';
	}
}

export class InternalServerError extends SemanticRepoError {
	constructor(message: string, details?: any) {
		super('INTERNAL_ERROR', message, 500, details);
		this.name = 'InternalServerError';
	}
}

export class ServiceUnavailableError extends SemanticRepoError {
	constructor(message: string, details?: any) {
		super('SERVICE_UNAVAILABLE', message, 503, details);
		this.name = 'ServiceUnavailableError';
	}
}

export function isSemanticRepoError(error: any): error is SemanticRepoError {
	return error instanceof SemanticRepoError;
}

export function createErrorFromUnknown(error: unknown): SemanticRepoError {
	if (isSemanticRepoError(error)) {
		return error;
	}

	if (error instanceof Error) {
		return new InternalServerError(error.message, { originalError: error });
	}

	if (typeof error === 'string') {
		return new InternalServerError(error);
	}

	return new InternalServerError('An unknown error occurred', { originalError: error });
}