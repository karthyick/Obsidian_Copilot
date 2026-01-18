import { App, MarkdownView } from "obsidian";
import { LLMMessage, AIAssistantSettings, UserFeedback, ContextSummaryOptions, LLMUsage } from "./types";
import { LLMServiceManager } from "./llmServiceManager";
import { FeedbackManager } from "./feedbackManager";
import { TelemetryManager } from "./telemetry";

/**
 * Interface for cross-plugin communication and context sharing with the AI Assistant plugin.
 * Other plugins can use this API to interact with the AI Assistant's LLM services
 * and access relevant context from the Obsidian environment.
 */
export interface ILlmContextApi {
  /**
   * Retrieves specific context data by key.
   * @param key The key of the context data to retrieve.
   * @returns A promise that resolves to the context data as a string, or undefined if not found.
   */
  getContext(key: string): Promise<string | undefined>;

  /**
   * Sets specific context data by key.
   * @param key The key of the context data to set.
   * @param value The context data as a string.
   * @returns A promise that resolves when the context is set.
   */
  setContext(key: string, value: string): Promise<void>;

  /**
   * Retrieves the content of the currently active Markdown file.
   * @returns A promise that resolves to the file content as a string, or undefined if no active file or not a Markdown view.
   */
  getCurrentFileContent(): Promise<string | undefined>;

  /**
   * Retrieves the currently selected text in the active editor.
   * @returns A promise that resolves to the selected text as a string, or undefined if no text is selected or no active editor.
   */
  getSelectedText(): Promise<string | undefined>;

  /**
   * Triggers LLM content generation for a given prompt, streaming the response.
   * This uses the currently configured LLM service in the AI Assistant plugin.
   * @param messages The messages to send to the LLM (e.g., user prompt).
   * @param systemPrompt An optional system prompt to override the default one.
   * @returns An AsyncGenerator that yields string chunks of the generated content.
   */
  streamGenerateContent(
    messages: LLMMessage[],
    systemPrompt?: string,
    signal?: AbortSignal // Add AbortSignal parameter
  ): AsyncGenerator<string, LLMUsage, unknown>;

  /**
   * Retrieves information about the currently active LLM provider.
   * @returns An object containing the provider name, model ID, and capabilities, or undefined if no service is active.
   */
  getLlmProviderInfo(): Promise<{ providerName: string; modelId: string; capabilities?: any; } | undefined>;

  /**
   * Submits user feedback for a given LLM response.
   * @param feedback The UserFeedback object containing details about the feedback.
   * @returns A promise that resolves when the feedback has been submitted.
   */
  submitFeedback(feedback: UserFeedback): Promise<void>;

  /**
   * Retrieves a summarized or optimized version of the current file content.
   * @param options Options for summarizing the context (e.g., max length, strategy).
   * @returns A promise that resolves to the summarized content as a string, or undefined.
   */
  getContextSummary(options?: ContextSummaryOptions): Promise<string | undefined>;

  /**
   * Records a generic telemetry event.
   * @param eventType The type of the event (e.g., 'plugin_action', 'api_call').
   * @param data Arbitrary data associated with the event.
   */
  recordEvent(eventType: string, data: Record<string, any>): void;

  /**
   * Triggers optimized LLM content generation for a given prompt, using performance optimizations.
   * This includes caching, context optimization, token management, and retry logic.
   * @param messages The messages to send to the LLM (e.g., user prompt).
   * @param systemPrompt An optional system prompt to override the default one.
   * @param signal An optional AbortSignal to cancel the request.
   * @returns A promise that resolves to the optimized response.
   */
  generateContentOptimized(
    messages: LLMMessage[],
    systemPrompt?: string,
    signal?: AbortSignal
  ): Promise<{
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
  }>;

  /**
   * Gets a performance report for the AI Assistant plugin.
   * @returns A promise that resolves to a comprehensive performance report.
   */
  getPerformanceReport(): Promise<any>;

  /**
   * Gets the current performance system status.
   * @returns An object containing the status of all performance components.
   */
  getPerformanceStatus(): any;

  /**
   * Clears all performance caches.
   * @returns A promise that resolves when caches are cleared.
   */
  clearPerformanceCaches(): Promise<void>;
}

/**
 * Manages LLM context and provides an API for other plugins to interact with the AI Assistant.
 */
export class LlmContextManager implements ILlmContextApi {
  private app: App;
  private settings: AIAssistantSettings;
  private llmServiceManager: LLMServiceManager;
  private feedbackManager: FeedbackManager;
  private telemetryManager: TelemetryManager; // Add TelemetryManager
  private contextStore: Map<string, string> = new Map();

  constructor(
    app: App,
    settings: AIAssistantSettings,
    llmServiceManager: LLMServiceManager,
    feedbackManager: FeedbackManager,
    telemetryManager: TelemetryManager // Add TelemetryManager to constructor
  ) {
    this.app = app;
    this.settings = settings;
    this.llmServiceManager = llmServiceManager;
    this.feedbackManager = feedbackManager;
    this.telemetryManager = telemetryManager; // Initialize TelemetryManager
  }

  async getContext(key: string): Promise<string | undefined> {
    return this.contextStore.get(key);
  }

  async setContext(key: string, value: string): Promise<void> {
    this.contextStore.set(key, value);
  }

  async getCurrentFileContent(): Promise<string | undefined> {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView && activeView.file) {
      return await this.app.vault.read(activeView.file);
    }
    return undefined;
  }

  async getSelectedText(): Promise<string | undefined> {
    const activeEditor = this.app.workspace.activeEditor;
    if (activeEditor) {
      const editor = activeEditor.editor;
      if (editor) {
        return editor.getSelection();
      }
    }
    return undefined;
  }

  async streamGenerateContent(
    messages: LLMMessage[],
    systemPrompt?: string,
    signal?: AbortSignal // Add AbortSignal parameter
  ): AsyncGenerator<string, LLMUsage, unknown> {
    const currentService = this.llmServiceManager.getCurrentLLMService();
    if (!currentService) {
      throw new Error("No LLM service is currently configured or initialized.");
    }

    const finalSystemPrompt = systemPrompt || this.settings.systemPrompt;
    return this.llmServiceManager.sendMessageStream(messages, finalSystemPrompt, signal); // Pass signal here
  }

  async getLlmProviderInfo(): Promise<{ providerName: string; modelId: string; capabilities?: any; } | undefined> {
    const providerName = this.llmServiceManager.getCurrentProviderName();
    const modelId = this.llmServiceManager.getCurrentModelId();
    if (providerName && modelId) {
      return { providerName, modelId };
    }
    return undefined;
  }

  async submitFeedback(feedback: UserFeedback): Promise<void> {
    await this.feedbackManager.saveFeedbackEntry(feedback);
  }

  async getContextSummary(options?: ContextSummaryOptions): Promise<string | undefined> {
    const content = await this.getCurrentFileContent();
    if (!content) {
      this.telemetryManager.recordEvent('getContextSummary_no_content', {});
      return undefined;
    }

    const { maxLength = 2000, strategy = 'auto' } = options || {}; // Default to 2000 characters, auto strategy

    let summarizedContent = content;
    if (strategy === 'truncate' || (strategy === 'auto' && content.length > maxLength)) {
      summarizedContent = content.substring(0, maxLength);
      if (content.length > maxLength) {
        summarizedContent += '...'; // Indicate truncation
      }
      this.telemetryManager.recordEvent('getContextSummary_truncated', { originalLength: content.length, summaryLength: summarizedContent.length, maxLength });
    } else {
      // For 'summarize' strategy or if content is already short,
      // a more advanced LLM-based summarization would go here.
      // For now, we return the content as is if not truncating.
      this.telemetryManager.recordEvent('getContextSummary_full_content', { originalLength: content.length });
    }
    return summarizedContent;
  }

  recordEvent(eventType: string, data: Record<string, any>): void {
    this.telemetryManager.recordEvent(eventType, data);
  }

  async generateContentOptimized(
    messages: LLMMessage[],
    systemPrompt?: string,
    signal?: AbortSignal
  ): Promise<{
    content: string;
    usage: any;
    metadata: {
      cacheHit: boolean;
      optimized: boolean;
      originalTokens: number;
      finalTokens: number;
      processingTime: number;
      optimizations: string[];
    };
  }> {
    const finalSystemPrompt = systemPrompt || this.settings.systemPrompt;

    // Use the optimized LLM service manager
    const response = await this.llmServiceManager.sendMessageOptimized(
      messages,
      finalSystemPrompt,
      signal
    );

    return {
      content: response.content,
      usage: response.usage,
      metadata: response.metadata,
    };
  }

  async getPerformanceReport(): Promise<any> {
    return await this.llmServiceManager.getPerformanceReport();
  }

  getPerformanceStatus(): any {
    return this.llmServiceManager.getPerformanceStatus();
  }

  async clearPerformanceCaches(): Promise<void> {
    await this.llmServiceManager.clearPerformanceCaches();
  }
}

