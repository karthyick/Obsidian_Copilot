import { requestUrl } from "obsidian";
import {
  GeminiSettings,
  LLMMessage,
  ConnectionTestResult,
  ILLMService,
  GeminiRequestBody,
  GeminiResponse,
  GeminiContent,
  LLMProviderSettings,
  AIProvider,
} from "./types";

/**
 * Service for interacting with Google Gemini API
 */
export class GeminiService implements ILLMService {
  public readonly providerName: AIProvider = "gemini";
  private geminiSettings: GeminiSettings;
  public commonSettings: LLMProviderSettings;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor(geminiSettings: GeminiSettings, commonSettings: LLMProviderSettings) {
    this.geminiSettings = geminiSettings;
    this.commonSettings = commonSettings;
  }

  /**
   * Reinitialize with updated settings
   */
  public reinitialize(geminiSettings: GeminiSettings, commonSettings: LLMProviderSettings): void {
    this.geminiSettings = geminiSettings;
    this.commonSettings = commonSettings;
  }

  /**
   * Check if the service is properly initialized
   */
  public isInitialized(): boolean {
    return !!this.geminiSettings.geminiApiKey;
  }

  /**
   * Test the connection to Gemini
   */
  public async testConnection(): Promise<ConnectionTestResult> {
    if (!this.geminiSettings.geminiApiKey) {
      return {
        success: false,
        message: "Gemini API key is not configured",
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
    if (!this.geminiSettings.geminiApiKey) {
      throw new Error("Gemini API key is not configured");
    }

    const contents = this.convertToGeminiFormat(messages);
    const requestBody: GeminiRequestBody = {
      contents,
      generationConfig: {
        maxOutputTokens: this.commonSettings.maxTokens,
        temperature: this.commonSettings.temperature,
      },
    };

    if (systemPrompt) {
      requestBody.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    const url = `${this.baseUrl}/models/${this.getEffectiveModelId()}:generateContent?key=${this.geminiSettings.geminiApiKey}`;

    try {
      const response = await requestUrl({
        url,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = response.json as GeminiResponse;

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content?.parts?.length > 0) {
          return candidate.content.parts.map((p) => p.text).join("");
        }
      }

      throw new Error("Empty response from Gemini");
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
    if (!this.geminiSettings.geminiApiKey) {
      throw new Error("Gemini API key is not configured");
    }

    const contents = this.convertToGeminiFormat(messages);
    const requestBody: GeminiRequestBody = {
      contents,
      generationConfig: {
        maxOutputTokens: this.commonSettings.maxTokens,
        temperature: this.commonSettings.temperature,
      },
    };

    if (systemPrompt) {
      requestBody.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    const url = `${this.baseUrl}/models/${this.getEffectiveModelId()}:streamGenerateContent?key=${this.geminiSettings.geminiApiKey}&alt=sse`;

    try {
      // REQUIRED: We use native fetch here because Obsidian's requestUrl doesn't support
      // ReadableStream responses, which is required for Server-Sent Events (SSE) streaming.
      // For non-streaming requests, we correctly use requestUrl (see sendMessage method).
      // This is a technical limitation of Obsidian's API, not a preference.
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
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
                const data = JSON.parse(jsonStr);
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                  yield data.candidates[0].content.parts[0].text;
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
   * Convert LLMMessage array to Gemini format
   */
  private convertToGeminiFormat(messages: LLMMessage[]): GeminiContent[] {
    const contents: GeminiContent[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        // System messages are handled separately in Gemini
        continue;
      }

      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    return contents;
  }

  /**
   * Parse error messages
   */
  private parseError(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes("401") || message.includes("403")) {
        return "Authentication failed. Please check your Gemini API key.";
      }
      if (message.includes("429")) {
        return "Rate limit exceeded. Please wait and try again.";
      }
      if (message.includes("404")) {
        return "Model not found. Please check the model ID.";
      }
      if (message.includes("500") || message.includes("503")) {
        return "Gemini service error. Please try again later.";
      }

      return message;
    }

    return String(error);
  }

  /**
   * Get the effective model ID (custom if "other" selected)
   */
  private getEffectiveModelId(): string {
    if (this.geminiSettings.geminiModelId === "other") {
      return this.geminiSettings.geminiCustomModelId || "gemini-2.0-flash";
    }
    return this.geminiSettings.geminiModelId;
  }
}
