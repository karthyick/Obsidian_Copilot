import {
  AIAssistantSettings,
  AIProvider,
  ILLMService,
  LLMMessage,
  ConnectionTestResult,
  PROVIDER_NAMES,
  LLMProviderSettings,
} from "./types";
import { BedrockService } from "./bedrockService";
import { GeminiService } from "./geminiService";
import { GroqService } from "./groqService";

/**
 * Manager for LLM services - handles provider switching and unified API
 */
export class LLMServiceManager {
  private settings: AIAssistantSettings;
  private bedrockService: BedrockService;
  private geminiService: GeminiService;
  private groqService: GroqService;

  constructor(settings: AIAssistantSettings) {
    this.settings = settings;
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
    this.bedrockService.reinitialize(settings.bedrock, commonSettings);
    this.geminiService.reinitialize(settings.gemini, commonSettings);
    this.groqService.reinitialize(settings.groq, commonSettings);
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
  ): Promise<string> {
    const service = this.getActiveService();

    if (!service.isInitialized()) {
      throw new Error(
        `${this.getCurrentProviderName()} is not configured. Please add your credentials in settings.`
      );
    }

    return await service.sendMessage(messages, systemPrompt);
  }

  /**
   * Send a message and stream the response
   */
  public async *sendMessageStream(
    messages: LLMMessage[],
    systemPrompt: string
  ): AsyncGenerator<string, void, unknown> {
    const service = this.getActiveService();

    if (!service.isInitialized()) {
      throw new Error(
        `${this.getCurrentProviderName()} is not configured. Please add your credentials in settings.`
      );
    }

    yield* service.sendMessageStream(messages, systemPrompt);
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
}
