/**
 * LLM Response Caching System
 * Provides intelligent caching for LLM responses to reduce redundant API calls
 * and improve performance.
 */

import { LLMMessage } from "../types";

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt: number;
  hitCount: number;
  lastAccessed: number;
  metadata?: Record<string, any>;
}

export interface CacheOptions {
  /** Maximum number of entries to store */
  maxEntries: number;
  /** Default TTL in milliseconds */
  defaultTTL: number;
  /** Maximum size per entry in bytes */
  maxEntrySize: number;
  /** Enable LRU eviction */
  enableLRU: boolean;
  /** Enable compression for large entries */
  enableCompression: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  averageResponseTime: number;
}

/**
 * High-performance memory cache with LRU eviction, compression, and intelligent invalidation
 */
export class PerformanceCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = [];
  private options: CacheOptions;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    averageResponseTime: 0,
  };
  private responseTimes: number[] = [];

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      maxEntries: 1000,
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      maxEntrySize: 1024 * 1024, // 1MB
      enableLRU: true,
      enableCompression: false,
      ...options,
    };
  }

  /**
   * Generate a cache key for LLM messages
   */
  private generateKey(messages: LLMMessage[], systemPrompt: string, provider: string): string {
    const content = JSON.stringify({ messages, systemPrompt, provider });
    return this.hash(content);
  }

  /**
   * Simple hash function for cache keys
   */
  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Compress data using simple string compression
   */
  private compress(data: string): string {
    if (!this.options.enableCompression) return data;

    // Simple run-length encoding for demonstration
    // In production, you might use a proper compression library
    return data.replace(/(.)\1+/g, (match, char) => {
      return match.length > 3 ? `${char}{${match.length}}` : match;
    });
  }

  /**
   * Decompress data
   */
  private decompress(data: string): string {
    if (!this.options.enableCompression) return data;

    return data.replace(/(.)\{(\d+)\}/g, (match, char, count) => {
      return char.repeat(parseInt(count));
    });
  }

  /**
   * Calculate size of entry in bytes
   */
  private getEntrySize(entry: CacheEntry<T>): number {
    const serialized = JSON.stringify(entry);
    return new Blob([serialized]).size;
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(key: string): void {
    if (!this.options.enableLRU) return;

    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    while (this.cache.size >= this.options.maxEntries && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey && this.cache.has(oldestKey)) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }
  }

  /**
   * Evict expired entries
   */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        this.stats.evictions++;

        // Remove from access order
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
          this.accessOrder.splice(index, 1);
        }
      }
    }
  }

  /**
   * Store a value in the cache
   */
  async set(
    messages: LLMMessage[],
    systemPrompt: string,
    provider: string,
    value: T,
    ttl: number = this.options.defaultTTL
  ): Promise<void> {
    const key = this.generateKey(messages, systemPrompt, provider);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      expiresAt: now + ttl,
      hitCount: 0,
      lastAccessed: now,
      metadata: {
        provider,
        messageCount: messages.length,
        systemPromptLength: systemPrompt.length,
      },
    };

    // Check entry size
    const entrySize = this.getEntrySize(entry);
    if (entrySize > this.options.maxEntrySize) {
      console.warn(`Cache entry too large (${entrySize} bytes), skipping`);
      return;
    }

    // Evict if necessary
    this.evictExpired();
    this.evictLRU();

    // Store the entry
    this.cache.set(key, entry);
    this.updateAccessOrder(key);

    this.updateStats();
  }

  /**
   * Retrieve a value from the cache
   */
  async get(
    messages: LLMMessage[],
    systemPrompt: string,
    provider: string
  ): Promise<T | undefined> {
    const startTime = Date.now();
    const key = this.generateKey(messages, systemPrompt, provider);

    this.evictExpired();

    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.recordResponseTime(Date.now() - startTime);
      return undefined;
    }

    // Check if expired
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      this.recordResponseTime(Date.now() - startTime);
      return undefined;
    }

    // Update access statistics
    entry.hitCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);

    this.stats.hits++;
    this.recordResponseTime(Date.now() - startTime);
    this.updateStats();

    return entry.value;
  }

  /**
   * Record response time for statistics
   */
  private recordResponseTime(time: number): void {
    this.responseTimes.push(time);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    this.stats.totalEntries = this.cache.size;
    this.stats.averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    // Calculate total size
    this.stats.totalSize = 0;
    for (const entry of this.cache.values()) {
      this.stats.totalSize += this.getEntrySize(entry);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.length = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      averageResponseTime: 0,
    };
    this.responseTimes.length = 0;
  }

  /**
   * Remove specific entries based on criteria
   */
  invalidate(predicate: (entry: CacheEntry<T>) => boolean): number {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (predicate(entry)) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
          this.accessOrder.splice(index, 1);
        }
        removed++;
      }
    }
    this.updateStats();
    return removed;
  }

  /**
   * Invalidate all entries for a specific provider
   */
  invalidateProvider(provider: string): number {
    return this.invalidate(entry =>
      entry.metadata?.provider === provider
    );
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get top entries by hit count
   */
  getTopEntries(limit: number = 10): Array<{ key: string; hitCount: number; metadata?: Record<string, any> }> {
    return Array.from(this.cache.values())
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit)
      .map(entry => ({
        key: entry.key,
        hitCount: entry.hitCount,
        metadata: entry.metadata,
      }));
  }

  /**
   * Optimize cache by removing low-value entries
   */
  optimize(): number {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Remove entries that haven't been accessed in the last hour and have low hit counts
    return this.invalidate(entry =>
      entry.lastAccessed < oneHourAgo && entry.hitCount < 2
    );
  }

  /**
   * Get memory usage information
   */
  getMemoryUsage(): {
    totalSizeBytes: number;
    entriesCount: number;
    averageEntrySize: number;
    largestEntrySize: number;
  } {
    let largestEntrySize = 0;
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      const size = this.getEntrySize(entry);
      totalSize += size;
      if (size > largestEntrySize) {
        largestEntrySize = size;
      }
    }

    return {
      totalSizeBytes: totalSize,
      entriesCount: this.cache.size,
      averageEntrySize: this.cache.size > 0 ? totalSize / this.cache.size : 0,
      largestEntrySize,
    };
  }
}

/**
 * Global cache instance for LLM responses
 */
export const llmResponseCache = new PerformanceCache<string>({
  maxEntries: 500,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  maxEntrySize: 2 * 1024 * 1024, // 2MB
  enableLRU: true,
  enableCompression: true,
});

/**
 * Global cache instance for context summaries
 */
export const contextCache = new PerformanceCache<string>({
  maxEntries: 200,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  maxEntrySize: 512 * 1024, // 512KB
  enableLRU: true,
  enableCompression: true,
});