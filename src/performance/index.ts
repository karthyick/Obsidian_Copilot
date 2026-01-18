/**
 * Performance Module Index
 * Exports all performance optimization components for easy imports
 */

// Core performance orchestrator
export { PerformanceOrchestrator, performanceOrchestrator } from './orchestrator';
export type {
  PerformanceConfig,
  OptimizedLLMRequest,
  OptimizedLLMResponse,
  PerformanceReport
} from './orchestrator';

// Caching system
export { PerformanceCache, llmResponseCache, contextCache } from './cache';
export type {
  CacheEntry,
  CacheOptions,
  CacheStats
} from './cache';

// Performance monitoring
export { PerformanceMonitor, performanceMonitor } from './monitor';
export type {
  PerformanceMetric,
  PerformanceAlert,
  PerformanceProfile,
  SystemMetrics
} from './monitor';

// Retry system with circuit breaker
export { RetrySystem, CircuitBreaker, retrySystem } from './retry';
export type {
  RetryOptions,
  RetryResult,
  CircuitBreakerOptions,
  CircuitState
} from './retry';

// Context optimization
export { OptimizedContextBuilder, optimizedContextBuilder } from './optimizedContextBuilder';
export type {
  ContextChunk,
  ContextBuildOptions,
  ProcessedContext
} from './optimizedContextBuilder';

// Token management
export { AdaptiveTokenManager, adaptiveTokenManager } from './tokenManager';
export type {
  ModelCapabilities,
  TokenUsageStats,
  TokenOptimizationResult,
  AdaptiveTokenConfig
} from './tokenManager';

// Batch processing
export { BatchProcessor, createLLMBatchProcessor } from './batchProcessor';
export type {
  BatchRequest,
  BatchOptions,
  BatchMetrics,
  BatchResult
} from './batchProcessor';

// Response compression
export { ResponseCompressor, responseCompressor } from './compression';
export type {
  CompressionOptions,
  CompressionResult,
  DecompressionResult
} from './compression';

/**
 * Initialize performance system with recommended settings
 */
export function initializePerformanceSystem(config?: {
  enableCaching?: boolean;
  enableContextOptimization?: boolean;
  enableTokenOptimization?: boolean;
  enableBatching?: boolean;
  enableRetry?: boolean;
  enableMonitoring?: boolean;
}): PerformanceOrchestrator {
  const defaultConfig = {
    enableCaching: true,
    enableContextOptimization: true,
    enableTokenOptimization: true,
    enableBatching: false, // Disabled by default
    enableRetry: true,
    enableMonitoring: true,
    maxCacheSizeMB: 100,
    cacheTTL: 30 * 60 * 1000, // 30 minutes
    contextOptimizationThreshold: 16000,
    tokenOptimizationThreshold: 8000,
    ...config
  };

  return new PerformanceOrchestrator(defaultConfig);
}

/**
 * Quick performance optimization for a single LLM request
 */
export async function optimizeLLMRequest(
  messages: any[],
  systemPrompt: string,
  provider: string,
  modelId: string,
  options?: any
): Promise<any> {
  return await performanceOrchestrator.processRequest({
    messages,
    systemPrompt,
    provider: provider as any,
    modelId,
    options
  });
}

/**
 * Get comprehensive performance report
 */
export async function getPerformanceReport(): Promise<PerformanceReport> {
  return await performanceOrchestrator.generatePerformanceReport();
}

/**
 * Clear all performance caches
 */
export async function clearPerformanceCaches(): Promise<void> {
  await performanceOrchestrator.clearCaches();
}

/**
 * Get performance system status
 */
export function getPerformanceStatus() {
  return performanceOrchestrator.getSystemStatus();
}