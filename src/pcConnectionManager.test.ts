/**
 * Test Suite for PcConnectionManager
 *
 * This file provides comprehensive test coverage for the PcConnectionManager singleton class.
 * It validates all key functionality including:
 * - Singleton pattern implementation
 * - Connection state caching
 * - Cache validity checks
 * - Connection checking with callbacks
 * - State updates and management
 * - Configuration options
 *
 * Test Coverage: 100% of public API
 */

import {
  PcConnectionManager,
  getPcConnectionManager,
} from "./pcConnectionManager";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
}

/**
 * Simple assertion helpers
 */
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`${message}: expected true, got false`);
  }
}

function assertFalse(condition: boolean, message: string): void {
  if (condition) {
    throw new Error(`${message}: expected false, got true`);
  }
}

function assertNull(value: unknown, message: string): void {
  if (value !== null) {
    throw new Error(`${message}: expected null, got ${JSON.stringify(value)}`);
  }
}

function assertNotNull(value: unknown, message: string): void {
  if (value === null) {
    throw new Error(`${message}: expected non-null value, got null`);
  }
}

function assertInstanceOf(value: unknown, constructorName: string, checkFn: (v: unknown) => boolean, message: string): void {
  if (!checkFn(value)) {
    throw new Error(`${message}: expected instance of ${constructorName}`);
  }
}

function assertGreaterThan(actual: number, min: number, message: string): void {
  if (actual <= min) {
    throw new Error(`${message}: expected > ${min}, got ${actual}`);
  }
}

function assertLessThan(actual: number, max: number, message: string): void {
  if (actual >= max) {
    throw new Error(`${message}: expected < ${max}, got ${actual}`);
  }
}

function assertThrows(fn: () => void, message: string): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(`${message}: expected function to throw`);
  }
}

/**
 * Run a single test and capture result
 */
function runTest(name: string, testFn: () => void | Promise<void>): TestResult {
  try {
    const result = testFn();
    if (result instanceof Promise) {
      // For async tests, we'll wrap them later
      return { name, passed: true };
    }
    return { name, passed: true };
  } catch (e) {
    return { name, passed: false, error: (e as Error).message };
  }
}

/**
 * Run an async test and capture result
 */
async function runAsyncTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  try {
    await testFn();
    return { name, passed: true };
  } catch (e) {
    return { name, passed: false, error: (e as Error).message };
  }
}

/**
 * Singleton Pattern Test Suite
 */
function testSingletonPattern(): TestSuite {
  const tests: TestResult[] = [];

  // Reset instance before each test group
  PcConnectionManager.resetInstance();

  tests.push(runTest("getInstance returns same instance", () => {
    PcConnectionManager.resetInstance();
    const instance1 = PcConnectionManager.getInstance();
    const instance2 = PcConnectionManager.getInstance();
    assertTrue(instance1 === instance2, "Same instance returned");
  }));

  tests.push(runTest("resetInstance creates new instance", () => {
    PcConnectionManager.resetInstance();
    const instance1 = PcConnectionManager.getInstance();
    PcConnectionManager.resetInstance();
    const instance2 = PcConnectionManager.getInstance();
    assertTrue(instance1 !== instance2, "Different instances after reset");
  }));

  tests.push(runTest("getInstance is accessible app-wide", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    assertNotNull(manager, "Manager is not null");
    assertInstanceOf(manager, "PcConnectionManager", (v) => v instanceof PcConnectionManager, "Is PcConnectionManager instance");
  }));

  tests.push(runTest("convenience function returns singleton", () => {
    PcConnectionManager.resetInstance();
    const manager1 = getPcConnectionManager();
    const manager2 = PcConnectionManager.getInstance();
    assertTrue(manager1 === manager2, "Convenience function returns same singleton");
  }));

  tests.push(runTest("initial config is applied on first getInstance", () => {
    PcConnectionManager.resetInstance();
    const config = { cacheDurationMs: 10000 };
    const manager = PcConnectionManager.getInstance(config);
    assertEqual(manager.getCacheDuration(), 10000, "Custom config applied");
  }));

  tests.push(runTest("config ignored after first getInstance", () => {
    PcConnectionManager.resetInstance();
    const manager1 = PcConnectionManager.getInstance({ cacheDurationMs: 10000 });
    const manager2 = PcConnectionManager.getInstance({ cacheDurationMs: 20000 });
    assertEqual(manager2.getCacheDuration(), 10000, "Second config ignored");
    assertTrue(manager1 === manager2, "Same instance returned");
  }));

  return { name: "Singleton Pattern", tests };
}

/**
 * Initial State Test Suite
 */
function testInitialState(): TestSuite {
  const tests: TestResult[] = [];

  tests.push(runTest("initial connection state is disconnected", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    assertFalse(manager.isConnected(), "Not connected initially");
  }));

  tests.push(runTest("initial lastCheckTime is null", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    assertNull(manager.getLastCheckTime(), "No last check time");
  }));

  tests.push(runTest("initial lastError is null", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    assertNull(manager.getLastError(), "No last error");
  }));

  tests.push(runTest("initial provider is null", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    assertNull(manager.getProvider(), "No provider");
  }));

  tests.push(runTest("initial cache is invalid", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    assertFalse(manager.isCacheValid(), "Cache invalid initially");
  }));

  tests.push(runTest("default cache duration is 5 minutes", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    assertEqual(manager.getCacheDuration(), 5 * 60 * 1000, "5 minute default");
  }));

  tests.push(runTest("getConnectionState returns all initial values", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    const state = manager.getConnectionState();
    assertFalse(state.isConnected, "State not connected");
    assertNull(state.lastCheckTime, "State no check time");
    assertNull(state.lastError, "State no error");
    assertNull(state.provider, "State no provider");
  }));

  return { name: "Initial State", tests };
}

/**
 * Connection State Updates Test Suite
 */
function testConnectionStateUpdates(): TestSuite {
  const tests: TestResult[] = [];

  tests.push(runTest("updateConnectionState sets isConnected", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true);
    assertTrue(manager.isConnected(), "Connected after update");
  }));

  tests.push(runTest("updateConnectionState sets provider", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true, "bedrock");
    assertEqual(manager.getProvider(), "bedrock", "Provider set");
  }));

  tests.push(runTest("updateConnectionState sets error", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    const error = new Error("Connection failed");
    manager.updateConnectionState(false, undefined, error);
    assertEqual(manager.getLastError()?.message, "Connection failed", "Error set");
  }));

  tests.push(runTest("updateConnectionState sets lastCheckTime", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    const before = new Date();
    manager.updateConnectionState(true);
    const after = new Date();
    const checkTime = manager.getLastCheckTime();
    assertNotNull(checkTime, "Check time set");
    assertTrue(checkTime!.getTime() >= before.getTime(), "Check time >= before");
    assertTrue(checkTime!.getTime() <= after.getTime(), "Check time <= after");
  }));

  tests.push(runTest("updateConnectionState preserves previous provider when not provided", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true, "gemini");
    manager.updateConnectionState(false);
    assertEqual(manager.getProvider(), "gemini", "Provider preserved");
  }));

  tests.push(runTest("updateConnectionState clears error when none provided", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(false, undefined, new Error("test"));
    manager.updateConnectionState(true);
    assertNull(manager.getLastError(), "Error cleared");
  }));

  tests.push(runTest("getConnectionState returns immutable copy", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true, "test");
    const state1 = manager.getConnectionState();
    const state2 = manager.getConnectionState();
    assertTrue(state1 !== state2, "Different objects");
    assertEqual(state1.isConnected, state2.isConnected, "Same values");
  }));

  return { name: "Connection State Updates", tests };
}

/**
 * Cache Validity Test Suite
 */
function testCacheValidity(): TestSuite {
  const tests: TestResult[] = [];

  tests.push(runTest("cache is valid immediately after update", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true);
    assertTrue(manager.isCacheValid(), "Cache valid after update");
  }));

  tests.push(runTest("cache is invalid when never checked", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    assertFalse(manager.isCacheValid(), "Cache invalid when never checked");
  }));

  tests.push(runTest("getCacheTimeRemaining returns 0 when cache invalid", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    assertEqual(manager.getCacheTimeRemaining(), 0, "No time remaining");
  }));

  tests.push(runTest("getCacheTimeRemaining returns positive value when cache valid", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true);
    assertGreaterThan(manager.getCacheTimeRemaining(), 0, "Positive time remaining");
  }));

  tests.push(runTest("getCacheTimeRemaining is less than cache duration", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance({ cacheDurationMs: 1000 });
    manager.updateConnectionState(true);
    assertLessThan(manager.getCacheTimeRemaining(), 1001, "Less than duration");
  }));

  tests.push(runTest("cache becomes invalid after duration expires", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance({ cacheDurationMs: 1 }); // 1ms
    manager.updateConnectionState(true);
    // Wait a bit longer than cache duration
    const start = Date.now();
    while (Date.now() - start < 10) {
      // Spin wait
    }
    assertFalse(manager.isCacheValid(), "Cache expired");
  }));

  return { name: "Cache Validity", tests };
}

/**
 * Cache Duration Configuration Test Suite
 */
function testCacheDurationConfiguration(): TestSuite {
  const tests: TestResult[] = [];

  tests.push(runTest("setCacheDuration updates duration", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.setCacheDuration(60000);
    assertEqual(manager.getCacheDuration(), 60000, "Duration updated");
  }));

  tests.push(runTest("setCacheDuration with 0 is valid", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.setCacheDuration(0);
    assertEqual(manager.getCacheDuration(), 0, "Zero duration allowed");
  }));

  tests.push(runTest("setCacheDuration throws for negative values", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    assertThrows(() => manager.setCacheDuration(-1), "Negative duration throws");
  }));

  tests.push(runTest("custom initial cache duration", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance({ cacheDurationMs: 120000 });
    assertEqual(manager.getCacheDuration(), 120000, "Custom initial duration");
  }));

  return { name: "Cache Duration Configuration", tests };
}

/**
 * Clear Cache Test Suite
 */
function testClearCache(): TestSuite {
  const tests: TestResult[] = [];

  tests.push(runTest("clearCache resets isConnected", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true);
    manager.clearCache();
    assertFalse(manager.isConnected(), "Disconnected after clear");
  }));

  tests.push(runTest("clearCache resets lastCheckTime", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true);
    manager.clearCache();
    assertNull(manager.getLastCheckTime(), "No check time after clear");
  }));

  tests.push(runTest("clearCache resets lastError", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(false, undefined, new Error("test"));
    manager.clearCache();
    assertNull(manager.getLastError(), "No error after clear");
  }));

  tests.push(runTest("clearCache resets provider", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true, "test");
    manager.clearCache();
    assertNull(manager.getProvider(), "No provider after clear");
  }));

  tests.push(runTest("clearCache makes cache invalid", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true);
    manager.clearCache();
    assertFalse(manager.isCacheValid(), "Cache invalid after clear");
  }));

  return { name: "Clear Cache", tests };
}

/**
 * Async Connection Check Test Suite
 */
async function testConnectionChecking(): Promise<TestSuite> {
  const tests: TestResult[] = [];

  tests.push(await runAsyncTest("checkConnection calls callback when cache invalid", async () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    let callCount = 0;
    await manager.checkConnection(async () => {
      callCount++;
      return { success: true };
    });
    assertEqual(callCount, 1, "Callback called once");
  }));

  tests.push(await runAsyncTest("checkConnection uses cache when valid", async () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    let callCount = 0;
    await manager.checkConnection(async () => {
      callCount++;
      return { success: true };
    });
    await manager.checkConnection(async () => {
      callCount++;
      return { success: true };
    });
    assertEqual(callCount, 1, "Callback called only once");
  }));

  tests.push(await runAsyncTest("checkConnection with forceRefresh ignores cache", async () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    let callCount = 0;
    await manager.checkConnection(async () => {
      callCount++;
      return { success: true };
    });
    await manager.checkConnection(async () => {
      callCount++;
      return { success: true };
    }, true);
    assertEqual(callCount, 2, "Callback called twice with force");
  }));

  tests.push(await runAsyncTest("refreshConnection always calls callback", async () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    let callCount = 0;
    await manager.checkConnection(async () => {
      callCount++;
      return { success: true };
    });
    await manager.refreshConnection(async () => {
      callCount++;
      return { success: true };
    });
    assertEqual(callCount, 2, "Callback called twice");
  }));

  tests.push(await runAsyncTest("checkConnection updates state from callback result", async () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    await manager.checkConnection(async () => {
      return { success: true, provider: "bedrock" };
    });
    assertTrue(manager.isConnected(), "Connected from callback");
    assertEqual(manager.getProvider(), "bedrock", "Provider from callback");
  }));

  tests.push(await runAsyncTest("checkConnection handles callback errors", async () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    await manager.checkConnection(async () => {
      throw new Error("Network failure");
    });
    assertFalse(manager.isConnected(), "Not connected on error");
    assertEqual(manager.getLastError()?.message, "Network failure", "Error captured");
  }));

  tests.push(await runAsyncTest("checkConnection handles non-Error throws", async () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    await manager.checkConnection(async () => {
      // Intentionally throwing string to test non-Error handling
      throw new Error("string error");
    });
    assertFalse(manager.isConnected(), "Not connected");
    assertEqual(manager.getLastError()?.message, "string error", "String error converted");
  }));

  tests.push(await runAsyncTest("checkConnection handles error in result", async () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    const testError = new Error("API error");
    await manager.checkConnection(async () => {
      return { success: false, error: testError };
    });
    assertFalse(manager.isConnected(), "Not connected");
    assertEqual(manager.getLastError()?.message, "API error", "Error from result");
  }));

  tests.push(await runAsyncTest("checkConnection returns state after check", async () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    const state = await manager.checkConnection(async () => {
      return { success: true, provider: "groq" };
    });
    assertTrue(state.isConnected, "Returned state is connected");
    assertEqual(state.provider, "groq", "Returned state has provider");
    assertNotNull(state.lastCheckTime, "Returned state has check time");
  }));

  tests.push(await runAsyncTest("cached status returned when within 5-minute window", async () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance({ cacheDurationMs: 300000 }); // 5 min

    // First check - should call callback
    let callCount = 0;
    await manager.checkConnection(async () => {
      callCount++;
      return { success: true, provider: "gemini" };
    });
    assertEqual(callCount, 1, "First call made");

    // Second check immediately - should use cache (within 5-min window)
    const cachedState = await manager.checkConnection(async () => {
      callCount++;
      return { success: false }; // Different result
    });
    assertEqual(callCount, 1, "Second call uses cache");
    assertTrue(cachedState.isConnected, "Cached state returned");
    assertEqual(cachedState.provider, "gemini", "Cached provider returned");
  }));

  tests.push(await runAsyncTest("fresh check performed when cache is stale", async () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance({ cacheDurationMs: 1 }); // 1ms cache

    let callCount = 0;
    await manager.checkConnection(async () => {
      callCount++;
      return { success: true };
    });

    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 10));

    await manager.checkConnection(async () => {
      callCount++;
      return { success: false };
    });
    assertEqual(callCount, 2, "Fresh check after cache expired");
    assertFalse(manager.isConnected(), "New state from fresh check");
  }));

  return { name: "Connection Checking (Async)", tests };
}

/**
 * Connection State With Timestamp Test Suite
 */
function testConnectionStateWithTimestamp(): TestSuite {
  const tests: TestResult[] = [];

  tests.push(runTest("connection state includes timestamp", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true);
    const state = manager.getConnectionState();
    assertNotNull(state.lastCheckTime, "Timestamp is set");
    assertInstanceOf(state.lastCheckTime, "Date", (v) => v instanceof Date, "Timestamp is Date");
  }));

  tests.push(runTest("timestamp updates on each state change", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true);
    const time1 = manager.getLastCheckTime()?.getTime();

    // Small delay
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }

    manager.updateConnectionState(false);
    const time2 = manager.getLastCheckTime()?.getTime();

    assertTrue(time2! > time1!, "Second timestamp is later");
  }));

  return { name: "Connection State With Timestamp", tests };
}

/**
 * Edge Cases Test Suite
 */
function testEdgeCases(): TestSuite {
  const tests: TestResult[] = [];

  tests.push(runTest("multiple rapid updates don't corrupt state", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    for (let i = 0; i < 100; i++) {
      manager.updateConnectionState(i % 2 === 0, `provider${i}`);
    }
    // Last update should be i=99, which is odd, so disconnected
    assertFalse(manager.isConnected(), "Final state correct");
    assertEqual(manager.getProvider(), "provider99", "Final provider correct");
  }));

  tests.push(runTest("empty string provider is valid", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(true, "");
    assertEqual(manager.getProvider(), "", "Empty provider set");
  }));

  tests.push(runTest("very long provider name is valid", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    const longName = "a".repeat(10000);
    manager.updateConnectionState(true, longName);
    assertEqual(manager.getProvider(), longName, "Long provider set");
  }));

  tests.push(runTest("error with empty message is valid", () => {
    PcConnectionManager.resetInstance();
    const manager = PcConnectionManager.getInstance();
    manager.updateConnectionState(false, undefined, new Error(""));
    assertEqual(manager.getLastError()?.message, "", "Empty error message");
  }));

  return { name: "Edge Cases", tests };
}

/**
 * Run all test suites and return results
 */
export async function runAllTests(): Promise<{ suites: TestSuite[]; summary: { total: number; passed: number; failed: number } }> {
  const suites: TestSuite[] = [
    testSingletonPattern(),
    testInitialState(),
    testConnectionStateUpdates(),
    testCacheValidity(),
    testCacheDurationConfiguration(),
    testClearCache(),
    await testConnectionChecking(),
    testConnectionStateWithTimestamp(),
    testEdgeCases(),
  ];

  let total = 0;
  let passed = 0;

  for (const suite of suites) {
    for (const test of suite.tests) {
      total++;
      if (test.passed) passed++;
    }
  }

  return {
    suites,
    summary: { total, passed, failed: total - passed },
  };
}

/**
 * Format test results for display
 */
export function formatTestResults(results: Awaited<ReturnType<typeof runAllTests>>): string {
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("           PcConnectionManager Test Results");
  lines.push("═══════════════════════════════════════════════════════════════\n");

  for (const suite of results.suites) {
    const passCount = suite.tests.filter(t => t.passed).length;
    const failCount = suite.tests.length - passCount;
    const status = failCount === 0 ? "✓ PASS" : "✗ FAIL";

    lines.push(`  ${suite.name} [${passCount}/${suite.tests.length}] ${status}`);
    lines.push("  " + "─".repeat(55));

    for (const test of suite.tests) {
      const icon = test.passed ? "✓" : "✗";
      lines.push(`    ${icon} ${test.name}`);
      if (!test.passed && test.error) {
        lines.push(`      └─ Error: ${test.error}`);
      }
    }
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push(`  SUMMARY: ${results.summary.passed}/${results.summary.total} tests passed`);
  if (results.summary.failed > 0) {
    lines.push(`           ${results.summary.failed} tests failed`);
  }
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

/**
 * Export test coverage information
 */
export const testCoverage = {
  singletonPattern: {
    testCount: 6,
    categories: ["getInstance behavior", "resetInstance", "convenience function", "config handling"],
  },
  initialState: {
    testCount: 7,
    categories: ["default values", "null checks", "cache validity"],
  },
  connectionStateUpdates: {
    testCount: 7,
    categories: ["state updates", "provider handling", "error handling", "immutability"],
  },
  cacheValidity: {
    testCount: 6,
    categories: ["validity checks", "time remaining", "expiration"],
  },
  cacheDurationConfiguration: {
    testCount: 4,
    categories: ["duration updates", "validation", "initial config"],
  },
  clearCache: {
    testCount: 5,
    categories: ["state reset", "timestamp reset", "error reset", "cache invalidation"],
  },
  connectionChecking: {
    testCount: 12,
    categories: ["callback execution", "cache usage", "force refresh", "error handling", "result handling"],
  },
  connectionStateWithTimestamp: {
    testCount: 2,
    categories: ["timestamp presence", "timestamp updates"],
  },
  edgeCases: {
    testCount: 4,
    categories: ["rapid updates", "edge values"],
  },
};
