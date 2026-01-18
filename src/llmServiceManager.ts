import {
  AIAssistantSettings,
  AIProvider,
  ILLMService,
  LLMMessage,
  ConnectionTestResult,
  PROVIDER_NAMES,
  LLMProviderSettings,
  LLMUsage,
  LLMResult,
} from "./types";
import { BedrockService } from "./bedrockService";
import { GeminiService } from "./geminiService";
import { GroqService } from "./groqService";
import { TelemetryManager } from "./telemetry"; // New import
import {
  PerformanceOrchestrator,
  OptimizedLLMRequest,
  OptimizedLLMResponse
} from "./performance/index";

/**
 * Manager for LLM services - handles provider switching and unified API
 */
export class LLMServiceManager {
  private settings: AIAssistantSettings;
  private bedrockService: BedrockService;
  private geminiService: GeminiService;
  private groqService: GroqService;
  private telemetryManager: TelemetryManager; // New property
  private performanceOrchestrator: PerformanceOrchestrator;

  constructor(settings: AIAssistantSettings, telemetryManager?: TelemetryManager) {
    this.settings = settings;
    this.telemetryManager = telemetryManager || new TelemetryManager(); // Initialize telemetryManager with fallback

    // Initialize performance orchestrator
    this.performanceOrchestrator = new PerformanceOrchestrator({
      enableCaching: true,
      enableContextOptimization: true,
      enableTokenOptimization: true,
      enableRetry: true,
      enableMonitoring: true,
      maxCacheSizeMB: 100,
      cacheTTL: 30 * 60 * 1000, // 30 minutes
    }, this.telemetryManager);

    const commonSettings: LLMProviderSettings = {
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      systemPrompt: settings.systemPrompt,
      autoIncludeContext: settings.autoIncludeContext,
      streamResponses: settings.streamResponses,
      excludedNotes: settings.excludedNotes,
    };
    this.bedrockService = new BedrockService(settings.bedrock, commonSettings);
    this.geminiService = new GeminiService(settings.gemini, commonSettings);
    this.groqService = new GroqService(settings.groq, commonSettings);
  }

  /**
   * Get the current active service based on settings
   */
  private getActiveService(): ILLMService {
    switch (this.settings.provider) {
      case "bedrock":
        return this.bedrockService;
      case "gemini":
        return this.geminiService;
      case "groq":
        return this.groqService;
      default:
        return this.bedrockService; // Default to Bedrock if provider is not set or unknown
    }
  }

  /**
   * Reinitialize all services with updated settings
   */
  public reinitialize(settings: AIAssistantSettings): void {
    this.settings = settings;
    const commonSettings: LLMProviderSettings = {
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      systemPrompt: settings.systemPrompt,
      autoIncludeContext: settings.autoIncludeContext,
      streamResponses: settings.streamResponses,
      excludedNotes: settings.excludedNotes,
    };

    // Reinitialize each service with its specific settings and the common settings
    this.bedrockService.reinitialize(commonSettings, settings.bedrock);
    this.geminiService.reinitialize(commonSettings, settings.gemini);
    this.groqService.reinitialize(commonSettings, settings.groq);
  }

  /**
   * Check if the current provider is properly initialized
   */
  public isInitialized(): boolean {
    return this.getActiveService().isInitialized();
  }

  /**
   * Get the current provider name
   */
  public getCurrentProvider(): AIProvider {
    return this.settings.provider;
  }

  /**
   * Get the display name of the current provider
   */
  public getCurrentProviderName(): string {
    return PROVIDER_NAMES[this.settings.provider];
  }

  /**
   * Test connection to the current provider
   */
  public async testConnection(): Promise<ConnectionTestResult> {
    const service = this.getActiveService();

    if (!service.isInitialized()) {
      return {
        success: false,
        message: `${this.getCurrentProviderName()} is not configured. Please add your credentials.`,
      };
    }

    return await service.testConnection();
  }

  /**
   * Test connection to a specific provider
   */
  public async testProviderConnection(
    provider: AIProvider
  ): Promise<ConnectionTestResult> {
    let service: ILLMService;

    // Create common settings from the current general settings
    const commonSettings: LLMProviderSettings = {
      maxTokens: this.settings.maxTokens,
      temperature: this.settings.temperature,
      systemPrompt: this.settings.systemPrompt,
      autoIncludeContext: this.settings.autoIncludeContext,
      streamResponses: this.settings.streamResponses,
      excludedNotes: this.settings.excludedNotes,
    };

    switch (provider) {
      case "bedrock":
        // Dynamically create a service for testing with specific settings
        service = new BedrockService(this.settings.bedrock, commonSettings);
        break;
      case "gemini":
        service = new GeminiService(this.settings.gemini, commonSettings);
        break;
      case "groq":
        service = new GroqService(this.settings.groq, commonSettings);
        break;
      default:
        return {
          success: false,
          message: "Unknown provider",
        };
    }

    if (!service.isInitialized()) {
      return {
        success: false,
        message: `${PROVIDER_NAMES[provider]} is not configured. Please add your credentials.`,
      };
    }

    return await service.testConnection();
  }

  /**
   * Send a message and get a complete response
   */
  public async sendMessage(
    messages: LLMMessage[],
    systemPrompt: string
  ): Promise<LLMResult> {
    const service = this.getActiveService();
    const providerName = this.getCurrentProviderName();
    const modelId = this.getCurrentModelId();
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;
    let usage: LLMUsage | undefined;
    
    if (!service.isInitialized()) {
      errorMessage = `${providerName} is not configured. Please add your credentials in settings.`;
      this.telemetryManager.recordLlmCall(
        this.settings.provider,
        modelId,
        Date.now() - startTime,
        undefined,
        undefined,
        false,
        errorMessage
      );
      throw new Error(errorMessage);
    }

    try {
      const response = await service.sendMessage(messages, systemPrompt);
      usage = response.usage;
      success = true;
      return response;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      this.telemetryManager.recordLlmCall(
        this.settings.provider,
        modelId,
        Date.now() - startTime,
        usage?.inputTokens,
        usage?.outputTokens,
        success,
        errorMessage
      );
    }
  }

  /**
   * Send a message and stream the response
   */
  public async *sendMessageStream(
    messages: LLMMessage[],
    systemPrompt: string,
    signal?: AbortSignal // Add AbortSignal parameter
  ): AsyncGenerator<string, LLMUsage, unknown> {
    const service = this.getActiveService();
    const providerName = this.getCurrentProviderName();
    const modelId = this.getCurrentModelId();
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;
    let usage: LLMUsage | undefined;

    if (!service.isInitialized()) {
      errorMessage = `${providerName} is not configured. Please add your credentials in settings.`;
      this.telemetryManager.recordLlmCall(
        this.settings.provider,
        modelId,
        Date.now() - startTime,
        undefined,
        undefined,
        false,
        errorMessage
      );
      throw new Error(errorMessage);
    }

    try {
      const streamGenerator = service.sendMessageStream(messages, systemPrompt, signal); // Pass signal here
      let result: IteratorResult<string, LLMUsage | void>;

      // Manually iterate to capture the final return value (LLMUsage)
      while (true) {
        result = await streamGenerator.next();
        if (result.done) {
          if (result.value) { // The LLMUsage object
            usage = result.value as LLMUsage;
          }
          break; // Generator is done
        }
        yield result.value; // Yield content chunks
      }
      success = true;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      this.telemetryManager.recordLlmCall(
        this.settings.provider,
        modelId,
        Date.now() - startTime,
        usage?.inputTokens,
        usage?.outputTokens,
        success,
        errorMessage
      );
    }
  }

  /**
   * Get the current model ID based on provider
   */
  public getCurrentModelId(): string {
    switch (this.settings.provider) {
      case "bedrock":
        return this.settings.bedrock.bedrockModelId;
      case "gemini":
        return this.settings.gemini.geminiModelId;
      case "groq":
        return this.settings.groq.groqModelId;
      default:
        return "";
    }
  }

  /**
   * Get status info for all providers
   */
  public getProvidersStatus(): Record<
    AIProvider,
    { configured: boolean; active: boolean }
  > {
    // To check configuration status, we need to instantiate services with their respective settings.
    // However, to avoid creating new instances each time and potential side effects,
    // we can directly check the settings stored in this.settings
    const commonSettings: LLMProviderSettings = {
      maxTokens: this.settings.maxTokens,
      temperature: this.settings.temperature,
      systemPrompt: this.settings.systemPrompt,
      autoIncludeContext: this.settings.autoIncludeContext,
      streamResponses: this.settings.streamResponses,
      excludedNotes: this.settings.excludedNotes,
    };

    // Creating temporary service instances for status check
    // This is safe as it doesn't modify state and is only for checking isInitialized
    const bedrockConfigured = new BedrockService(this.settings.bedrock, commonSettings).isInitialized();
    const geminiConfigured = new GeminiService(this.settings.gemini, commonSettings).isInitialized();
    const groqConfigured = new GroqService(this.settings.groq, commonSettings).isInitialized();


    return {
      bedrock: {
        configured: bedrockConfigured,
        active: this.settings.provider === "bedrock",
      },
      gemini: {
        configured: geminiConfigured,
        active: this.settings.provider === "gemini",
      },
      groq: {
        configured: groqConfigured,
        active: this.settings.provider === "groq",
      },
    };
  }

  /**
   * Send a message using the optimized performance system
   */
  public async sendMessageOptimized(
    messages: LLMMessage[],
    systemPrompt: string,
    signal?: AbortSignal
  ): Promise<OptimizedLLMResponse> {
    const request: OptimizedLLMRequest = {
      messages,
      systemPrompt,
      provider: this.settings.provider,
      modelId: this.getCurrentModelId(),
      options: {
        maxTokens: this.settings.maxTokens,
        temperature: this.settings.temperature,
      },
      signal,
    };

    return await this.performanceOrchestrator.processRequest(request);
  }

  /**
   * Get current LLM service for direct access (used by performance orchestrator)
   */
  public getCurrentLLMService(): ILLMService | null {
    const service = this.getActiveService();
    return service.isInitialized() ? service : null;
  }

  /**
   * Get performance report for the LLM service manager
   */
  public async getPerformanceReport() {
    return await this.performanceOrchestrator.generatePerformanceReport();
  }

  /**
   * Update performance configuration
   */
  public updatePerformanceConfig(config: any) {
    this.performanceOrchestrator.updateConfig(config);
  }

  /**
   * Get performance system status
   */
  public getPerformanceStatus() {
    return this.performanceOrchestrator.getSystemStatus();
  }

  /**
   * Clear performance caches
   */
  public async clearPerformanceCaches() {
    await this.performanceOrchestrator.clearCaches();
  }
}
