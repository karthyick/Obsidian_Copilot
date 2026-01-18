import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  BedrockMessage,
  BedrockRequestBody,
  BedrockResponse,
  BedrockSettings,
  ConnectionTestResult,
  ILLMService,
  LLMMessage,
  LLMProviderSettings,
  AIProvider,
} from "./types";

/**
 * Service for interacting with AWS Bedrock Claude models
 */
export class BedrockService implements ILLMService {
  public readonly providerName: AIProvider = "bedrock";
  private client: BedrockRuntimeClient | null = null;
  private bedrockSettings: BedrockSettings;
  public commonSettings: LLMProviderSettings;

  constructor(bedrockSettings: BedrockSettings, commonSettings: LLMProviderSettings) {
    this.bedrockSettings = bedrockSettings;
    this.commonSettings = commonSettings;
    this.initializeClient();
  }

  /**
   * Initialize the Bedrock client with current settings
   */
  private initializeClient(): void {
    if (!this.bedrockSettings.awsAccessKeyId || !this.bedrockSettings.awsSecretAccessKey) {
      this.client = null;
      return;
    }

    const credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    } = {
      accessKeyId: this.bedrockSettings.awsAccessKeyId,
      secretAccessKey: this.bedrockSettings.awsSecretAccessKey,
    };

    if (this.bedrockSettings.awsSessionToken) {
      credentials.sessionToken = this.bedrockSettings.awsSessionToken;
    }

    this.client = new BedrockRuntimeClient({
      region: this.bedrockSettings.awsRegion,
      credentials,
    });
  }

  /**
   * Reinitialize the client with updated settings
   */
  public reinitialize(commonSettings: LLMProviderSettings, providerSpecificSettings: BedrockSettings): void {
    this.bedrockSettings = providerSpecificSettings;
    this.commonSettings = commonSettings;
    this.initializeClient();
  }

  /**
   * Check if the client is properly initialized
   */
  public isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Test the connection to Bedrock
   */
  public async testConnection(): Promise<ConnectionTestResult> {
    if (!this.client) {
      return {
        success: false,
        message: "Client not initialized. Please configure AWS credentials.",
      };
    }

    try {
      // Send a minimal test message
      const requestBody: BedrockRequestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 10,
        temperature: 0,
        system: "Reply with 'OK'",
        messages: [{ role: "user", content: "Test" }],
      };

      const command = new InvokeModelCommand({
        modelId: this.getEffectiveModelId(),
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(requestBody),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body)
      ) as BedrockResponse;

      if (responseBody.content && responseBody.content.length > 0) {
        return {
          success: true,
          message: "Connection successful",
        };
      }

      return {
        success: false,
        message: "Unexpected response format",
      };
    } catch (error) {
      const errorMessage = this.parseError(error);
      return {
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Send a message and get a complete response (non-streaming)
   */
  public async sendMessage(
    messages: LLMMessage[],
    systemPrompt: string
  ): Promise<LLMResult> {
    if (!this.client) {
      throw new Error("Bedrock client not initialized. Please configure AWS credentials.");
    }

    const bedrockMessages = this.convertToBedrockFormat(messages);
    const requestBody: BedrockRequestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: this.commonSettings.maxTokens,
      temperature: this.commonSettings.temperature,
      system: systemPrompt,
      messages: bedrockMessages,
    };

    const command = new InvokeModelCommand({
      modelId: this.getEffectiveModelId(),
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    });

    try {
      const response = await this.client.send(command);
      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body)
      ) as BedrockResponse;

      if (responseBody.content && responseBody.content.length > 0) {
        const content = responseBody.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("");
        
        const usage: LLMUsage = {
          inputTokens: responseBody.usage?.input_tokens,
          outputTokens: responseBody.usage?.output_tokens,
        };

        return { content, usage };
      }

      throw new Error("Empty response from Bedrock");
    } catch (error) {
      throw new Error(this.parseError(error));
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
    if (!this.client) {
      throw new Error("Bedrock client not initialized. Please configure AWS credentials.");
    }

    const bedrockMessages = this.convertToBedrockFormat(messages);
    const requestBody: BedrockRequestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: this.commonSettings.maxTokens,
      temperature: this.commonSettings.temperature,
      system: systemPrompt,
      messages: bedrockMessages,
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: this.getEffectiveModelId(),
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    });

    let inputTokens: number | undefined;
    let outputTokens: number = 0; // Initialize with 0 for streaming partial results
    let finalUsage: LLMUsage | undefined;

    try {
      const response = await this.client.send(command, { abortSignal: signal }); // Pass signal here

      if (!response.body) {
        throw new Error("No response body received");
      }

      for await (const event of response.body) {
        if (signal?.aborted) { // Check if the request was aborted
          throw new Error("Bedrock stream aborted by user.");
        }
        if (event.chunk?.bytes) {
          const chunkData = JSON.parse(
            new TextDecoder().decode(event.chunk.bytes)
          );

          // Handle different event types in the stream
          if (chunkData.type === "content_block_delta") {
            if (chunkData.delta?.type === "text_delta" && chunkData.delta?.text) {
              yield chunkData.delta.text;
              // A simple char count is a proxy for token count in stream
              // A more accurate count would require a tokenizer
              outputTokens += chunkData.delta.text.length > 0 ? chunkData.delta.text.split(/\s+/).length || 1 : 0;
            }
          } else if (chunkData.type === "message_start") {
            inputTokens = chunkData.message.usage.input_tokens;
          }
          else if (chunkData.type === "message_delta") {
            // outputTokens can be updated here from chunkData.usage.output_tokens if available in this event
            // Bedrock's message_delta doesn't always provide output_tokens for every delta,
            // but message_stop or message_start has comprehensive usage.
          }
          else if (chunkData.type === "message_stop") {
            // This event contains the final usage information
            if (chunkData.amazon_bedrock_invocationMetrics) {
              inputTokens = chunkData.amazon_bedrock_invocationMetrics.inputTokenCount;
              outputTokens = chunkData.amazon_bedrock_invocationMetrics.outputTokenCount;
            }
            finalUsage = { inputTokens, outputTokens };
            return finalUsage; // Return the usage at the end of the generator
          }
          else if (chunkData.type === "error") {
            throw new Error(chunkData.error?.message || "Stream error");
          }
        }
      }
      return finalUsage; // Ensure a return even if message_stop is not explicitly handled by for-await-of loop
    } catch (error) {
      throw new Error(this.parseError(error));
    }
  }

  /**
   * Convert LLMMessage array to Bedrock format
   */
  private convertToBedrockFormat(messages: LLMMessage[]): BedrockMessage[] {
    const bedrockMessages: BedrockMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        // System messages are handled separately in Bedrock
        continue;
      }

      bedrockMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return bedrockMessages;
  }

  /**
   * Parse error messages from AWS SDK
   */
  private parseError(error: unknown): string {
    if (error instanceof Error) {
      const errorName = error.name;
      const errorMessage = error.message;

      switch (errorName) {
        case "AccessDeniedException":
          return "Access denied. Check your AWS credentials and model access permissions.";
        case "ValidationException":
          return `Validation error: ${errorMessage}`;
        case "ThrottlingException":
          return "Request throttled. Please wait and try again.";
        case "ServiceQuotaExceededException":
          return "Service quota exceeded. Please check your Bedrock limits.";
        case "ModelNotReadyException":
          return "Model is not ready. Please wait and try again.";
        case "ModelTimeoutException":
          return "Model request timed out. Please try again.";
        case "ModelErrorException":
          return `Model error: ${errorMessage}`;
        case "ResourceNotFoundException":
          return "Model not found. Ensure the model is enabled in your AWS region.";
        case "UnauthorizedException":
        case "CredentialsProviderError":
          return "Authentication failed. Please check your AWS credentials.";
        case "NetworkingError":
        case "TimeoutError":
          return "Network error. Please check your internet connection.";
        default:
          return errorMessage || "An unknown error occurred";
      }
    }

    return String(error);
  }

  /**
   * Get the effective model ID (custom if "other" selected)
   */
  private getEffectiveModelId(): string {
    if (this.bedrockSettings.bedrockModelId === "other") {
      return this.bedrockSettings.bedrockCustomModelId || "anthropic.claude-sonnet-4-20250514-v1:0";
    }
    return this.bedrockSettings.bedrockModelId;
  }

  /**
   * Get the current model ID
   */
  public getModelId(): string {
    return this.getEffectiveModelId();
  }

  /**
   * Get the current region
   */
  public getRegion(): string {
    return this.bedrockSettings.awsRegion;
  }
}
