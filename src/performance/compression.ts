/**
 * Response Compression System
 * Provides memory-efficient compression for large chat histories and responses
 */

import { performanceMonitor } from "./monitor";

export interface CompressionOptions {
  /** Compression algorithm to use */
  algorithm: 'lz-string' | 'deflate' | 'gzip' | 'simple';
  /** Compression level (1-9, higher = better compression but slower) */
  level: number;
  /** Minimum size threshold to trigger compression (bytes) */
  minSizeThreshold: number;
  /** Enable chunked compression for very large data */
  enableChunking: boolean;
  /** Chunk size for large data compression */
  chunkSize: number;
  /** Enable binary compression for better ratios */
  enableBinary: boolean;
}

export interface CompressionResult {
  compressed: string | Uint8Array;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  processingTime: number;
  chunked: boolean;
}

export interface DecompressionResult {
  decompressed: string;
  originalSize: number;
  compressedSize: number;
  decompressionTime: number;
  algorithm: string;
}

/**
 * Simple LZ-like compression implementation
 */
class SimpleLZ {
  static compress(data: string): string {
    const dict: Map<string, number> = new Map();
    let dictSize = 256;
    let result: number[] = [];
    let w = "";

    // Initialize dictionary with ASCII characters
    for (let i = 0; i < 256; i++) {
      dict.set(String.fromCharCode(i), i);
    }

    for (let i = 0; i < data.length; i++) {
      const c = data.charAt(i);
      const wc = w + c;

      if (dict.has(wc)) {
        w = wc;
      } else {
        result.push(dict.get(w)!);
        dict.set(wc, dictSize++);
        w = c;
      }
    }

    if (w !== "") {
      result.push(dict.get(w)!);
    }

    return result.map(code => String.fromCharCode(code)).join('');
  }

  static decompress(compressed: string): string {
    const dict: Map<number, string> = new Map();
    let dictSize = 256;
    let result: string[] = [];

    // Initialize dictionary
    for (let i = 0; i < 256; i++) {
      dict.set(i, String.fromCharCode(i));
    }

    const codes = compressed.split('').map(char => char.charCodeAt(0));
    let w = String.fromCharCode(codes[0]);
    result.push(w);

    for (let i = 1; i < codes.length; i++) {
      const k = codes[i];
      let entry = "";

      if (dict.has(k)) {
        entry = dict.get(k)!;
      } else if (k === dictSize) {
        entry = w + w.charAt(0);
      } else {
        throw new Error("Invalid compressed data");
      }

      result.push(entry);
      dict.set(dictSize++, w + entry.charAt(0));
      w = entry;
    }

    return result.join('');
  }
}

/**
 * Run-length encoding compression
 */
class RunLengthCompression {
  static compress(data: string): string {
    let result = "";
    let i = 0;

    while (i < data.length) {
      let count = 1;
      const char = data[i];

      while (i + count < data.length && data[i + count] === char) {
        count++;
      }

      if (count > 3) {
        result += `${char}${count}`;
      } else {
        result += char.repeat(count);
      }

      i += count;
    }

    return result;
  }

  static decompress(compressed: string): string {
    let result = "";
    let i = 0;

    while (i < compressed.length) {
      const char = compressed[i];

      if (i + 1 < compressed.length && /\d/.test(compressed[i + 1])) {
        // Find the full number
        let numStr = "";
        let j = i + 1;
        while (j < compressed.length && /\d/.test(compressed[j])) {
          numStr += compressed[j];
          j++;
        }

        const count = parseInt(numStr);
        result += char.repeat(count);
        i = j;
      } else {
        result += char;
        i++;
      }
    }

    return result;
  }
}

/**
 * Advanced response compression system with multiple algorithms
 */
export class ResponseCompressor {
  private defaultOptions: CompressionOptions = {
    algorithm: 'simple',
    level: 6,
    minSizeThreshold: 1024, // 1KB
    enableChunking: true,
    chunkSize: 64 * 1024, // 64KB chunks
    enableBinary: false,
  };

  private compressionStats = {
    totalCompressions: 0,
    totalOriginalBytes: 0,
    totalCompressedBytes: 0,
    averageCompressionRatio: 0,
    averageProcessingTime: 0,
  };

  constructor(private options: Partial<CompressionOptions> = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Compress data using the specified algorithm
   */
  async compress(
    data: string,
    options: Partial<CompressionOptions> = {}
  ): Promise<CompressionResult> {
    const finalOptions = { ...this.options, ...options };
    const originalSize = new Blob([data]).size;

    // Skip compression if data is too small
    if (originalSize < finalOptions.minSizeThreshold) {
      return {
        compressed: data,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
        algorithm: 'none',
        processingTime: 0,
        chunked: false,
      };
    }

    const profileId = performanceMonitor.startProfile('response_compression', {
      algorithm: finalOptions.algorithm,
      originalSize: originalSize.toString(),
    });

    const startTime = Date.now();

    try {
      let compressed: string | Uint8Array;
      let chunked = false;

      if (finalOptions.enableChunking && originalSize > finalOptions.chunkSize) {
        compressed = await this.compressChunked(data, finalOptions);
        chunked = true;
      } else {
        compressed = await this.compressSingle(data, finalOptions);
      }

      const compressedSize = typeof compressed === 'string'
        ? new Blob([compressed]).size
        : compressed.length;

      const compressionRatio = compressedSize / originalSize;
      const processingTime = Date.now() - startTime;

      // Update statistics
      this.updateStats(originalSize, compressedSize, processingTime);

      performanceMonitor.recordMetric('compression_ratio', compressionRatio, 'percentage', {
        algorithm: finalOptions.algorithm,
      });

      performanceMonitor.recordMetric('compression_time', processingTime, 'ms', {
        algorithm: finalOptions.algorithm,
        originalSize: originalSize.toString(),
      });

      return {
        compressed,
        originalSize,
        compressedSize,
        compressionRatio,
        algorithm: finalOptions.algorithm,
        processingTime,
        chunked,
      };

    } finally {
      performanceMonitor.endProfile(profileId);
    }
  }

  /**
   * Decompress data
   */
  async decompress(
    compressed: string | Uint8Array,
    algorithm: string,
    chunked: boolean = false
  ): Promise<DecompressionResult> {
    const profileId = performanceMonitor.startProfile('response_decompression', {
      algorithm,
      chunked: chunked.toString(),
    });

    const startTime = Date.now();
    const compressedSize = typeof compressed === 'string'
      ? new Blob([compressed]).size
      : compressed.length;

    try {
      let decompressed: string;

      if (algorithm === 'none') {
        decompressed = compressed as string;
      } else if (chunked) {
        decompressed = await this.decompressChunked(compressed as string, algorithm);
      } else {
        decompressed = await this.decompressSingle(compressed as string, algorithm);
      }

      const decompressionTime = Date.now() - startTime;
      const originalSize = new Blob([decompressed]).size;

      performanceMonitor.recordMetric('decompression_time', decompressionTime, 'ms', {
        algorithm,
        compressedSize: compressedSize.toString(),
      });

      return {
        decompressed,
        originalSize,
        compressedSize,
        decompressionTime,
        algorithm,
      };

    } finally {
      performanceMonitor.endProfile(profileId);
    }
  }

  /**
   * Compress data in chunks
   */
  private async compressChunked(
    data: string,
    options: CompressionOptions
  ): Promise<string> {
    const chunks: string[] = [];
    const chunkSize = options.chunkSize;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const compressedChunk = await this.compressSingle(chunk, options);
      chunks.push(compressedChunk);
    }

    // Encode chunked data with metadata
    const metadata = {
      algorithm: options.algorithm,
      chunkCount: chunks.length,
      originalChunkSize: chunkSize,
    };

    return JSON.stringify({
      metadata,
      chunks,
    });
  }

  /**
   * Decompress chunked data
   */
  private async decompressChunked(
    compressed: string,
    algorithm: string
  ): Promise<string> {
    const parsedData = JSON.parse(compressed);
    const { chunks } = parsedData;
    const result: string[] = [];

    for (const chunk of chunks) {
      const decompressedChunk = await this.decompressSingle(chunk, algorithm);
      result.push(decompressedChunk);
    }

    return result.join('');
  }

  /**
   * Compress a single piece of data
   */
  private async compressSingle(
    data: string,
    options: CompressionOptions
  ): Promise<string> {
    switch (options.algorithm) {
      case 'simple':
        return SimpleLZ.compress(data);

      case 'lz-string':
        // Use run-length encoding as a simple alternative
        return RunLengthCompression.compress(data);

      case 'deflate':
      case 'gzip':
        // For browser compatibility, use simple compression
        return this.simpleCompress(data);

      default:
        throw new Error(`Unsupported compression algorithm: ${options.algorithm}`);
    }
  }

  /**
   * Decompress a single piece of data
   */
  private async decompressSingle(
    compressed: string,
    algorithm: string
  ): Promise<string> {
    switch (algorithm) {
      case 'simple':
        return SimpleLZ.decompress(compressed);

      case 'lz-string':
        return RunLengthCompression.decompress(compressed);

      case 'deflate':
      case 'gzip':
        return this.simpleDecompress(compressed);

      default:
        throw new Error(`Unsupported decompression algorithm: ${algorithm}`);
    }
  }

  /**
   * Simple compression using character frequency and substitution
   */
  private simpleCompress(data: string): string {
    // Build frequency table
    const freq = new Map<string, number>();
    for (const char of data) {
      freq.set(char, (freq.get(char) || 0) + 1);
    }

    // Create substitution map for most frequent characters
    const sortedChars = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 32); // Top 32 most frequent

    const substitutionMap = new Map<string, string>();
    const reverseMap = new Map<string, string>();

    for (let i = 0; i < sortedChars.length; i++) {
      const char = sortedChars[i][0];
      const substitute = String.fromCharCode(128 + i); // Use extended ASCII
      substitutionMap.set(char, substitute);
      reverseMap.set(substitute, char);
    }

    // Apply substitution
    let compressed = data;
    for (const [original, substitute] of substitutionMap) {
      compressed = compressed.replace(new RegExp(this.escapeRegExp(original), 'g'), substitute);
    }

    // Store substitution map
    const mapData = Array.from(reverseMap.entries());
    return JSON.stringify({ map: mapData, data: compressed });
  }

  /**
   * Simple decompression
   */
  private simpleDecompress(compressed: string): string {
    const parsed = JSON.parse(compressed);
    const { map, data } = parsed;
    const substitutionMap = new Map(map);

    let decompressed = data;
    for (const [substitute, original] of substitutionMap) {
      decompressed = decompressed.replace(new RegExp(this.escapeRegExp(substitute), 'g'), original);
    }

    return decompressed;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Update compression statistics
   */
  private updateStats(originalSize: number, compressedSize: number, processingTime: number): void {
    this.compressionStats.totalCompressions++;
    this.compressionStats.totalOriginalBytes += originalSize;
    this.compressionStats.totalCompressedBytes += compressedSize;

    // Recalculate averages
    this.compressionStats.averageCompressionRatio =
      this.compressionStats.totalCompressedBytes / this.compressionStats.totalOriginalBytes;

    // Update average processing time (rolling average)
    const alpha = 0.1; // Smoothing factor
    this.compressionStats.averageProcessingTime =
      alpha * processingTime + (1 - alpha) * this.compressionStats.averageProcessingTime;
  }

  /**
   * Get compression statistics
   */
  getStats(): typeof this.compressionStats {
    return { ...this.compressionStats };
  }

  /**
   * Test different compression algorithms and return the best one
   */
  async findBestCompression(data: string): Promise<{
    algorithm: string;
    compressionRatio: number;
    processingTime: number;
  }> {
    const algorithms = ['simple', 'lz-string'];
    const results: Array<{
      algorithm: string;
      compressionRatio: number;
      processingTime: number;
    }> = [];

    for (const algorithm of algorithms) {
      try {
        const result = await this.compress(data, { algorithm: algorithm as any });
        results.push({
          algorithm,
          compressionRatio: result.compressionRatio,
          processingTime: result.processingTime,
        });
      } catch (error) {
        console.warn(`Failed to test compression algorithm ${algorithm}:`, error);
      }
    }

    if (results.length === 0) {
      return {
        algorithm: 'none',
        compressionRatio: 1.0,
        processingTime: 0,
      };
    }

    // Find best balance between compression ratio and processing time
    const best = results.reduce((best, current) => {
      const bestScore = (1 - best.compressionRatio) * 100 - best.processingTime * 0.01;
      const currentScore = (1 - current.compressionRatio) * 100 - current.processingTime * 0.01;
      return currentScore > bestScore ? current : best;
    });

    return best;
  }

  /**
   * Compress chat history efficiently
   */
  async compressChatHistory(
    messages: Array<{ role: string; content: string; timestamp?: number }>
  ): Promise<CompressionResult> {
    // Separate metadata from content for better compression
    const metadata = messages.map(msg => ({
      role: msg.role,
      timestamp: msg.timestamp,
      length: msg.content.length,
    }));

    const content = messages.map(msg => msg.content).join('\n---MESSAGE_SEPARATOR---\n');

    // Compress content separately
    const contentResult = await this.compress(content);

    // Create compressed message structure
    const compressedData = {
      metadata,
      compressedContent: contentResult.compressed,
      compressionInfo: {
        algorithm: contentResult.algorithm,
        chunked: contentResult.chunked,
      },
    };

    const finalCompressed = JSON.stringify(compressedData);
    const finalSize = new Blob([finalCompressed]).size;

    return {
      compressed: finalCompressed,
      originalSize: contentResult.originalSize,
      compressedSize: finalSize,
      compressionRatio: finalSize / contentResult.originalSize,
      algorithm: `chat_history_${contentResult.algorithm}`,
      processingTime: contentResult.processingTime,
      chunked: contentResult.chunked,
    };
  }

  /**
   * Decompress chat history
   */
  async decompressChatHistory(compressed: string): Promise<Array<{ role: string; content: string; timestamp?: number }>> {
    const parsedData = JSON.parse(compressed);
    const { metadata, compressedContent, compressionInfo } = parsedData;

    // Decompress content
    const decompressedContent = await this.decompress(
      compressedContent,
      compressionInfo.algorithm,
      compressionInfo.chunked
    );

    // Split content back into messages
    const contents = decompressedContent.decompressed.split('\n---MESSAGE_SEPARATOR---\n');

    // Rebuild messages
    return metadata.map((meta: any, index: number) => ({
      role: meta.role,
      content: contents[index] || '',
      timestamp: meta.timestamp,
    }));
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.compressionStats = {
      totalCompressions: 0,
      totalOriginalBytes: 0,
      totalCompressedBytes: 0,
      averageCompressionRatio: 0,
      averageProcessingTime: 0,
    };
  }
}

/**
 * Global response compressor instance
 */
export const responseCompressor = new ResponseCompressor({
  algorithm: 'simple',
  level: 6,
  minSizeThreshold: 2048, // 2KB threshold
  enableChunking: true,
  chunkSize: 32 * 1024, // 32KB chunks
});