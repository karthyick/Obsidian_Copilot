/**
 * Performance Orchestrator
 * Central coordinator for all performance optimization systems including
 * caching, monitoring, retry logic, context optimization, and token management.
 */

import { LLMMessage, AIProvider, LLMUsage } from "../types";
import { llmResponseCache, contextCache } from "./cache";
import { performanceMonitor } from "./monitor";
import { retrySystem } from "./retry";
import { optimizedContextBuilder } from "./optimizedContextBuilder";
import { adaptiveTokenManager } from "./tokenManager";
import { createLLMBatchProcessor, BatchProcessor, BatchRequest, BatchResult } from "./batchProcessor";
import { TelemetryManager } from "../telemetry";

export interface PerformanceConfig {
  /** Enable response caching */
  enableCaching: boolean;
  /** Enable context optimization */
  enableContextOptimization: boolean;
  /** Enable token optimization */
  enableTokenOptimization: boolean;
  /** Enable request batching */
  enableBatching: boolean;
  /** Enable retry logic */
  enableRetry: boolean;
  /** Enable performance monitoring */
  enableMonitoring: boolean;
  /** Maximum cache size in MB */
  maxCacheSizeMB: number;
  /** Cache TTL in milliseconds */
  cacheTTL: number;
  /** Context optimization threshold */
  contextOptimizationThreshold: number;
  /** Token optimization threshold */
  tokenOptimizationThreshold: number;
}

export interface OptimizedLLMRequest {
  messages: LLMMessage[];
  systemPrompt: string;
  provider: AIProvider;
  modelId: string;
  options?: any;
  signal?: AbortSignal;
}

export interface OptimizedLLMResponse {
  content: string;
  usage: LLMUsage;
  metadata: {
    cacheHit: boolean;
    optimized: boolean;
    originalTokens: number;
    finalTokens: number;
    processingTime: number;
    optimizations: string[];
  };
}

export interface PerformanceReport {
  cachePerformance: {
    hitRate: number;
    totalSize: number;
    entryCount: number;
  };
  tokenOptimization: {
    averageSavings: number;
    totalSaved: number;
    costSavings: number;
  };
  contextOptimization: {
    averageCompressionRatio: number;
    processingTime: number;
  };
  systemPerformance: {
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  recommendations: string[];
}

/**
 * Central performance optimization orchestrator
 */
export class PerformanceOrchestrator {
  private config: PerformanceConfig = {
    enableCaching: true,
    enableContextOptimization: true,
    enableTokenOptimization: true,
    enableBatching: false, // Disabled by default due to complexity
    enableRetry: true,
    enableMonitoring: true,
    maxCacheSizeMB: 100,
    cacheTTL: 30 * 60 * 1000, // 30 minutes
    contextOptimizationThreshold: 16000, // Characters
    tokenOptimizationThreshold: 8000, // Tokens
  };

  private batchProcessor?: BatchProcessor<string>;
  private telemetryManager?: TelemetryManager;

  constructor(
    config: Partial<PerformanceConfig> = {},
    telemetryManager?: TelemetryManager
  ) {
    this.config = { ...this.config, ...config };
    this.telemetryManager = telemetryManager;

    if (this.config.enableBatching) {
      this.initializeBatchProcessor();
    }

    if (this.config.enableMonitoring && telemetryManager) {
      performanceMonitor.constructor(telemetryManager);
    }
  }

  /**
   * Initialize batch processor
   */
  private initializeBatchProcessor(): void {
    this.batchProcessor = createLLMBatchProcessor<string>(
      async (requests: BatchRequest<string>[]): Promise<BatchResult<string>[]> => {
        const results: BatchResult<string>[] = [];

        for (const request of requests) {
          try {
            const startTime = Date.now();

            // Process individual request through the full optimization pipeline
            const response = await this.processSingleRequest({
              messages: request.messages,
              systemPrompt: request.systemPrompt,
              provider: request.provider as AIProvider,
              modelId: request.options?.modelId || '',
              options: request.options,
              signal: request.signal,
            });

            results.push({
              success: true,
              result: response.content,
              requestId: request.id,
              batchId: `batch_${Date.now()}`,
              processingTime: Date.now() - startTime,
            });

          } catch (error) {
            results.push({
              success: false,
              error: error instanceof Error ? error : new Error(String(error)),
              requestId: request.id,
              batchId: `batch_${Date.now()}`,
              processingTime: 0,
            });
          }
        }

        return results;
      },
      {
        maxBatchSize: 5,
        maxWaitTime: 2000,
        minBatchSize: 2,
      }
    );
  }

  /**
   * Process an optimized LLM request
   */
  async processRequest(request: OptimizedLLMRequest): Promise<OptimizedLLMResponse> {
    const profileId = performanceMonitor.startProfile('optimized_llm_request', {
      provider: request.provider,
      modelId: request.modelId,
      messageCount: request.messages.length,
    });

    try {
      if (this.config.enableBatching && this.batchProcessor) {
        return await this.processBatchedRequest(request);
      } else {
        return await this.processSingleRequest(request);
      }
    } finally {
      performanceMonitor.endProfile(profileId);
    }
  }

  /**
   * Process request through batch processor
   */
  private async processBatchedRequest(request: OptimizedLLMRequest): Promise<OptimizedLLMResponse> {
    if (!this.batchProcessor) {
      throw new Error('Batch processor not initialized');
    }

    const content = await this.batchProcessor.enqueue(
      request.messages,
      request.systemPrompt,
      request.provider,
      0, // Default priority
      { modelId: request.modelId, ...request.options },
      request.signal
    );

    // For batched requests, we'll provide minimal metadata
    return {
      content,
      usage: { inputTokens: 0, outputTokens: 0 }, // Would need to be calculated
      metadata: {
        cacheHit: false,
        optimized: true,
        originalTokens: 0,
        finalTokens: 0,
        processingTime: 0,
        optimizations: ['batched'],
      },
    };
  }

  /**
   * Process a single request through the full optimization pipeline
   */
  private async processSingleRequest(request: OptimizedLLMRequest): Promise<OptimizedLLMResponse> {
    const startTime = Date.now();
    const optimizations: string[] = [];
    let cacheHit = false;

    // 1. Check cache first
    if (this.config.enableCaching) {
      const cachedResponse = await llmResponseCache.get(
        request.messages,
        request.systemPrompt,
        request.provider
      );

      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);
        return {
          content: parsed.content,
          usage: parsed.usage || { inputTokens: 0, outputTokens: 0 },
          metadata: {
            cacheHit: true,
            optimized: parsed.optimized || false,
            originalTokens: parsed.originalTokens || 0,
            finalTokens: parsed.finalTokens || 0,
            processingTime: Date.now() - startTime,
            optimizations: [...(parsed.optimizations || []), 'cache_hit'],
          },
        };
      }
    }

    // 2. Optimize context if content is large
    let optimizedMessages = request.messages;
    let optimizedSystemPrompt = request.systemPrompt;

    if (this.config.enableContextOptimization) {
      const totalContent = request.messages.map(m => m.content).join(' ') + request.systemPrompt;

      if (totalContent.length > this.config.contextOptimizationThreshold) {
        const contextResult = await optimizedContextBuilder.processContent(
          totalContent,
          request.messages[request.messages.length - 1]?.content // Use last message as query
        );

        if (contextResult.chunks.length > 0) {
          const optimizedContent = contextResult.chunks.map(c => c.content).join('\n');

          // Rebuild messages with optimized content
          if (request.messages.length > 0) {
            optimizedMessages = [{
              role: 'user',
              content: optimizedContent,
            }];
          }

          optimizations.push('context_optimization');
        }
      }
    }

    // 3. Optimize tokens
    let originalTokens = 0;
    let finalTokens = 0;

    if (this.config.enableTokenOptimization) {
      const tokenOptimization = adaptiveTokenManager.optimizeTokenUsage(
        optimizedMessages,
        optimizedSystemPrompt,
        request.provider,
        request.modelId
      );

      originalTokens = tokenOptimization.originalTokens;
      finalTokens = tokenOptimization.optimizedTokens;

      if (tokenOptimization.tokensSaved > 0) {
        // Apply token optimizations (this would need integration with actual LLM services)
        optimizations.push(`token_optimization_saved_${tokenOptimization.tokensSaved}`);
      }
    }

    // 4. Execute the request (this would call the actual LLM service)
    // For now, this is a placeholder - in real implementation, this would call the LLM service
    const mockResponse = await this.executeLLMRequest(
      optimizedMessages,
      optimizedSystemPrompt,
      request.provider,
      request.modelId,
      request.options,
      request.signal
    );

    // 5. Record usage
    if (mockResponse.usage) {
      adaptiveTokenManager.recordUsage(
        request.provider,
        request.modelId,
        mockResponse.usage.inputTokens || 0,
        mockResponse.usage.outputTokens || 0
      );
    }

    // 6. Cache the response
    if (this.config.enableCaching && mockResponse.content) {
      const cacheData = {
        content: mockResponse.content,
        usage: mockResponse.usage,
        optimized: optimizations.length > 0,
        originalTokens,
        finalTokens,
        optimizations,
        timestamp: Date.now(),
      };

      await llmResponseCache.set(
        request.messages,
        request.systemPrompt,
        request.provider,
        JSON.stringify(cacheData),
        this.config.cacheTTL
      );
    }

    const processingTime = Date.now() - startTime;

    performanceMonitor.recordMetric('optimized_request_time', processingTime, 'ms', {
      provider: request.provider,
      optimized: optimizations.length > 0 ? 'true' : 'false',
    });

    return {
      content: mockResponse.content,
      usage: mockResponse.usage || { inputTokens: finalTokens || 0, outputTokens: 0 },
      metadata: {
        cacheHit,
        optimized: optimizations.length > 0,
        originalTokens,
        finalTokens: finalTokens || originalTokens,
        processingTime,
        optimizations,
      },
    };
  }

  /**
   * Mock LLM request execution (placeholder)
   * In real implementation, this would call the appropriate LLM service
   */
  private async executeLLMRequest(
    messages: LLMMessage[],
    systemPrompt: string,
    provider: AIProvider,
    modelId: string,
    options?: any,
    signal?: AbortSignal
  ): Promise<{ content: string; usage?: LLMUsage }> {
    // This is a placeholder implementation
    // In real implementation, this would:
    // 1. Use the retry system for resilience
    // 2. Call the appropriate LLM service (Bedrock, Gemini, Groq)
    // 3. Handle streaming if enabled
    // 4. Return actual response and usage data

    return await retrySystem.executeApiCall(
      async () => {
        // Simulate API call
        if (signal?.aborted) {
          throw new Error('Request aborted');
        }

        // Mock delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // Mock response
        const lastMessage = messages[messages.length - 1];
        const mockContent = `This is a mock response to: ${lastMessage?.content?.slice(0, 100)}...`;

        const inputTokens = adaptiveTokenManager.estimateMessageTokens(messages, systemPrompt, modelId).inputTokens;
        const outputTokens = adaptiveTokenManager.estimateTokens(mockContent, modelId);

        return {
          content: mockContent,
          usage: {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
          },
        };
      },
      provider,
      'chat_completion'
    );
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<PerformanceReport> {
    const cacheStats = llmResponseCache.getStats();
    const contextStats = optimizedContextBuilder.getProcessingStats();
    const tokenStats = adaptiveTokenManager.getUsageStats();
    const systemStats = performanceMonitor.getSystemMetrics();

    const recommendations: string[] = [];

    // Cache recommendations
    if (cacheStats.hitRate < 0.3) {
      recommendations.push('Consider increasing cache TTL or enabling more aggressive caching');
    }

    // Token optimization recommendations
    if (tokenStats.efficiency < 0.5) {
      recommendations.push('Enable more aggressive token optimization to improve efficiency');
    }

    // Context optimization recommendations
    if (contextStats.averageCompressionRatio < 0.7) {
      recommendations.push('Context optimization is working well, consider fine-tuning parameters');
    }

    // Performance recommendations
    if (systemStats.performance.averageResponseTime > 5000) {
      recommendations.push('High response times detected, consider enabling batching or using faster models');
    }

    if (systemStats.errors.rate > 0.05) {
      recommendations.push('High error rate detected, check retry configuration and API limits');
    }

    return {
      cachePerformance: {
        hitRate: cacheStats.hitRate,
        totalSize: cacheStats.totalSize,
        entryCount: cacheStats.totalEntries,
      },
      tokenOptimization: {
        averageSavings: 0, // Would calculate from token optimization metrics
        totalSaved: tokenStats.inputTokens * 0.1, // Rough estimate
        costSavings: tokenStats.estimatedCost * 0.1, // Rough estimate
      },
      contextOptimization: {
        averageCompressionRatio: contextStats.averageCompressionRatio,
        processingTime: contextStats.averageProcessingTime,
      },
      systemPerformance: {
        averageResponseTime: systemStats.performance.averageResponseTime,
        errorRate: systemStats.errors.rate,
        throughput: systemStats.performance.throughput,
      },
      recommendations,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reinitialize batch processor if batching was enabled/disabled
    if (newConfig.enableBatching !== undefined) {
      if (newConfig.enableBatching && !this.batchProcessor) {
        this.initializeBatchProcessor();
      } else if (!newConfig.enableBatching && this.batchProcessor) {
        this.batchProcessor.clear();
        this.batchProcessor = undefined;
      }
    }
  }

  /**
   * Clear all caches and reset state
   */
  async clearCaches(): Promise<void> {
    llmResponseCache.clear();
    contextCache.clear();
    performanceMonitor.reset();

    if (this.batchProcessor) {
      this.batchProcessor.clear();
    }
  }

  /**
   * Get detailed system status
   */
  getSystemStatus(): {
    caching: { enabled: boolean; stats: any };
    batching: { enabled: boolean; stats: any };
    monitoring: { enabled: boolean; stats: any };
    retry: { enabled: boolean; stats: any };
  } {
    return {
      caching: {
        enabled: this.config.enableCaching,
        stats: llmResponseCache.getStats(),
      },
      batching: {
        enabled: this.config.enableBatching,
        stats: this.batchProcessor ? this.batchProcessor.getMetrics() : null,
      },
      monitoring: {
        enabled: this.config.enableMonitoring,
        stats: performanceMonitor.getSystemMetrics(),
      },
      retry: {
        enabled: this.config.enableRetry,
        stats: retrySystem.getRetryStatistics(),
      },
    };
  }
}

/**
 * Global performance orchestrator instance
 */
export const performanceOrchestrator = new PerformanceOrchestrator();