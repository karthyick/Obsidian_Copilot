import { requestUrl } from "obsidian";
import {
  GroqSettings,
  LLMMessage,
  ConnectionTestResult,
  ILLMService,
  GroqRequestBody,
  GroqResponse,
  GroqMessage,
  GroqStreamChunk,
  LLMProviderSettings,
  AIProvider,
} from "./types";

/**
 * Service for interacting with Groq API
 */
export class GroqService implements ILLMService {
  public readonly providerName: AIProvider = "groq";
  private groqSettings: GroqSettings;
  public commonSettings: LLMProviderSettings;
  private baseUrl = "https://api.groq.com/openai/v1";

  constructor(groqSettings: GroqSettings, commonSettings: LLMProviderSettings) {
    this.groqSettings = groqSettings;
    this.commonSettings = commonSettings;
  }

  /**
   * Reinitialize with updated settings
   */
  public reinitialize(groqSettings: GroqSettings, commonSettings: LLMProviderSettings): void {
    this.groqSettings = groqSettings;
    this.commonSettings = commonSettings;
  }

  /**
   * Check if the service is properly initialized
   */
  public isInitialized(): boolean {
    return !!this.groqSettings.groqApiKey;
  }

  /**
   * Test the connection to Groq
   */
  public async testConnection(): Promise<ConnectionTestResult> {
    if (!this.groqSettings.groqApiKey) {
      return {
        success: false,
        message: "Groq API key is not configured",
      };
    }

    try {
      const response = await this.sendMessage(
        [{ role: "user", content: "Reply with 'OK'" }],
        "Reply with 'OK'"
      );

      if (response) {
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
      return {
        success: false,
        message: this.parseError(error),
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
  ): Promise<string> {
    if (!this.groqSettings.groqApiKey) {
      throw new Error("Groq API key is not configured");
    }

    const groqMessages = this.convertToGroqFormat(messages, systemPrompt);
    const requestBody: GroqRequestBody = {
      model: this.getEffectiveModelId(),
      messages: groqMessages,
      max_tokens: this.commonSettings.maxTokens,
      temperature: this.commonSettings.temperature,
      stream: false,
    };

    try {
      const response = await requestUrl({
        url: `${this.baseUrl}/chat/completions`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.groqSettings.groqApiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = response.json as GroqResponse;

      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }

      throw new Error("Empty response from Groq");
    } catch (error) {
      throw new Error(this.parseError(error));
    }
  }

  /**
   * Send a message and stream the response
   */
  public async *sendMessageStream(
    messages: LLMMessage[],
    systemPrompt: string
  ): AsyncGenerator<string, void, unknown> {
    if (!this.groqSettings.groqApiKey) {
      throw new Error("Groq API key is not configured");
    }

    const groqMessages = this.convertToGroqFormat(messages, systemPrompt);
    const requestBody: GroqRequestBody = {
      model: this.getEffectiveModelId(),
      messages: groqMessages,
      max_tokens: this.commonSettings.maxTokens,
      temperature: this.commonSettings.temperature,
      stream: true,
    };

    try {
      // REQUIRED: We use native fetch here because Obsidian's requestUrl doesn't support
      // ReadableStream responses, which is required for Server-Sent Events (SSE) streaming.
      // For non-streaming requests, we correctly use requestUrl (see sendMessage method).
      // This is a technical limitation of Obsidian's API, not a preference.
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.groqSettings.groqApiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr && jsonStr !== "[DONE]") {
              try {
                const chunk = JSON.parse(jsonStr) as GroqStreamChunk;
                if (chunk.choices?.[0]?.delta?.content) {
                  yield chunk.choices[0].delta.content;
                }
              } catch {
                // Skip invalid JSON chunks
              }
            }
          }
        }
      }
    } catch (error) {
      throw new Error(this.parseError(error));
    }
  }

  /**
   * Convert LLMMessage array to Groq format
   */
  private convertToGroqFormat(
    messages: LLMMessage[],
    systemPrompt: string
  ): GroqMessage[] {
    const groqMessages: GroqMessage[] = [];

    // Add system prompt first
    if (systemPrompt) {
      groqMessages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    // Add conversation messages
    for (const msg of messages) {
      if (msg.role === "system") {
        // System messages are already handled
        continue;
      }

      groqMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return groqMessages;
  }

  /**
   * Parse error messages
   */
  private parseError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes("401")) {
        return "Authentication failed. Please check your Groq API key.";
      }
      if (message.includes("429")) {
        return "Rate limit exceeded. Please wait and try again.";
      }
      if (message.includes("404")) {
        return "Model not found. Please check the model ID.";
      }
      if (message.includes("400")) {
        return "Invalid request. Please check your message format.";
      }
      if (message.includes("500") || message.includes("503")) {
        return "Groq service error. Please try again later.";
      }

      return message;
    }

    return String(error);
  }

  /**
   * Get the effective model ID (custom if "other" selected)
   */
  private getEffectiveModelId(): string {
    if (this.groqSettings.groqModelId === "other") {
      return this.groqSettings.groqCustomModelId || "llama-3.3-70b-versatile";
    }
    return this.groqSettings.groqModelId;
  }
}
