/**
 * Request Batching System
 * Provides intelligent batching of LLM requests to optimize throughput
 * and reduce API call overhead.
 */

import { LLMMessage } from "../types";
import { performanceMonitor } from "./monitor";
import { retrySystem } from "./retry";

export interface BatchRequest<T = any> {
  id: string;
  messages: LLMMessage[];
  systemPrompt: string;
  provider: string;
  options?: any;
  priority: number;
  timestamp: number;
  resolve: (result: T) => void;
  reject: (error: Error) => void;
  signal?: AbortSignal;
}

export interface BatchOptions {
  /** Maximum number of requests in a batch */
  maxBatchSize: number;
  /** Maximum time to wait before processing batch (ms) */
  maxWaitTime: number;
  /** Minimum batch size before processing */
  minBatchSize: number;
  /** Enable priority-based processing */
  enablePriorityQueuing: boolean;
  /** Maximum concurrent batches */
  maxConcurrentBatches: number;
  /** Enable adaptive batching based on system load */
  enableAdaptiveBatching: boolean;
}

export interface BatchMetrics {
  totalBatches: number;
  averageBatchSize: number;
  averageWaitTime: number;
  averageProcessingTime: number;
  throughput: number;
  queueSize: number;
  activeQueues: number;
}

export interface BatchResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  requestId: string;
  batchId: string;
  processingTime: number;
}

/**
 * Intelligent request batching processor with adaptive sizing and priority queuing
 */
export class BatchProcessor<T = any> {
  private queues = new Map<string, BatchRequest<T>[]>();
  private activeBatches = new Map<string, Promise<void>>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  private metrics: BatchMetrics = {
    totalBatches: 0,
    averageBatchSize: 0,
    averageWaitTime: 0,
    averageProcessingTime: 0,
    throughput: 0,
    queueSize: 0,
    activeQueues: 0,
  };

  private defaultOptions: BatchOptions = {
    maxBatchSize: 10,
    maxWaitTime: 1000, // 1 second
    minBatchSize: 2,
    enablePriorityQueuing: true,
    maxConcurrentBatches: 3,
    enableAdaptiveBatching: true,
  };

  private processingTimes: number[] = [];
  private batchSizes: number[] = [];
  private waitTimes: number[] = [];

  constructor(
    private processor: (requests: BatchRequest<T>[]) => Promise<BatchResult<T>[]>,
    private options: Partial<BatchOptions> = {}
  ) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Add a request to the batch queue
   */
  async enqueue(
    messages: LLMMessage[],
    systemPrompt: string,
    provider: string,
    priority: number = 0,
    options?: any,
    signal?: AbortSignal
  ): Promise<T> {
    const requestId = this.generateRequestId();
    const queueKey = this.getQueueKey(provider);

    return new Promise<T>((resolve, reject) => {
      const request: BatchRequest<T> = {
        id: requestId,
        messages,
        systemPrompt,
        provider,
        options,
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
        signal,
      };

      // Check if request is already aborted
      if (signal?.aborted) {
        reject(new Error('Request aborted'));
        return;
      }

      // Setup abort handler
      if (signal) {
        signal.addEventListener('abort', () => {
          this.removeRequest(queueKey, requestId);
          reject(new Error('Request aborted'));
        });
      }

      this.addToQueue(queueKey, request);

      performanceMonitor.recordMetric('batch_request_queued', 1, 'count', {
        provider,
        priority: priority.toString(),
        queueSize: this.getQueueSize(queueKey).toString(),
      });
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue key for grouping requests
   */
  private getQueueKey(provider: string): string {
    // Group by provider for now, could be extended to include model, etc.
    return provider;
  }

  /**
   * Add request to appropriate queue
   */
  private addToQueue(queueKey: string, request: BatchRequest<T>): void {
    if (!this.queues.has(queueKey)) {
      this.queues.set(queueKey, []);
    }

    const queue = this.queues.get(queueKey)!;

    if (this.options.enablePriorityQueuing) {
      // Insert in priority order (higher priority first)
      const insertIndex = queue.findIndex(req => req.priority < request.priority);
      if (insertIndex === -1) {
        queue.push(request);
      } else {
        queue.splice(insertIndex, 0, request);
      }
    } else {
      queue.push(request);
    }

    this.updateMetrics();
    this.scheduleProcessing(queueKey);
  }

  /**
   * Remove request from queue
   */
  private removeRequest(queueKey: string, requestId: string): boolean {
    const queue = this.queues.get(queueKey);
    if (!queue) return false;

    const index = queue.findIndex(req => req.id === requestId);
    if (index === -1) return false;

    queue.splice(index, 1);
    this.updateMetrics();
    return true;
  }

  /**
   * Schedule batch processing
   */
  private scheduleProcessing(queueKey: string): void {
    const queue = this.queues.get(queueKey);
    if (!queue || queue.length === 0) return;

    // Check if we should process immediately
    const shouldProcessImmediately =
      queue.length >= this.options.maxBatchSize ||
      (this.options.enableAdaptiveBatching && this.shouldProcessAdaptively(queueKey));

    if (shouldProcessImmediately) {
      this.processBatch(queueKey);
      return;
    }

    // Clear existing timer
    const existingTimer = this.batchTimers.get(queueKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.processBatch(queueKey);
    }, this.getAdaptiveWaitTime(queueKey));

    this.batchTimers.set(queueKey, timer);
  }

  /**
   * Determine if batch should be processed adaptively
   */
  private shouldProcessAdaptively(queueKey: string): boolean {
    if (!this.options.enableAdaptiveBatching) return false;

    const queue = this.queues.get(queueKey);
    if (!queue) return false;

    // Check system load
    const activeCount = this.activeBatches.size;
    const systemLoad = activeCount / this.options.maxConcurrentBatches;

    // Check average processing time
    const avgProcessingTime = this.getAverageProcessingTime();

    // Check queue age
    const oldestRequest = queue[queue.length - 1]; // Oldest is at the end for priority queue
    const queueAge = Date.now() - oldestRequest.timestamp;

    // Process if:
    // - System load is low and we have some requests
    // - Queue is getting old
    // - Processing is fast and queue size is reasonable
    return (
      (systemLoad < 0.5 && queue.length >= this.options.minBatchSize) ||
      queueAge > this.options.maxWaitTime * 0.8 ||
      (avgProcessingTime < 500 && queue.length >= this.options.minBatchSize)
    );
  }

  /**
   * Get adaptive wait time based on system conditions
   */
  private getAdaptiveWaitTime(queueKey: string): number {
    if (!this.options.enableAdaptiveBatching) {
      return this.options.maxWaitTime;
    }

    const queue = this.queues.get(queueKey);
    const queueSize = queue?.length || 0;
    const systemLoad = this.activeBatches.size / this.options.maxConcurrentBatches;
    const avgProcessingTime = this.getAverageProcessingTime();

    // Reduce wait time if:
    // - Queue is filling up
    // - System load is low
    // - Processing is fast
    let waitTime = this.options.maxWaitTime;

    // Queue size factor
    const queueFactor = Math.max(0.3, 1 - (queueSize / this.options.maxBatchSize));
    waitTime *= queueFactor;

    // System load factor
    const loadFactor = Math.max(0.5, 1 - systemLoad);
    waitTime *= loadFactor;

    // Processing time factor
    if (avgProcessingTime > 0) {
      const speedFactor = Math.min(2, 1000 / avgProcessingTime);
      waitTime /= speedFactor;
    }

    return Math.max(100, Math.min(waitTime, this.options.maxWaitTime));
  }

  /**
   * Process a batch of requests
   */
  private async processBatch(queueKey: string): Promise<void> {
    const queue = this.queues.get(queueKey);
    if (!queue || queue.length === 0) return;

    // Check concurrent batch limit
    if (this.activeBatches.size >= this.options.maxConcurrentBatches) {
      // Reschedule for later
      setTimeout(() => this.processBatch(queueKey), 100);
      return;
    }

    // Clear timer
    const timer = this.batchTimers.get(queueKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(queueKey);
    }

    // Extract batch
    const batchSize = Math.min(queue.length, this.options.maxBatchSize);
    const batch = queue.splice(0, batchSize);

    if (batch.length === 0) return;

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Calculate wait times
    const waitTimes = batch.map(req => startTime - req.timestamp);
    this.waitTimes.push(...waitTimes);
    if (this.waitTimes.length > 1000) {
      this.waitTimes = this.waitTimes.slice(-1000);
    }

    const profileId = performanceMonitor.startProfile('batch_processing', {
      batchId,
      batchSize: batch.length,
      provider: queueKey,
    });

    // Track active batch
    const batchPromise = this.executeBatch(batchId, batch);
    this.activeBatches.set(batchId, batchPromise);

    try {
      await batchPromise;
    } finally {
      this.activeBatches.delete(batchId);
      performanceMonitor.endProfile(profileId);

      // Record metrics
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      this.batchSizes.push(batch.length);

      if (this.processingTimes.length > 1000) {
        this.processingTimes = this.processingTimes.slice(-1000);
      }
      if (this.batchSizes.length > 1000) {
        this.batchSizes = this.batchSizes.slice(-1000);
      }

      performanceMonitor.recordMetric('batch_processing_time', processingTime, 'ms', {
        batchId,
        batchSize: batch.length.toString(),
        provider: queueKey,
      });

      this.updateMetrics();

      // Process remaining queue if any
      if (queue.length > 0) {
        setImmediate(() => this.scheduleProcessing(queueKey));
      }
    }
  }

  /**
   * Execute a batch of requests
   */
  private async executeBatch(batchId: string, batch: BatchRequest<T>[]): Promise<void> {
    try {
      // Filter out aborted requests
      const activeRequests = batch.filter(req => !req.signal?.aborted);

      if (activeRequests.length === 0) {
        return;
      }

      // Execute batch using retry system
      const results = await retrySystem.executeApiCall(
        () => this.processor(activeRequests),
        'batch_processor',
        'process_batch'
      );

      // Resolve individual requests
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const request = activeRequests.find(req => req.id === result.requestId);

        if (request) {
          if (result.success) {
            request.resolve(result.result!);
          } else {
            request.reject(result.error || new Error('Batch processing failed'));
          }
        }
      }

      performanceMonitor.recordMetric('batch_processing_success', 1, 'count', {
        batchId,
        batchSize: activeRequests.length.toString(),
      });

    } catch (error) {
      // Reject all requests in the batch
      batch.forEach(req => {
        if (!req.signal?.aborted) {
          req.reject(error instanceof Error ? error : new Error('Batch processing failed'));
        }
      });

      performanceMonitor.recordError('batch_processing_failed', error instanceof Error ? error : new Error(String(error)), {
        batchId,
        batchSize: batch.length,
      });

      throw error;
    }
  }

  /**
   * Get average processing time
   */
  private getAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) return 0;
    return this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  /**
   * Update batch metrics
   */
  private updateMetrics(): void {
    const totalQueueSize = Array.from(this.queues.values()).reduce(
      (total, queue) => total + queue.length,
      0
    );

    this.metrics = {
      totalBatches: this.batchSizes.length,
      averageBatchSize: this.batchSizes.length > 0
        ? this.batchSizes.reduce((a, b) => a + b, 0) / this.batchSizes.length
        : 0,
      averageWaitTime: this.waitTimes.length > 0
        ? this.waitTimes.reduce((a, b) => a + b, 0) / this.waitTimes.length
        : 0,
      averageProcessingTime: this.getAverageProcessingTime(),
      throughput: this.calculateThroughput(),
      queueSize: totalQueueSize,
      activeQueues: this.queues.size,
    };
  }

  /**
   * Calculate throughput (requests per second)
   */
  private calculateThroughput(): number {
    // Count batches processed in the last minute
    const recentBatches = this.batchSizes.length; // This is a simplification
    return recentBatches / 60; // per second
  }

  /**
   * Get current queue size for a provider
   */
  private getQueueSize(queueKey: string): number {
    return this.queues.get(queueKey)?.length || 0;
  }

  /**
   * Get batch metrics
   */
  getMetrics(): BatchMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get detailed queue status
   */
  getQueueStatus(): Record<string, {
    queueSize: number;
    oldestRequestAge: number;
    averagePriority: number;
    activeBatch: boolean;
  }> {
    const status: Record<string, any> = {};

    for (const [queueKey, queue] of this.queues.entries()) {
      const now = Date.now();
      const oldestRequest = queue.length > 0 ? queue[queue.length - 1] : null;
      const averagePriority = queue.length > 0
        ? queue.reduce((sum, req) => sum + req.priority, 0) / queue.length
        : 0;

      status[queueKey] = {
        queueSize: queue.length,
        oldestRequestAge: oldestRequest ? now - oldestRequest.timestamp : 0,
        averagePriority,
        activeBatch: Array.from(this.activeBatches.keys()).some(batchId => batchId.includes(queueKey)),
      };
    }

    return status;
  }

  /**
   * Clear all queues
   */
  clear(): void {
    // Reject all pending requests
    for (const queue of this.queues.values()) {
      queue.forEach(req => req.reject(new Error('Batch processor cleared')));
    }

    // Clear data structures
    this.queues.clear();
    this.activeBatches.clear();

    // Clear timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    // Reset metrics arrays
    this.processingTimes.length = 0;
    this.batchSizes.length = 0;
    this.waitTimes.length = 0;

    this.updateMetrics();
  }

  /**
   * Update batch options
   */
  updateOptions(options: Partial<BatchOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): BatchOptions {
    return { ...this.options };
  }
}

/**
 * Create a batch processor for LLM requests
 */
export function createLLMBatchProcessor<T>(
  processor: (requests: BatchRequest<T>[]) => Promise<BatchResult<T>[]>,
  options?: Partial<BatchOptions>
): BatchProcessor<T> {
  return new BatchProcessor(processor, options);
}