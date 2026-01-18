/**
 * Performance Monitoring System
 * Provides comprehensive performance metrics, monitoring, and optimization insights
 */

import { TelemetryManager } from "../telemetry";

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage' | 'rate';
  timestamp: number;
  tags?: Record<string, string>;
}

export interface PerformanceAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metric: string;
  threshold: number;
  actualValue: number;
  timestamp: number;
  resolved?: boolean;
}

export interface PerformanceProfile {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryStart?: number;
  memoryEnd?: number;
  memoryDelta?: number;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
  };
  cache: {
    hitRate: number;
    evictionRate: number;
    totalSize: number;
  };
  errors: {
    rate: number;
    total: number;
    byType: Record<string, number>;
  };
}

/**
 * Advanced performance monitoring and profiling system
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private profiles: Map<string, PerformanceProfile> = new Map();
  private responseTimes: number[] = [];
  private errorCounts: Map<string, number> = new Map();
  private telemetryManager?: TelemetryManager;

  private maxMetricsHistory = 10000;
  private maxResponseTimes = 1000;
  private alertThresholds = {
    responseTime: 5000, // 5 seconds
    memoryUsage: 0.8, // 80%
    errorRate: 0.05, // 5%
    cacheHitRate: 0.7, // 70%
  };

  constructor(telemetryManager?: TelemetryManager) {
    this.telemetryManager = telemetryManager;
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'] = 'count',
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Maintain history size
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Check for alerts
    this.checkAlerts(metric);

    // Record to telemetry
    if (this.telemetryManager) {
      this.telemetryManager.recordEvent('performance_metric', {
        name,
        value,
        unit,
        tags,
      });
    }
  }

  /**
   * Start profiling an operation
   */
  startProfile(operationName: string, metadata?: Record<string, any>): string {
    const profileId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const profile: PerformanceProfile = {
      operationName,
      startTime: performance.now(),
      metadata,
    };

    // Record memory usage if available
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      profile.memoryStart = (window as any).performance.memory.usedJSHeapSize;
    }

    this.profiles.set(profileId, profile);
    return profileId;
  }

  /**
   * End profiling an operation
   */
  endProfile(profileId: string): PerformanceProfile | undefined {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return undefined;
    }

    const endTime = performance.now();
    profile.endTime = endTime;
    profile.duration = endTime - profile.startTime;

    // Record memory usage if available
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      profile.memoryEnd = (window as any).performance.memory.usedJSHeapSize;
      if (profile.memoryStart !== undefined) {
        profile.memoryDelta = profile.memoryEnd - profile.memoryStart;
      }
    }

    // Record metrics
    this.recordMetric(`${profile.operationName}_duration`, profile.duration, 'ms', {
      operation: profile.operationName,
    });

    if (profile.memoryDelta !== undefined) {
      this.recordMetric(`${profile.operationName}_memory_delta`, profile.memoryDelta, 'bytes', {
        operation: profile.operationName,
      });
    }

    // Track response times
    if (profile.operationName.includes('llm_call') || profile.operationName.includes('api_call')) {
      this.responseTimes.push(profile.duration);
      if (this.responseTimes.length > this.maxResponseTimes) {
        this.responseTimes.shift();
      }
    }

    // Clean up
    this.profiles.delete(profileId);

    return profile;
  }

  /**
   * Record an error
   */
  recordError(errorType: string, error: Error | string, metadata?: Record<string, any>): void {
    const errorKey = typeof error === 'string' ? error : error.constructor.name;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    this.recordMetric('error_count', 1, 'count', {
      errorType,
      errorClass: errorKey,
    });

    if (this.telemetryManager) {
      this.telemetryManager.recordEvent('performance_error', {
        errorType,
        errorMessage: typeof error === 'string' ? error : error.message,
        metadata,
      });
    }
  }

  /**
   * Check if metrics trigger any alerts
   */
  private checkAlerts(metric: PerformanceMetric): void {
    const alerts: PerformanceAlert[] = [];

    // Response time alerts
    if (metric.name.includes('duration') && metric.unit === 'ms') {
      if (metric.value > this.alertThresholds.responseTime) {
        alerts.push({
          id: `response_time_${Date.now()}`,
          level: metric.value > this.alertThresholds.responseTime * 2 ? 'critical' : 'warning',
          message: `High response time detected: ${metric.value}ms`,
          metric: metric.name,
          threshold: this.alertThresholds.responseTime,
          actualValue: metric.value,
          timestamp: Date.now(),
        });
      }
    }

    // Memory alerts
    if (metric.name.includes('memory') && metric.unit === 'percentage') {
      if (metric.value > this.alertThresholds.memoryUsage) {
        alerts.push({
          id: `memory_${Date.now()}`,
          level: metric.value > 0.9 ? 'critical' : 'warning',
          message: `High memory usage: ${(metric.value * 100).toFixed(1)}%`,
          metric: metric.name,
          threshold: this.alertThresholds.memoryUsage,
          actualValue: metric.value,
          timestamp: Date.now(),
        });
      }
    }

    // Cache hit rate alerts
    if (metric.name.includes('cache_hit_rate') && metric.unit === 'percentage') {
      if (metric.value < this.alertThresholds.cacheHitRate) {
        alerts.push({
          id: `cache_hit_rate_${Date.now()}`,
          level: 'warning',
          message: `Low cache hit rate: ${(metric.value * 100).toFixed(1)}%`,
          metric: metric.name,
          threshold: this.alertThresholds.cacheHitRate,
          actualValue: metric.value,
          timestamp: Date.now(),
        });
      }
    }

    this.alerts.push(...alerts);

    // Maintain alerts history
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Get system metrics summary
   */
  getSystemMetrics(): SystemMetrics {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Filter recent metrics
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneHourAgo);

    // Calculate response time percentiles
    const sortedTimes = this.responseTimes.slice().sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const averageResponseTime = sortedTimes.length > 0
      ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length
      : 0;

    // Calculate error rates
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    const totalRequests = recentMetrics.filter(m => m.name.includes('llm_call')).length;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    // Get memory info
    let memoryUsage = { used: 0, total: 0, percentage: 0 };
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: memory.usedJSHeapSize / memory.totalJSHeapSize,
      };
    }

    // Calculate cache metrics (placeholder - would be populated from cache)
    const cacheMetrics = recentMetrics.filter(m => m.name.includes('cache'));
    const cacheHitMetrics = cacheMetrics.filter(m => m.name.includes('hit_rate'));
    const avgCacheHitRate = cacheHitMetrics.length > 0
      ? cacheHitMetrics.reduce((a, b) => a + b.value, 0) / cacheHitMetrics.length
      : 0;

    return {
      memory: memoryUsage,
      performance: {
        averageResponseTime,
        p95ResponseTime: sortedTimes[p95Index] || 0,
        p99ResponseTime: sortedTimes[p99Index] || 0,
        throughput: totalRequests,
      },
      cache: {
        hitRate: avgCacheHitRate,
        evictionRate: 0, // Would be calculated from cache events
        totalSize: 0, // Would be provided from cache
      },
      errors: {
        rate: errorRate,
        total: totalErrors,
        byType: Object.fromEntries(this.errorCounts),
      },
    };
  }

  /**
   * Get recent metrics by name
   */
  getMetrics(
    name: string,
    timeRange: number = 60 * 60 * 1000, // 1 hour
    limit?: number
  ): PerformanceMetric[] {
    const cutoff = Date.now() - timeRange;
    let filtered = this.metrics
      .filter(m => m.name === name && m.timestamp > cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  /**
   * Get all metrics matching a pattern
   */
  getMetricsByPattern(
    pattern: RegExp,
    timeRange: number = 60 * 60 * 1000
  ): PerformanceMetric[] {
    const cutoff = Date.now() - timeRange;
    return this.metrics
      .filter(m => pattern.test(m.name) && m.timestamp > cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get active alerts
   */
  getAlerts(level?: PerformanceAlert['level']): PerformanceAlert[] {
    let alerts = this.alerts.filter(a => !a.resolved);
    if (level) {
      alerts = alerts.filter(a => a.level === level);
    }
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Get performance summary for a time period
   */
  getPerformanceSummary(timeRange: number = 60 * 60 * 1000): {
    totalRequests: number;
    averageResponseTime: number;
    slowestOperation: { name: string; duration: number } | null;
    fastestOperation: { name: string; duration: number } | null;
    memoryPeakUsage: number;
    errorCount: number;
    cacheHitRate: number;
  } {
    const cutoff = Date.now() - timeRange;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    const durationMetrics = recentMetrics.filter(m => m.unit === 'ms');
    const memoryMetrics = recentMetrics.filter(m => m.unit === 'bytes' && m.name.includes('memory'));
    const cacheHitMetrics = recentMetrics.filter(m => m.name.includes('hit_rate'));

    let slowestOperation: { name: string; duration: number } | null = null;
    let fastestOperation: { name: string; duration: number } | null = null;

    if (durationMetrics.length > 0) {
      const sorted = durationMetrics.sort((a, b) => b.value - a.value);
      slowestOperation = { name: sorted[0].name, duration: sorted[0].value };
      fastestOperation = { name: sorted[sorted.length - 1].name, duration: sorted[sorted.length - 1].value };
    }

    const memoryPeakUsage = memoryMetrics.length > 0
      ? Math.max(...memoryMetrics.map(m => m.value))
      : 0;

    const avgCacheHitRate = cacheHitMetrics.length > 0
      ? cacheHitMetrics.reduce((a, b) => a + b.value, 0) / cacheHitMetrics.length
      : 0;

    return {
      totalRequests: durationMetrics.length,
      averageResponseTime: durationMetrics.length > 0
        ? durationMetrics.reduce((a, b) => a + b.value, 0) / durationMetrics.length
        : 0,
      slowestOperation,
      fastestOperation,
      memoryPeakUsage,
      errorCount: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
      cacheHitRate: avgCacheHitRate,
    };
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify({
        metrics: this.metrics,
        alerts: this.alerts,
        systemMetrics: this.getSystemMetrics(),
        summary: this.getPerformanceSummary(),
        exportedAt: new Date().toISOString(),
      }, null, 2);
    } else {
      // CSV format
      const headers = ['name', 'value', 'unit', 'timestamp', 'tags'];
      const rows = this.metrics.map(m => [
        m.name,
        m.value,
        m.unit,
        m.timestamp,
        JSON.stringify(m.tags || {}),
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
  }

  /**
   * Reset all metrics and alerts
   */
  reset(): void {
    this.metrics.length = 0;
    this.alerts.length = 0;
    this.profiles.clear();
    this.responseTimes.length = 0;
    this.errorCounts.clear();
  }

  /**
   * Get configuration for alert thresholds
   */
  getAlertThresholds(): typeof this.alertThresholds {
    return { ...this.alertThresholds };
  }

  /**
   * Update alert thresholds
   */
  setAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();