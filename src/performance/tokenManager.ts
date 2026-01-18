/**
 * Adaptive Token Management System
 * Provides intelligent token counting, management, and optimization
 * based on model capabilities and usage patterns.
 */

import { LLMMessage, AIProvider } from "../types";
import { performanceMonitor } from "./monitor";

export interface ModelCapabilities {
  maxTokens: number;
  inputTokenLimit: number;
  outputTokenLimit: number;
  contextWindowSize: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  averageCharactersPerToken: number;
  supportsStreaming: boolean;
  supportsSystemPrompts: boolean;
  preferredChunkSize?: number;
}

export interface TokenUsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  efficiency: number;
  wastedTokens: number;
}

export interface TokenOptimizationResult {
  originalTokens: number;
  optimizedTokens: number;
  tokensSaved: number;
  compressionRatio: number;
  optimizations: string[];
  estimatedCostSavings: number;
}

export interface AdaptiveTokenConfig {
  /** Enable automatic token optimization */
  enableOptimization: boolean;
  /** Target token utilization percentage */
  targetUtilization: number;
  /** Minimum tokens to reserve for response */
  minResponseTokens: number;
  /** Enable context compression */
  enableCompression: boolean;
  /** Enable intelligent truncation */
  enableIntelligentTruncation: boolean;
  /** Enable cost optimization */
  enableCostOptimization: boolean;
}

/**
 * Model capabilities database
 */
const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  // Claude models
  'anthropic.claude-sonnet-4-20250514-v1:0': {
    maxTokens: 200000,
    inputTokenLimit: 200000,
    outputTokenLimit: 8192,
    contextWindowSize: 200000,
    costPerInputToken: 0.000003, // $3 per 1M input tokens
    costPerOutputToken: 0.000015, // $15 per 1M output tokens
    averageCharactersPerToken: 4,
    supportsStreaming: true,
    supportsSystemPrompts: true,
    preferredChunkSize: 4000,
  },
  'anthropic.claude-3-5-sonnet-20241022-v2:0': {
    maxTokens: 200000,
    inputTokenLimit: 200000,
    outputTokenLimit: 8192,
    contextWindowSize: 200000,
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000015,
    averageCharactersPerToken: 4,
    supportsStreaming: true,
    supportsSystemPrompts: true,
    preferredChunkSize: 4000,
  },
  'anthropic.claude-3-5-haiku-20241022-v1:0': {
    maxTokens: 200000,
    inputTokenLimit: 200000,
    outputTokenLimit: 8192,
    contextWindowSize: 200000,
    costPerInputToken: 0.0000008, // $0.8 per 1M input tokens
    costPerOutputToken: 0.000004, // $4 per 1M output tokens
    averageCharactersPerToken: 4,
    supportsStreaming: true,
    supportsSystemPrompts: true,
    preferredChunkSize: 4000,
  },

  // Gemini models
  'gemini-1.5-pro': {
    maxTokens: 2097152,
    inputTokenLimit: 2097152,
    outputTokenLimit: 8192,
    contextWindowSize: 2097152,
    costPerInputToken: 0.00000125, // $1.25 per 1M input tokens
    costPerOutputToken: 0.000005, // $5 per 1M output tokens
    averageCharactersPerToken: 4,
    supportsStreaming: true,
    supportsSystemPrompts: true,
    preferredChunkSize: 8000,
  },
  'gemini-1.5-flash': {
    maxTokens: 1048576,
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    contextWindowSize: 1048576,
    costPerInputToken: 0.000000075, // $0.075 per 1M input tokens
    costPerOutputToken: 0.0000003, // $0.3 per 1M output tokens
    averageCharactersPerToken: 4,
    supportsStreaming: true,
    supportsSystemPrompts: true,
    preferredChunkSize: 4000,
  },
  'gemini-2.0-flash-exp': {
    maxTokens: 1048576,
    inputTokenLimit: 1048576,
    outputTokenLimit: 8192,
    contextWindowSize: 1048576,
    costPerInputToken: 0, // Free during experimental phase
    costPerOutputToken: 0,
    averageCharactersPerToken: 4,
    supportsStreaming: true,
    supportsSystemPrompts: true,
    preferredChunkSize: 4000,
  },

  // Groq models (using Llama and Mixtral)
  'llama-3.1-70b-versatile': {
    maxTokens: 131072,
    inputTokenLimit: 131072,
    outputTokenLimit: 4096,
    contextWindowSize: 131072,
    costPerInputToken: 0.00000059, // $0.59 per 1M input tokens
    costPerOutputToken: 0.00000079, // $0.79 per 1M output tokens
    averageCharactersPerToken: 4,
    supportsStreaming: true,
    supportsSystemPrompts: true,
    preferredChunkSize: 3000,
  },
  'mixtral-8x7b-32768': {
    maxTokens: 32768,
    inputTokenLimit: 32768,
    outputTokenLimit: 4096,
    contextWindowSize: 32768,
    costPerInputToken: 0.00000024, // $0.24 per 1M input tokens
    costPerOutputToken: 0.00000024, // $0.24 per 1M output tokens
    averageCharactersPerToken: 4,
    supportsStreaming: true,
    supportsSystemPrompts: true,
    preferredChunkSize: 2000,
  },
};

/**
 * Advanced token management and optimization system
 */
export class AdaptiveTokenManager {
  private defaultConfig: AdaptiveTokenConfig = {
    enableOptimization: true,
    targetUtilization: 0.85,
    minResponseTokens: 1000,
    enableCompression: true,
    enableIntelligentTruncation: true,
    enableCostOptimization: true,
  };

  private tokenUsageHistory: Array<{
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    timestamp: number;
  }> = [];

  constructor(private config: Partial<AdaptiveTokenConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Get model capabilities for a specific model
   */
  getModelCapabilities(provider: AIProvider, modelId: string): ModelCapabilities | undefined {
    return MODEL_CAPABILITIES[modelId];
  }

  /**
   * Estimate token count for text
   */
  estimateTokens(text: string, modelId?: string): number {
    const capabilities = modelId ? MODEL_CAPABILITIES[modelId] : null;
    const avgCharsPerToken = capabilities?.averageCharactersPerToken || 4;

    // Basic estimation based on character count
    const baseEstimate = Math.ceil(text.length / avgCharsPerToken);

    // Adjust for special characters and formatting
    const specialChars = (text.match(/[{}[\]().,!?;:'"]/g) || []).length;
    const newlines = (text.match(/\n/g) || []).length;
    const spaces = (text.match(/ +/g) || []).length;

    // Special characters typically use more tokens
    const adjustment = specialChars * 0.2 + newlines * 0.5 + spaces * 0.1;

    return Math.ceil(baseEstimate + adjustment);
  }

  /**
   * Estimate token count for messages
   */
  estimateMessageTokens(messages: LLMMessage[], systemPrompt: string, modelId?: string): {
    inputTokens: number;
    breakdown: { system: number; messages: number; overhead: number };
  } {
    const systemTokens = this.estimateTokens(systemPrompt, modelId);

    let messageTokens = 0;
    for (const message of messages) {
      // Account for role overhead
      const roleTokens = 3; // Approximate overhead for role formatting
      const contentTokens = this.estimateTokens(message.content, modelId);
      messageTokens += roleTokens + contentTokens;
    }

    // Chat format overhead (varies by model)
    const overhead = Math.max(10, messages.length * 2);

    return {
      inputTokens: systemTokens + messageTokens + overhead,
      breakdown: {
        system: systemTokens,
        messages: messageTokens,
        overhead,
      },
    };
  }

  /**
   * Optimize token usage for a request
   */
  optimizeTokenUsage(
    messages: LLMMessage[],
    systemPrompt: string,
    provider: AIProvider,
    modelId: string,
    maxOutputTokens?: number
  ): TokenOptimizationResult {
    const profileId = performanceMonitor.startProfile('token_optimization', {
      provider,
      modelId,
    });

    try {
      const capabilities = this.getModelCapabilities(provider, modelId);
      if (!capabilities) {
        throw new Error(`Unknown model capabilities for ${modelId}`);
      }

      const originalEstimate = this.estimateMessageTokens(messages, systemPrompt, modelId);
      const responseTokens = maxOutputTokens || this.config.minResponseTokens;
      const availableTokens = capabilities.contextWindowSize - responseTokens;
      const optimizations: string[] = [];

      let optimizedMessages = [...messages];
      let optimizedSystemPrompt = systemPrompt;

      // If we're already under the limit, minimal optimization needed
      if (originalEstimate.inputTokens <= availableTokens) {
        performanceMonitor.endProfile(profileId);
        return {
          originalTokens: originalEstimate.inputTokens,
          optimizedTokens: originalEstimate.inputTokens,
          tokensSaved: 0,
          compressionRatio: 1,
          optimizations: [],
          estimatedCostSavings: 0,
        };
      }

      // 1. Compress system prompt
      if (this.config.enableCompression) {
        const compressedSystemPrompt = this.compressText(optimizedSystemPrompt);
        const savedTokens = this.estimateTokens(optimizedSystemPrompt, modelId) -
          this.estimateTokens(compressedSystemPrompt, modelId);

        if (savedTokens > 0) {
          optimizedSystemPrompt = compressedSystemPrompt;
          optimizations.push(`System prompt compression: saved ${savedTokens} tokens`);
        }
      }

      // 2. Optimize message history
      if (this.config.enableIntelligentTruncation) {
        optimizedMessages = this.truncateIntelligently(optimizedMessages, availableTokens, modelId);
        optimizations.push('Intelligent message truncation applied');
      }

      // 3. Compress individual messages
      if (this.config.enableCompression) {
        optimizedMessages = optimizedMessages.map(msg => ({
          ...msg,
          content: this.compressText(msg.content),
        }));
        optimizations.push('Message content compression applied');
      }

      const optimizedEstimate = this.estimateMessageTokens(optimizedMessages, optimizedSystemPrompt, modelId);
      const tokensSaved = originalEstimate.inputTokens - optimizedEstimate.inputTokens;
      const compressionRatio = optimizedEstimate.inputTokens / originalEstimate.inputTokens;

      const costSavings = this.calculateCostSavings(
        originalEstimate.inputTokens,
        optimizedEstimate.inputTokens,
        capabilities.costPerInputToken
      );

      performanceMonitor.recordMetric('token_optimization_savings', tokensSaved, 'count', {
        provider,
        modelId,
        compressionRatio: compressionRatio.toString(),
      });

      return {
        originalTokens: originalEstimate.inputTokens,
        optimizedTokens: optimizedEstimate.inputTokens,
        tokensSaved,
        compressionRatio,
        optimizations,
        estimatedCostSavings: costSavings,
      };

    } finally {
      performanceMonitor.endProfile(profileId);
    }
  }

  /**
   * Simple text compression
   */
  private compressText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove redundant words
      .replace(/\b(very|really|quite|rather|extremely)\s+/gi, '')
      // Replace common phrases with shorter versions
      .replace(/\bin order to\b/gi, 'to')
      .replace(/\bdue to the fact that\b/gi, 'because')
      .replace(/\bas a result of\b/gi, 'from')
      .replace(/\bin the event that\b/gi, 'if')
      // Trim
      .trim();
  }

  /**
   * Intelligently truncate message history
   */
  private truncateIntelligently(
    messages: LLMMessage[],
    targetTokens: number,
    modelId: string
  ): LLMMessage[] {
    if (messages.length === 0) return messages;

    let currentTokens = this.estimateMessageTokens(messages, '', modelId).inputTokens;
    let optimizedMessages = [...messages];

    // Work backwards from second-to-last message
    for (let i = optimizedMessages.length - 2; i >= 0; i--) {
      const messageTokens = this.estimateTokens(optimizedMessages[i].content, modelId);

      if (currentTokens - messageTokens >= targetTokens * 0.8) {
        // Remove this message
        optimizedMessages.splice(i, 1);
        currentTokens -= messageTokens;
      } else {
        // Keep remaining messages
        break;
      }
    }

    // If still too many tokens, truncate the earliest remaining messages
    while (currentTokens > targetTokens && optimizedMessages.length > 1) {
      const removedMessage = optimizedMessages.shift()!;
      const removedTokens = this.estimateTokens(removedMessage.content, modelId);
      currentTokens -= removedTokens;
    }

    return optimizedMessages;
  }

  /**
   * Calculate cost savings
   */
  private calculateCostSavings(
    originalTokens: number,
    optimizedTokens: number,
    costPerToken: number
  ): number {
    const tokensSaved = originalTokens - optimizedTokens;
    return tokensSaved * costPerToken;
  }

  /**
   * Record token usage for analytics
   */
  recordUsage(
    provider: AIProvider,
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): void {
    const capabilities = this.getModelCapabilities(provider, modelId);
    const cost = capabilities
      ? (inputTokens * capabilities.costPerInputToken) + (outputTokens * capabilities.costPerOutputToken)
      : 0;

    this.tokenUsageHistory.push({
      provider,
      model: modelId,
      inputTokens,
      outputTokens,
      cost,
      timestamp: Date.now(),
    });

    // Keep only last 1000 entries
    if (this.tokenUsageHistory.length > 1000) {
      this.tokenUsageHistory = this.tokenUsageHistory.slice(-1000);
    }

    performanceMonitor.recordMetric('token_usage_input', inputTokens, 'count', {
      provider,
      model: modelId,
    });

    performanceMonitor.recordMetric('token_usage_output', outputTokens, 'count', {
      provider,
      model: modelId,
    });

    performanceMonitor.recordMetric('token_cost', cost, 'count', {
      provider,
      model: modelId,
    });
  }

  /**
   * Get usage statistics
   */
  getUsageStats(timeRange: number = 24 * 60 * 60 * 1000): TokenUsageStats {
    const cutoff = Date.now() - timeRange;
    const recentUsage = this.tokenUsageHistory.filter(entry => entry.timestamp > cutoff);

    if (recentUsage.length === 0) {
      return {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        efficiency: 0,
        wastedTokens: 0,
      };
    }

    const inputTokens = recentUsage.reduce((sum, entry) => sum + entry.inputTokens, 0);
    const outputTokens = recentUsage.reduce((sum, entry) => sum + entry.outputTokens, 0);
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = recentUsage.reduce((sum, entry) => sum + entry.cost, 0);

    // Calculate efficiency based on input/output ratio
    const efficiency = outputTokens > 0 ? outputTokens / inputTokens : 0;

    // Estimate wasted tokens (very rough heuristic)
    const wastedTokens = recentUsage
      .filter(entry => entry.inputTokens > 10000) // Large contexts
      .reduce((sum, entry) => sum + Math.max(0, entry.inputTokens * 0.1), 0); // Assume 10% waste

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      efficiency,
      wastedTokens,
    };
  }

  /**
   * Get model recommendations based on usage patterns
   */
  getModelRecommendations(provider: AIProvider): {
    recommended: string;
    reason: string;
    costSavings?: number;
    alternatives: Array<{ model: string; reason: string }>;
  } {
    const recentUsage = this.tokenUsageHistory
      .filter(entry => entry.provider === provider)
      .slice(-50); // Last 50 requests

    if (recentUsage.length === 0) {
      return {
        recommended: '',
        reason: 'No usage history available',
        alternatives: [],
      };
    }

    const avgInputTokens = recentUsage.reduce((sum, entry) => sum + entry.inputTokens, 0) / recentUsage.length;
    const avgOutputTokens = recentUsage.reduce((sum, entry) => sum + entry.outputTokens, 0) / recentUsage.length;
    const totalCost = recentUsage.reduce((sum, entry) => sum + entry.cost, 0);

    // Get all models for this provider
    const availableModels = Object.entries(MODEL_CAPABILITIES)
      .filter(([modelId, _caps]) => {
        // Filter by provider context (rough heuristic)
        if (provider === 'bedrock') return modelId.startsWith('anthropic.');
        if (provider === 'gemini') return modelId.startsWith('gemini-');
        if (provider === 'groq') return modelId.includes('llama') || modelId.includes('mixtral');
        return false;
      });

    if (availableModels.length === 0) {
      return {
        recommended: '',
        reason: 'No models available for provider',
        alternatives: [],
      };
    }

    // Find the most cost-effective model for current usage
    let bestModel = '';
    let bestCost = Infinity;
    const alternatives: Array<{ model: string; reason: string }> = [];

    for (const [modelId, capabilities] of availableModels) {
      const estimatedCost = (avgInputTokens * capabilities.costPerInputToken) +
                          (avgOutputTokens * capabilities.costPerOutputToken);

      // Check if model can handle the context size
      if (avgInputTokens > capabilities.inputTokenLimit) {
        alternatives.push({
          model: modelId,
          reason: `Context too large (needs ${avgInputTokens} tokens, supports ${capabilities.inputTokenLimit})`,
        });
        continue;
      }

      if (estimatedCost < bestCost) {
        if (bestModel) {
          alternatives.push({
            model: bestModel,
            reason: `Higher cost: $${bestCost.toFixed(6)} vs $${estimatedCost.toFixed(6)} per request`,
          });
        }
        bestModel = modelId;
        bestCost = estimatedCost;
      } else {
        alternatives.push({
          model: modelId,
          reason: `Higher cost: $${estimatedCost.toFixed(6)} vs $${bestCost.toFixed(6)} per request`,
        });
      }
    }

    const currentAvgCost = totalCost / recentUsage.length;
    const costSavings = currentAvgCost - bestCost;

    return {
      recommended: bestModel,
      reason: `Best cost-efficiency for your usage pattern (avg ${avgInputTokens} input + ${avgOutputTokens} output tokens)`,
      costSavings: costSavings > 0 ? costSavings : undefined,
      alternatives: alternatives.slice(0, 3), // Top 3 alternatives
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AdaptiveTokenConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AdaptiveTokenConfig {
    return { ...this.config };
  }

  /**
   * Export usage data for analysis
   */
  exportUsageData(): string {
    return JSON.stringify({
      usageHistory: this.tokenUsageHistory,
      config: this.config,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }
}

/**
 * Global adaptive token manager instance
 */
export const adaptiveTokenManager = new AdaptiveTokenManager();