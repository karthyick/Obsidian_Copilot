// obsidian_plugin_ai_chatbot/src/utils/logger.ts

export function debug(...args: any[]): void {
  console.log("[AI Assistant DEBUG]", ...args);
}

export function info(...args: any[]): void {
  console.info("[AI Assistant INFO]", ...args);
}

export function warn(...args: any[]): void {
  console.warn("[AI Assistant WARN]", ...args);
}

export function error(...args: any[]): void {
  console.error("[AI Assistant ERROR]", ...args);
}
