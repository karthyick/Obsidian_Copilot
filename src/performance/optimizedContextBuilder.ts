/**
 * Optimized Context Builder
 * Provides intelligent context building for large documents with memory efficiency,
 * chunking, and relevance scoring.
 */

import { contextCache } from "./cache";
import { performanceMonitor } from "./monitor";

export interface ContextChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  relevanceScore: number;
  metadata: {
    lineCount: number;
    wordCount: number;
    containsCode: boolean;
    containsHeaders: boolean;
    containsLinks: boolean;
    language?: string;
  };
}

export interface ContextBuildOptions {
  /** Maximum total context size in characters */
  maxContextSize: number;
  /** Maximum size per chunk in characters */
  maxChunkSize: number;
  /** Overlap between chunks in characters */
  chunkOverlap: number;
  /** Include relevance scoring */
  enableRelevanceScoring: boolean;
  /** Keywords for relevance scoring */
  relevanceKeywords: string[];
  /** Preserve code blocks intact */
  preserveCodeBlocks: boolean;
  /** Preserve markdown structure */
  preserveMarkdownStructure: boolean;
  /** Enable semantic chunking */
  enableSemanticChunking: boolean;
  /** Include metadata in chunks */
  includeMetadata: boolean;
}

export interface ProcessedContext {
  chunks: ContextChunk[];
  totalSize: number;
  droppedContent: number;
  processingTime: number;
  cacheHit: boolean;
  summary: {
    totalChunks: number;
    averageRelevanceScore: number;
    highRelevanceChunks: number;
    codeBlockCount: number;
    headerCount: number;
  };
}

/**
 * Advanced context builder with intelligent chunking and optimization
 */
export class OptimizedContextBuilder {
  private defaultOptions: ContextBuildOptions = {
    maxContextSize: 32000, // ~8k tokens at 4 chars/token
    maxChunkSize: 2000,
    chunkOverlap: 200,
    enableRelevanceScoring: true,
    relevanceKeywords: [],
    preserveCodeBlocks: true,
    preserveMarkdownStructure: true,
    enableSemanticChunking: true,
    includeMetadata: true,
  };

  /**
   * Process and optimize content for LLM context
   */
  async processContent(
    content: string,
    query?: string,
    options: Partial<ContextBuildOptions> = {}
  ): Promise<ProcessedContext> {
    const startTime = Date.now();
    const finalOptions = { ...this.defaultOptions, ...options };

    // Generate cache key
    const cacheKey = this.generateCacheKey(content, query, finalOptions);

    // Check cache first
    const cachedResult = await contextCache.get([], '', cacheKey);
    if (cachedResult) {
      const parsed = JSON.parse(cachedResult) as ProcessedContext;
      parsed.cacheHit = true;
      return parsed;
    }

    const profileId = performanceMonitor.startProfile('context_processing', {
      contentLength: content.length,
      hasQuery: !!query,
    });

    try {
      // Extract relevance keywords from query
      if (query && finalOptions.enableRelevanceScoring) {
        finalOptions.relevanceKeywords = this.extractKeywords(query);
      }

      // Pre-process content
      const preprocessedContent = this.preprocessContent(content, finalOptions);

      // Create chunks
      let chunks: ContextChunk[];
      if (finalOptions.enableSemanticChunking) {
        chunks = this.createSemanticChunks(preprocessedContent, finalOptions);
      } else {
        chunks = this.createFixedChunks(preprocessedContent, finalOptions);
      }

      // Score relevance if enabled
      if (finalOptions.enableRelevanceScoring && finalOptions.relevanceKeywords.length > 0) {
        chunks = this.scoreRelevance(chunks, finalOptions.relevanceKeywords);
      }

      // Sort by relevance and fit within context limits
      const optimizedChunks = this.optimizeChunks(chunks, finalOptions);

      // Calculate metrics
      const totalSize = optimizedChunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
      const droppedContent = content.length - totalSize;

      const result: ProcessedContext = {
        chunks: optimizedChunks,
        totalSize,
        droppedContent,
        processingTime: Date.now() - startTime,
        cacheHit: false,
        summary: this.generateSummary(optimizedChunks),
      };

      // Cache the result
      await contextCache.set([], '', cacheKey, JSON.stringify(result));

      performanceMonitor.recordMetric('context_processing_size', totalSize, 'bytes', {
        originalSize: content.length.toString(),
        compressionRatio: (totalSize / content.length).toString(),
      });

      return result;

    } finally {
      performanceMonitor.endProfile(profileId);
    }
  }

  /**
   * Generate cache key for content processing
   */
  private generateCacheKey(
    content: string,
    query: string | undefined,
    options: ContextBuildOptions
  ): string {
    const hash = this.hash(content + (query || '') + JSON.stringify(options));
    return `context_${hash}`;
  }

  /**
   * Simple hash function
   */
  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Extract keywords from query for relevance scoring
   */
  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 20); // Limit to top 20 keywords
  }

  /**
   * Pre-process content for better chunking
   */
  private preprocessContent(content: string, options: ContextBuildOptions): string {
    let processed = content;

    // Normalize line endings
    processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Clean up excessive whitespace but preserve structure
    if (!options.preserveMarkdownStructure) {
      processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
    }

    // Remove or preserve special elements based on options
    if (options.preserveCodeBlocks) {
      // Mark code blocks for special handling
      processed = processed.replace(/(```[\s\S]*?```)/g, (match) => {
        return `__CODE_BLOCK_${this.hash(match)}__${match}__CODE_BLOCK_END__`;
      });
    }

    return processed;
  }

  /**
   * Create semantic chunks based on content structure
   */
  private createSemanticChunks(content: string, options: ContextBuildOptions): ContextChunk[] {
    const chunks: ContextChunk[] = [];
    const lines = content.split('\n');

    let currentChunk = '';
    let currentStartIndex = 0;
    let lineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for natural break points
      const isHeader = /^#{1,6}\s/.test(line);
      const isEmptyLine = line.trim() === '';

      const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + line;

      // Create chunk if we hit size limit or natural break
      const shouldBreak =
        potentialChunk.length > options.maxChunkSize ||
        (isHeader && currentChunk.length > 500) ||
        (isEmptyLine && currentChunk.length > options.maxChunkSize * 0.7);

      if (shouldBreak && currentChunk.length > 0) {
        chunks.push(this.createChunk(
          currentChunk,
          currentStartIndex,
          currentStartIndex + currentChunk.length,
          chunks.length.toString(),
          options
        ));

        // Start new chunk with overlap if needed
        if (options.chunkOverlap > 0) {
          const overlapLines = this.getOverlapLines(currentChunk, options.chunkOverlap);
          currentChunk = overlapLines + (overlapLines ? '\n' : '') + line;
        } else {
          currentChunk = line;
        }
        currentStartIndex = content.indexOf(line, lineIndex);
      } else {
        currentChunk = potentialChunk;
      }

      lineIndex += line.length + 1; // +1 for newline
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(
        currentChunk,
        currentStartIndex,
        currentStartIndex + currentChunk.length,
        chunks.length.toString(),
        options
      ));
    }

    return chunks;
  }

  /**
   * Create fixed-size chunks
   */
  private createFixedChunks(content: string, options: ContextBuildOptions): ContextChunk[] {
    const chunks: ContextChunk[] = [];
    const chunkSize = options.maxChunkSize;
    const overlap = options.chunkOverlap;

    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      const end = Math.min(i + chunkSize, content.length);

      // Try to break at word boundaries
      let adjustedEnd = end;
      if (end < content.length) {
        const nextSpaceIndex = content.indexOf(' ', end);
        const prevSpaceIndex = content.lastIndexOf(' ', end);

        if (nextSpaceIndex !== -1 && nextSpaceIndex - end < 50) {
          adjustedEnd = nextSpaceIndex;
        } else if (prevSpaceIndex !== -1 && end - prevSpaceIndex < 50) {
          adjustedEnd = prevSpaceIndex;
        }
      }

      const finalChunk = content.slice(i, adjustedEnd);
      chunks.push(this.createChunk(finalChunk, i, adjustedEnd, chunks.length.toString(), options));

      if (adjustedEnd >= content.length) break;
      i = adjustedEnd - overlap;
    }

    return chunks;
  }

  /**
   * Create a chunk object with metadata
   */
  private createChunk(
    content: string,
    startIndex: number,
    endIndex: number,
    id: string,
    _options: ContextBuildOptions
  ): ContextChunk {
    const metadata = {
      lineCount: content.split('\n').length,
      wordCount: content.split(/\s+/).length,
      containsCode: /```|`[^`]+`/.test(content),
      containsHeaders: /^#{1,6}\s/m.test(content),
      containsLinks: /\[([^\]]+)\]\([^)]+\)/.test(content),
      language: this.detectLanguage(content),
    };

    return {
      id,
      content: content.trim(),
      startIndex,
      endIndex,
      relevanceScore: 0, // Will be set by relevance scoring
      metadata,
    };
  }

  /**
   * Detect programming language in content
   */
  private detectLanguage(content: string): string | undefined {
    const codeBlockMatch = content.match(/```(\w+)/);
    if (codeBlockMatch) {
      return codeBlockMatch[1];
    }

    // Simple heuristics
    if (/import\s+.*from|export\s+.*{/.test(content)) return 'javascript';
    if (/def\s+\w+\(|import\s+\w+/.test(content)) return 'python';
    if (/function\s+\w+|const\s+\w+\s*=/.test(content)) return 'javascript';
    if (/public\s+class|private\s+\w+/.test(content)) return 'java';

    return undefined;
  }

  /**
   * Get overlap lines for chunk continuity
   */
  private getOverlapLines(content: string, overlapSize: number): string {
    if (content.length <= overlapSize) return content;

    const lines = content.split('\n');
    let overlap = '';
    let currentSize = 0;

    for (let i = lines.length - 1; i >= 0; i--) {
      const lineWithNewline = lines[i] + '\n';
      if (currentSize + lineWithNewline.length > overlapSize) break;

      overlap = lineWithNewline + overlap;
      currentSize += lineWithNewline.length;
    }

    return overlap.trim();
  }

  /**
   * Score chunks for relevance
   */
  private scoreRelevance(chunks: ContextChunk[], keywords: string[]): ContextChunk[] {
    return chunks.map(chunk => {
      const content = chunk.content.toLowerCase();
      let score = 0;

      // Keyword matching with term frequency
      for (const keyword of keywords) {
        const regex = new RegExp(keyword.toLowerCase(), 'gi');
        const matches = content.match(regex);
        if (matches) {
          // TF-IDF-like scoring
          const termFreq = matches.length / chunk.metadata.wordCount;
          const docFreq = chunks.filter(c => c.content.toLowerCase().includes(keyword)).length;
          const idf = Math.log(chunks.length / docFreq);
          score += termFreq * idf;
        }
      }

      // Boost based on content type
      if (chunk.metadata.containsHeaders) score *= 1.3;
      if (chunk.metadata.containsCode) score *= 1.2;
      if (chunk.metadata.containsLinks) score *= 1.1;

      // Boost for reasonable size (not too small, not too large)
      const sizeRatio = chunk.content.length / this.defaultOptions.maxChunkSize;
      if (sizeRatio > 0.3 && sizeRatio < 0.8) score *= 1.1;

      chunk.relevanceScore = score;
      return chunk;
    });
  }

  /**
   * Optimize chunks by selecting most relevant ones that fit within limits
   */
  private optimizeChunks(chunks: ContextChunk[], options: ContextBuildOptions): ContextChunk[] {
    // Sort by relevance score (descending)
    const sortedChunks = chunks.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const selectedChunks: ContextChunk[] = [];
    let totalSize = 0;

    // Greedily select chunks that fit within size limit
    for (const chunk of sortedChunks) {
      if (totalSize + chunk.content.length <= options.maxContextSize) {
        selectedChunks.push(chunk);
        totalSize += chunk.content.length;
      }
    }

    // Sort selected chunks by original order for readability
    return selectedChunks.sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(chunks: ContextChunk[]) {
    const totalChunks = chunks.length;
    const averageRelevanceScore = chunks.length > 0
      ? chunks.reduce((sum, chunk) => sum + chunk.relevanceScore, 0) / chunks.length
      : 0;

    const highRelevanceChunks = chunks.filter(chunk => chunk.relevanceScore > averageRelevanceScore).length;
    const codeBlockCount = chunks.filter(chunk => chunk.metadata.containsCode).length;
    const headerCount = chunks.filter(chunk => chunk.metadata.containsHeaders).length;

    return {
      totalChunks,
      averageRelevanceScore,
      highRelevanceChunks,
      codeBlockCount,
      headerCount,
    };
  }

  /**
   * Get optimized context as a single string
   */
  async getOptimizedContext(
    content: string,
    query?: string,
    options?: Partial<ContextBuildOptions>
  ): Promise<string> {
    const processed = await this.processContent(content, query, options);
    return processed.chunks.map(chunk => chunk.content).join('\n\n---\n\n');
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(timeRange: number = 60 * 60 * 1000) {
    const contextMetrics = performanceMonitor.getMetricsByPattern(
      /context_processing/,
      timeRange
    );

    const processingTimes = contextMetrics
      .filter(m => m.name === 'context_processing_duration')
      .map(m => m.value);

    const compressionRatios = contextMetrics
      .filter(m => m.name === 'context_processing_size')
      .map(m => parseFloat(m.tags?.compressionRatio || '1'));

    return {
      totalProcessed: processingTimes.length,
      averageProcessingTime: processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0,
      averageCompressionRatio: compressionRatios.length > 0
        ? compressionRatios.reduce((a, b) => a + b, 0) / compressionRatios.length
        : 0,
      cacheHitRate: contextCache.getStats().hitRate,
    };
  }
}

/**
 * Global optimized context builder instance
 */
export const optimizedContextBuilder = new OptimizedContextBuilder();