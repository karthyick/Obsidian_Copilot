/**
 * Advanced Retry System with Exponential Backoff
 * Provides intelligent retry logic for failed LLM requests and network operations
 */

import { performanceMonitor } from "./monitor";

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay in milliseconds */
  baseDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Exponential backoff factor */
  backoffFactor: number;
  /** Add jitter to prevent thundering herd */
  enableJitter: boolean;
  /** Jitter factor (0-1) */
  jitterFactor: number;
  /** Function to determine if an error should trigger a retry */
  shouldRetry: (error: any, attempt: number) => boolean;
  /** Function to execute before each retry */
  onRetry?: (error: any, attempt: number, delay: number) => void;
  /** Function to execute when all retries fail */
  onFailure?: (error: any, totalAttempts: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalDuration: number;
  retryDelays: number[];
}

export interface CircuitBreakerOptions {
  /** Failure threshold before opening circuit */
  failureThreshold: number;
  /** Success threshold before closing circuit */
  successThreshold: number;
  /** Timeout in milliseconds before trying to close circuit */
  timeout: number;
  /** Monitor failure rate over this time window (ms) */
  monitorWindow: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker implementation to prevent cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private failures: number[] = [];

  constructor(private options: CircuitBreakerOptions) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, operationName: string = 'unknown'): Promise<T> {
    if (this.state === 'open') {
      const now = Date.now();
      if (now - this.lastFailureTime < this.options.timeout) {
        throw new Error('Circuit breaker is open');
      } else {
        this.state = 'half-open';
        this.successCount = 0;
      }
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();

      performanceMonitor.recordMetric('circuit_breaker_failure', 1, 'count', {
        operation: operationName,
        state: this.state,
      });

      throw error;
    }
  }

  private recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'closed';
        this.failureCount = 0;
        this.failures = [];
      }
    } else if (this.state === 'closed') {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  private recordFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failures.push(now);

    // Clean old failures outside the monitor window
    this.failures = this.failures.filter(
      time => now - time <= this.options.monitorWindow
    );

    if (this.state === 'half-open') {
      this.state = 'open';
    } else if (this.state === 'closed') {
      this.failureCount++;
      if (this.failures.length >= this.options.failureThreshold) {
        this.state = 'open';
      }
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    recentFailures: number;
  } {
    const now = Date.now();
    const recentFailures = this.failures.filter(
      time => now - time <= this.options.monitorWindow
    ).length;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      recentFailures,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.failures = [];
  }
}

/**
 * Advanced retry system with exponential backoff, jitter, and circuit breaker
 */
export class RetrySystem {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  private defaultOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    enableJitter: true,
    jitterFactor: 0.3,
    shouldRetry: (error, attempt) => this.defaultShouldRetry(error, attempt),
  };

  private defaultCircuitBreakerOptions: CircuitBreakerOptions = {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 60000, // 1 minute
    monitorWindow: 300000, // 5 minutes
  };

  /**
   * Default retry predicate
   */
  private defaultShouldRetry(error: any, attempt: number): boolean {
    // Network errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return true;
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
      return true;
    }

    // HTTP status codes that should be retried
    if (error.response?.status) {
      const status = error.response.status;
      // Retry on server errors (5xx) and too many requests (429)
      if (status >= 500 || status === 429) {
        return true;
      }
    }

    // Rate limit errors
    if (error.message?.includes('rate limit') || error.code === 'RATE_LIMITED') {
      return true;
    }

    // Connection errors
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      return true;
    }

    // Don't retry on client errors (4xx) except 429
    if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }

    // Default: retry up to max attempts for unknown errors
    return attempt < 3;
  }

  /**
   * Calculate delay with exponential backoff and optional jitter
   */
  private calculateDelay(attempt: number, options: RetryOptions): number {
    let delay = Math.min(
      options.baseDelay * Math.pow(options.backoffFactor, attempt - 1),
      options.maxDelay
    );

    if (options.enableJitter) {
      const jitter = delay * options.jitterFactor * Math.random();
      delay = delay + jitter - (delay * options.jitterFactor / 2);
    }

    return Math.max(delay, 0);
  }

  /**
   * Get or create circuit breaker for an operation
   */
  private getCircuitBreaker(operationName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operationName)) {
      this.circuitBreakers.set(
        operationName,
        new CircuitBreaker(this.defaultCircuitBreakerOptions)
      );
    }
    return this.circuitBreakers.get(operationName)!;
  }

  /**
   * Execute a function with retry logic and circuit breaker protection
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    operationName: string = 'unknown_operation',
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const finalOptions: RetryOptions = { ...this.defaultOptions, ...options };
    const circuitBreaker = this.getCircuitBreaker(operationName);

    const startTime = Date.now();
    const retryDelays: number[] = [];
    let lastError: any;

    performanceMonitor.recordMetric('retry_operation_started', 1, 'count', {
      operation: operationName,
    });

    for (let attempt = 1; attempt <= finalOptions.maxAttempts; attempt++) {
      try {
        // Execute with circuit breaker protection
        const result = await circuitBreaker.execute(fn, operationName);

        const duration = Date.now() - startTime;
        performanceMonitor.recordMetric('retry_operation_success', 1, 'count', {
          operation: operationName,
          attempts: attempt.toString(),
        });

        performanceMonitor.recordMetric('retry_operation_duration', duration, 'ms', {
          operation: operationName,
          attempts: attempt.toString(),
        });

        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: duration,
          retryDelays,
        };

      } catch (error) {
        lastError = error;

        performanceMonitor.recordError('retry_operation_attempt_failed', error, {
          operation: operationName,
          attempt,
        });

        // Check if we should retry
        if (attempt === finalOptions.maxAttempts || !finalOptions.shouldRetry(error, attempt)) {
          break;
        }

        // Calculate and apply delay
        const delay = this.calculateDelay(attempt, finalOptions);
        retryDelays.push(delay);

        // Call onRetry callback if provided
        if (finalOptions.onRetry) {
          try {
            finalOptions.onRetry(error, attempt, delay);
          } catch (callbackError) {
            console.warn('Retry callback failed:', callbackError);
          }
        }

        performanceMonitor.recordMetric('retry_operation_delay', delay, 'ms', {
          operation: operationName,
          attempt: attempt.toString(),
        });

        // Wait before retrying
        await this.delay(delay);
      }
    }

    // All retries failed
    const totalDuration = Date.now() - startTime;

    performanceMonitor.recordMetric('retry_operation_failed', 1, 'count', {
      operation: operationName,
      attempts: finalOptions.maxAttempts.toString(),
    });

    performanceMonitor.recordMetric('retry_operation_duration', totalDuration, 'ms', {
      operation: operationName,
      attempts: finalOptions.maxAttempts.toString(),
      success: 'false',
    });

    // Call onFailure callback if provided
    if (finalOptions.onFailure) {
      try {
        finalOptions.onFailure(lastError, finalOptions.maxAttempts);
      } catch (callbackError) {
        console.warn('Failure callback failed:', callbackError);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: finalOptions.maxAttempts,
      totalDuration,
      retryDelays,
    };
  }

  /**
   * Simple wrapper for common LLM API calls
   */
  async executeApiCall<T>(
    apiCall: () => Promise<T>,
    provider: string,
    operation: string,
    customOptions?: Partial<RetryOptions>
  ): Promise<T> {
    const operationName = `${provider}_${operation}`;

    const options: Partial<RetryOptions> = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      onRetry: (error, attempt, delay) => {
        console.warn(`${operationName} failed (attempt ${attempt}), retrying in ${delay}ms:`, error.message);
      },
      ...customOptions,
    };

    const result = await this.executeWithRetry(apiCall, operationName, options);

    if (!result.success) {
      throw result.error;
    }

    return result.result!;
  }

  /**
   * Delay function with promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status for all operations
   */
  getCircuitBreakerStatus(): Record<string, ReturnType<CircuitBreaker['getMetrics']>> {
    const status: Record<string, ReturnType<CircuitBreaker['getMetrics']>> = {};

    for (const [name, breaker] of this.circuitBreakers.entries()) {
      status[name] = breaker.getMetrics();
    }

    return status;
  }

  /**
   * Reset specific circuit breaker
   */
  resetCircuitBreaker(operationName: string): boolean {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      breaker.reset();
      return true;
    }
    return false;
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Configure circuit breaker options for a specific operation
   */
  configureCircuitBreaker(
    operationName: string,
    options: Partial<CircuitBreakerOptions>
  ): void {
    const existingBreaker = this.circuitBreakers.get(operationName);
    if (existingBreaker) {
      // Reset and reconfigure
      existingBreaker.reset();
    }

    const newOptions = { ...this.defaultCircuitBreakerOptions, ...options };
    this.circuitBreakers.set(operationName, new CircuitBreaker(newOptions));
  }

  /**
   * Get retry statistics
   */
  getRetryStatistics(timeRange: number = 60 * 60 * 1000): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageAttempts: number;
    circuitBreakerTrips: number;
    topFailedOperations: Array<{ operation: string; failures: number }>;
  } {
    const retryMetrics = performanceMonitor.getMetricsByPattern(
      /retry_operation/,
      timeRange
    );

    const successMetrics = retryMetrics.filter(m => m.name === 'retry_operation_success');
    const failedMetrics = retryMetrics.filter(m => m.name === 'retry_operation_failed');
    const startedMetrics = retryMetrics.filter(m => m.name === 'retry_operation_started');

    const totalOperations = startedMetrics.length;
    const successfulOperations = successMetrics.length;
    const failedOperations = failedMetrics.length;

    // Calculate average attempts
    const attemptCounts = [...successMetrics, ...failedMetrics]
      .map(m => parseInt(m.tags?.attempts || '1'))
      .filter(a => !isNaN(a));

    const averageAttempts = attemptCounts.length > 0
      ? attemptCounts.reduce((a, b) => a + b, 0) / attemptCounts.length
      : 0;

    // Count failures by operation
    const failuresByOperation = new Map<string, number>();
    failedMetrics.forEach(m => {
      const operation = m.tags?.operation || 'unknown';
      failuresByOperation.set(operation, (failuresByOperation.get(operation) || 0) + 1);
    });

    const topFailedOperations = Array.from(failuresByOperation.entries())
      .map(([operation, failures]) => ({ operation, failures }))
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 10);

    // Count circuit breaker trips
    const circuitBreakerMetrics = performanceMonitor.getMetricsByPattern(
      /circuit_breaker_failure/,
      timeRange
    );

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageAttempts,
      circuitBreakerTrips: circuitBreakerMetrics.length,
      topFailedOperations,
    };
  }
}

/**
 * Global retry system instance
 */
export const retrySystem = new RetrySystem();