import {
  AIAssistantSettings,
  AIProvider,
  ILLMService,
  LLMMessage,
  ConnectionTestResult,
  PROVIDER_NAMES,
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
    this.bedrockService = new BedrockService(settings);
    this.geminiService = new GeminiService(settings);
    this.groqService = new GroqService(settings);
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
        return this.bedrockService;
    }
  }

  /**
   * Reinitialize all services with updated settings
   */
  public reinitialize(settings: AIAssistantSettings): void {
    this.settings = settings;
    this.bedrockService.reinitialize(settings);
    this.geminiService.reinitialize(settings);
    this.groqService.reinitialize(settings);
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

    switch (provider) {
      case "bedrock":
        service = this.bedrockService;
        break;
      case "gemini":
        service = this.geminiService;
        break;
      case "groq":
        service = this.groqService;
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
        return this.settings.bedrockModelId;
      case "gemini":
        return this.settings.geminiModelId;
      case "groq":
        return this.settings.groqModelId;
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
    return {
      bedrock: {
        configured: this.bedrockService.isInitialized(),
        active: this.settings.provider === "bedrock",
      },
      gemini: {
        configured: this.geminiService.isInitialized(),
        active: this.settings.provider === "gemini",
      },
      groq: {
        configured: this.groqService.isInitialized(),
        active: this.settings.provider === "groq",
      },
    };
  }
}
