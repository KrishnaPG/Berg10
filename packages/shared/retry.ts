/**
 * Enhanced retry utilities for handling transient failures
 * Combines the best features from both retry implementations
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs?: number;
}

export interface RetryContext {
  attempt: number;
  lastError?: Error;
  totalElapsedMs: number;
}

export type RetryableOperation<T> = () => Promise<T>;

export interface IRetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay between retries in milliseconds */
  initialDelay: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay: number;
  /** Backoff multiplier (exponential backoff) */
  backoffMultiplier: number;
  /** Jitter factor to add randomness to delays (0-1) */
  jitter: number;
  /** Retryable error codes */
  retryableErrors: string[];
}

export interface IRetryOptions {
  /** Custom retry configuration */
  config?: Partial<IRetryConfig>;
  /** Custom retry condition */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** On retry callback */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

export interface IRetryResult<T> {
  /** The successful result */
  result: T;
  /** Number of attempts made */
  attempts: number;
  /** Total time spent retrying in milliseconds */
  totalTime: number;
}

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean = true,
    public readonly category: "network" | "filesystem" | "database" | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "RetryableError";
  }
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterMs: 100,
};

export const NETWORK_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 5,
  baseDelayMs: 2000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterMs: 500,
};

export const DATABASE_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 1.5,
  jitterMs: 200,
};

export const FILESYSTEM_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 2,
  baseDelayMs: 100,
  maxDelayMs: 2000,
  backoffMultiplier: 2,
  jitterMs: 50,
};

export const DefaultRetryConfig: IRetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: 0.1,
  retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "ECONNREFUSED", "EPIPE"],
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.baseDelayMs * options.backoffMultiplier ** (attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);

  // Add jitter to prevent thundering herd
  const jitter = options.jitterMs ? (Math.random() - 0.5) * 2 * options.jitterMs : 0;

  return Math.max(0, cappedDelay + jitter);
}

/**
 * Calculate delay with exponential backoff and jitter (using IRetryConfig)
 */
function calculateDelayWithConfig(attempt: number, config: IRetryConfig): number {
  const exponentialDelay = Math.min(config.initialDelay * config.backoffMultiplier ** (attempt - 1), config.maxDelay);
  const jitter = exponentialDelay * config.jitter * (Math.random() - 0.5);
  return Math.max(0, exponentialDelay + jitter);
}

/**
 * Enhanced error detection with multiple strategies
 */
function isRetryableError(error: Error): boolean {
  if (error instanceof RetryableError) {
    return error.retryable;
  }

  // Network errors
  if (
    error.message.includes("ECONNRESET") ||
    error.message.includes("ENOTFOUND") ||
    error.message.includes("ETIMEDOUT") ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("socket hang up") ||
    error.message.includes("EPIPE")
  ) {
    return true;
  }

  // Filesystem temporary errors
  if (
    error.message.includes("EMFILE") ||
    error.message.includes("ENFILE") ||
    error.message.includes("EAGAIN") ||
    error.message.includes("EBUSY") ||
    error.message.includes("ENOENT")
  ) {
    return true;
  }

  // Database temporary errors
  if (
    error.message.includes("database is locked") ||
    error.message.includes("connection lost") ||
    error.message.includes("timeout") ||
    error.message.includes("SQL")
  ) {
    return true;
  }

  return false;
}

/**
 * Categorize error type for better retry strategies
 */
function categorizeError(error: Error): "network" | "filesystem" | "database" | "unknown" {
  if (error instanceof RetryableError) {
    return error.category;
  }

  if (
    error.message.includes("ECONNRESET") ||
    error.message.includes("ENOTFOUND") ||
    error.message.includes("ETIMEDOUT") ||
    error.message.includes("socket hang up") ||
    error.message.includes("ECONNREFUSED")
  ) {
    return "network";
  }

  if (
    error.message.includes("ENOENT") ||
    error.message.includes("EACCES") ||
    error.message.includes("EMFILE") ||
    error.message.includes("EBUSY") ||
    error.message.includes("EAGAIN")
  ) {
    return "filesystem";
  }

  if (
    error.message.includes("database") ||
    error.message.includes("SQL") ||
    error.message.includes("connection") ||
    error.message.includes("timeout")
  ) {
    return "database";
  }

  return "unknown";
}

/**
 * Default retry condition using IRetryConfig
 */
function defaultShouldRetry(error: Error, config: IRetryConfig): boolean {
  const errorWithCode = error as Error & { code?: string };
  return (
    config.retryableErrors.includes(errorWithCode.code || "") ||
    error.message.includes("timeout") ||
    error.message.includes("connection") ||
    isRetryableError(error)
  );
}

/**
 * Enhanced retry with context and callbacks (RetryOptions style)
 */
export async function withRetry<T>(
  operation: RetryableOperation<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS,
  onRetry?: (context: RetryContext) => void | Promise<void>,
): Promise<T> {
  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const errorCategory = categorizeError(lastError);

      // Don't retry if error is not retryable
      if (!isRetryableError(lastError)) {
        throw new RetryableError(`Non-retryable error: ${lastError.message}`, false, errorCategory);
      }

      // Don't retry on last attempt
      if (attempt === options.maxAttempts) {
        throw new RetryableError(
          `Operation failed after ${options.maxAttempts} attempts: ${lastError.message}`,
          false,
          errorCategory,
        );
      }

      const context: RetryContext = {
        attempt,
        lastError,
        totalElapsedMs: Date.now() - startTime,
      };

      // Call retry callback if provided
      if (onRetry) {
        await onRetry(context);
      }

      // Calculate delay and wait
      const delayMs = calculateDelay(attempt, options);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError!;
}

/**
 * Modern retry with result object and flexible configuration (IRetryOptions style)
 */
export async function retry<T>(operation: () => Promise<T>, options: IRetryOptions = {}): Promise<IRetryResult<T>> {
  const config = { ...DefaultRetryConfig, ...options.config };
  const startTime = Date.now();
  let lastError: Error | null = null;

  // Use custom shouldRetry or default
  const shouldRetry = options.shouldRetry || ((error, attempt) => defaultShouldRetry(error, config));

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      const result = await operation();
      return {
        result,
        attempts: attempt,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (!shouldRetry(lastError, attempt) || attempt > config.maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = calculateDelayWithConfig(attempt, config);

      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(lastError, attempt, delay);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Retry with specific configuration
 */
export async function retryWithConfig<T>(
  operation: () => Promise<T>,
  config: Partial<IRetryConfig>,
): Promise<IRetryResult<T>> {
  return retry(operation, { config });
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
): Promise<IRetryResult<T>> {
  return retryWithConfig(operation, { maxRetries, initialDelay });
}

/**
 * Create a retry wrapper function
 */
export function createRetryWrapper(
  options: IRetryOptions = {},
): <T>(operation: () => Promise<T>) => Promise<IRetryResult<T>> {
  return (operation) => retry(operation, options);
}

/**
 * Create a retryable operation wrapper for specific error types
 */
export function createRetryableFileOperation<T>(operation: RetryableOperation<T>): RetryableOperation<T> {
  return () => withRetry(operation, FILESYSTEM_RETRY_OPTIONS);
}

export function createRetryableDatabaseOperation<T>(operation: RetryableOperation<T>): RetryableOperation<T> {
  return () => withRetry(operation, DATABASE_RETRY_OPTIONS);
}

export function createRetryableNetworkOperation<T>(operation: RetryableOperation<T>): RetryableOperation<T> {
  return () => withRetry(operation, NETWORK_RETRY_OPTIONS);
}

/**
 * Circuit breaker implementation for preventing cascading failures
 */
export async function withCircuitBreaker<T>(
  operation: RetryableOperation<T>,
  circuitBreakerKey: string,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS,
): Promise<T> {
  // Simple in-memory circuit breaker state
  const circuitState = circuitBreakerStates.get(circuitBreakerKey) || {
    state: "closed" as "closed" | "open" | "half-open",
    failureCount: 0,
    lastFailureTime: 0,
    nextAttemptTime: 0,
  };

  const now = Date.now();

  // Check circuit breaker state
  if (circuitState.state === "open") {
    if (now < circuitState.nextAttemptTime) {
      throw new RetryableError(
        `Circuit breaker is open for ${circuitBreakerKey}. Next attempt at ${new Date(circuitState.nextAttemptTime).toISOString()}`,
        false,
      );
    } else {
      // Move to half-open state
      circuitState.state = "half-open";
    }
  }

  try {
    const result = await withRetry(operation, options);

    // Success - reset circuit breaker
    circuitState.state = "closed";
    circuitState.failureCount = 0;
    circuitBreakerStates.set(circuitBreakerKey, circuitState);

    return result;
  } catch (error) {
    // Failure - update circuit breaker
    circuitState.failureCount++;
    circuitState.lastFailureTime = now;

    if (circuitState.failureCount >= 5) {
      circuitState.state = "open";
      circuitState.nextAttemptTime = now + 60000; // 1 minute
    }

    circuitBreakerStates.set(circuitBreakerKey, circuitState);
    throw error;
  }
}

// Simple in-memory circuit breaker state storage
const circuitBreakerStates = new Map<
  string,
  {
    state: "closed" | "open" | "half-open";
    failureCount: number;
    lastFailureTime: number;
    nextAttemptTime: number;
  }
>();

/**
 * Utility class for advanced retry scenarios
 */
export class RetryUtil {
  private config: IRetryConfig;

  constructor(config: Partial<IRetryConfig> = {}) {
    this.config = { ...DefaultRetryConfig, ...config };
  }

  /**
   * Execute an operation with retry logic
   */
  async execute<T>(operation: () => Promise<T>, options: IRetryOptions = {}): Promise<IRetryResult<T>> {
    const config = { ...this.config, ...options.config };
    const startTime = Date.now();
    let lastError: Error | null = null;

    const shouldRetry = options.shouldRetry || ((error, attempt) => defaultShouldRetry(error, config));

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        return {
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error as Error;

        if (!shouldRetry(lastError, attempt) || attempt > config.maxRetries) {
          throw lastError;
        }

        const delay = calculateDelayWithConfig(attempt, config);

        if (options.onRetry) {
          options.onRetry(lastError, attempt, delay);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Create a retry wrapper function
   */
  public createWrapper(options: IRetryOptions = {}): <T>(operation: () => Promise<T>) => Promise<IRetryResult<T>> {
    return (operation) => this.execute(operation, options);
  }
}
