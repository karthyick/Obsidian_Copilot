/**
 * Connection state information
 */
export interface ConnectionState {
  isConnected: boolean;
  lastCheckTime: Date | null;
  lastError: Error | null;
  provider: string | null;
}

/**
 * Configuration options for PcConnectionManager
 */
export interface PcConnectionManagerConfig {
  cacheDurationMs: number; // How long to cache connection status (default: 5 minutes)
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: PcConnectionManagerConfig = {
  cacheDurationMs: 5 * 60 * 1000, // 5 minutes in milliseconds
};

/**
 * PcConnectionManager - Singleton class for managing connection state
 *
 * This class provides centralized management of connection status with caching.
 * It tracks:
 * - Current connection state (connected/disconnected)
 * - Timestamp of last connection check
 * - Any errors from the last connection attempt
 * - The provider associated with the connection
 *
 * @example
 * ```typescript
 * const manager = PcConnectionManager.getInstance();
 *
 * // Check connection status (uses cache if within 5-minute window)
 * const state = manager.getConnectionState();
 *
 * // Force a fresh check
 * const freshState = manager.checkConnection(async () => {
 *   // Your connection test logic
 *   return { success: true };
 * });
 * ```
 */
export class PcConnectionManager {
  private static instance: PcConnectionManager | null = null;

  private connectionState: ConnectionState;
  private config: PcConnectionManagerConfig;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(config?: Partial<PcConnectionManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.connectionState = {
      isConnected: false,
      lastCheckTime: null,
      lastError: null,
      provider: null,
    };
  }

  /**
   * Get the singleton instance of PcConnectionManager
   * @param config Optional configuration for first-time initialization
   * @returns The singleton instance
   */
  public static getInstance(config?: Partial<PcConnectionManagerConfig>): PcConnectionManager {
    if (PcConnectionManager.instance === null) {
      PcConnectionManager.instance = new PcConnectionManager(config);
    }
    return PcConnectionManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   * @internal
   */
  public static resetInstance(): void {
    PcConnectionManager.instance = null;
  }

  /**
   * Check if the cached connection state is still valid
   * @returns true if cache is within the configured duration, false otherwise
   */
  public isCacheValid(): boolean {
    if (this.connectionState.lastCheckTime === null) {
      return false;
    }

    const now = new Date();
    const elapsed = now.getTime() - this.connectionState.lastCheckTime.getTime();
    return elapsed < this.config.cacheDurationMs;
  }

  /**
   * Get the current connection state
   * Returns cached state if within cache duration
   * @returns The current connection state
   */
  public getConnectionState(): Readonly<ConnectionState> {
    return { ...this.connectionState };
  }

  /**
   * Get the time remaining until cache expires (in milliseconds)
   * @returns Milliseconds until cache expires, or 0 if cache is invalid
   */
  public getCacheTimeRemaining(): number {
    if (!this.isCacheValid() || this.connectionState.lastCheckTime === null) {
      return 0;
    }

    const now = new Date();
    const elapsed = now.getTime() - this.connectionState.lastCheckTime.getTime();
    return Math.max(0, this.config.cacheDurationMs - elapsed);
  }

  /**
   * Update the connection state with new values
   * @param isConnected Whether the connection was successful
   * @param provider Optional provider name for the connection
   * @param error Optional error if connection failed
   */
  public updateConnectionState(
    isConnected: boolean,
    provider?: string,
    error?: Error
  ): void {
    this.connectionState = {
      isConnected,
      lastCheckTime: new Date(),
      lastError: error ?? null,
      provider: provider ?? this.connectionState.provider,
    };
  }

  /**
   * Check connection status, using cache if valid
   * @param checkFn Async function that performs the actual connection check
   * @param forceRefresh If true, ignores cache and performs fresh check
   * @returns Promise resolving to the connection state
   */
  public async checkConnection(
    checkFn: () => Promise<{ success: boolean; error?: Error; provider?: string }>,
    forceRefresh = false
  ): Promise<Readonly<ConnectionState>> {
    // Return cached state if still valid and not forcing refresh
    if (!forceRefresh && this.isCacheValid()) {
      return this.getConnectionState();
    }

    try {
      const result = await checkFn();
      this.updateConnectionState(
        result.success,
        result.provider,
        result.error
      );
    } catch (error) {
      this.updateConnectionState(
        false,
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }

    return this.getConnectionState();
  }

  /**
   * Force refresh the connection state
   * @param checkFn Async function that performs the actual connection check
   * @returns Promise resolving to the fresh connection state
   */
  public async refreshConnection(
    checkFn: () => Promise<{ success: boolean; error?: Error; provider?: string }>
  ): Promise<Readonly<ConnectionState>> {
    return this.checkConnection(checkFn, true);
  }

  /**
   * Clear the cached connection state
   */
  public clearCache(): void {
    this.connectionState = {
      isConnected: false,
      lastCheckTime: null,
      lastError: null,
      provider: null,
    };
  }

  /**
   * Update the cache duration configuration
   * @param durationMs New cache duration in milliseconds
   */
  public setCacheDuration(durationMs: number): void {
    if (durationMs < 0) {
      throw new Error("Cache duration must be a non-negative number");
    }
    this.config.cacheDurationMs = durationMs;
  }

  /**
   * Get the current cache duration configuration
   * @returns Cache duration in milliseconds
   */
  public getCacheDuration(): number {
    return this.config.cacheDurationMs;
  }

  /**
   * Check if currently connected (based on cached state)
   * @returns true if last known state is connected
   */
  public isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  /**
   * Get the last error from a connection attempt
   * @returns The last error or null if no error
   */
  public getLastError(): Error | null {
    return this.connectionState.lastError;
  }

  /**
   * Get the timestamp of the last connection check
   * @returns Date of last check or null if never checked
   */
  public getLastCheckTime(): Date | null {
    return this.connectionState.lastCheckTime;
  }

  /**
   * Get the provider associated with the current connection
   * @returns Provider name or null if not set
   */
  public getProvider(): string | null {
    return this.connectionState.provider;
  }
}

/**
 * Export a convenience function to get the singleton instance
 */
export function getPcConnectionManager(
  config?: Partial<PcConnectionManagerConfig>
): PcConnectionManager {
  return PcConnectionManager.getInstance(config);
}
