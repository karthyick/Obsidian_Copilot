import { requestUrl } from "obsidian";

/**
 * Model info from API
 */
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

/**
 * Fetches available models from provider APIs
 */
export class ModelFetcher {
  /**
   * Fetch available Gemini models
   */
  public static async fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
    if (!apiKey) {
      return [];
    }

    try {
      const response = await requestUrl({
        url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        method: "GET",
      });

      if (response.status !== 200) {
        console.error("Failed to fetch Gemini models:", response.status);
        return [];
      }

      const data = response.json;
      const models: ModelInfo[] = [];

      for (const model of data.models || []) {
        // Only include models that support generateContent
        const supportedMethods = model.supportedGenerationMethods || [];
        if (supportedMethods.includes("generateContent")) {
          // Extract model ID from the full name (e.g., "models/gemini-1.5-pro" -> "gemini-1.5-pro")
          const modelId = model.name?.replace("models/", "") || "";

          // Skip embedding models and older versions
          if (modelId.includes("embedding") || modelId.includes("aqa")) {
            continue;
          }

          models.push({
            id: modelId,
            name: model.displayName || modelId,
            description: model.description,
            inputTokenLimit: model.inputTokenLimit,
            outputTokenLimit: model.outputTokenLimit,
          });
        }
      }

      // Sort by name, prioritizing newer versions
      models.sort((a, b) => {
        // Prioritize gemini-2.x over gemini-1.x
        const aVersion = a.id.match(/gemini-(\d+)/)?.[1] || "0";
        const bVersion = b.id.match(/gemini-(\d+)/)?.[1] || "0";
        if (aVersion !== bVersion) {
          return parseInt(bVersion) - parseInt(aVersion);
        }
        return a.name.localeCompare(b.name);
      });

      return models;
    } catch (error) {
      console.error("Error fetching Gemini models:", error);
      return [];
    }
  }

  /**
   * Fetch available Groq models
   */
  public static async fetchGroqModels(apiKey: string): Promise<ModelInfo[]> {
    if (!apiKey) {
      return [];
    }

    try {
      const response = await requestUrl({
        url: "https://api.groq.com/openai/v1/models",
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.status !== 200) {
        console.error("Failed to fetch Groq models:", response.status);
        return [];
      }

      const data = response.json;
      const models: ModelInfo[] = [];

      for (const model of data.data || []) {
        // Skip whisper (audio) models
        if (model.id.includes("whisper")) {
          continue;
        }

        models.push({
          id: model.id,
          name: this.formatGroqModelName(model.id),
          description: model.owned_by,
        });
      }

      // Sort by name
      models.sort((a, b) => a.name.localeCompare(b.name));

      return models;
    } catch (error) {
      console.error("Error fetching Groq models:", error);
      return [];
    }
  }

  /**
   * Format Groq model ID to human-readable name
   */
  private static formatGroqModelName(modelId: string): string {
    // Convert model ID to readable name
    const nameMap: Record<string, string> = {
      "llama-3.3-70b-versatile": "Llama 3.3 70B Versatile",
      "llama-3.3-70b-specdec": "Llama 3.3 70B SpecDec",
      "llama-3.1-70b-versatile": "Llama 3.1 70B Versatile",
      "llama-3.1-8b-instant": "Llama 3.1 8B Instant",
      "llama-3.2-1b-preview": "Llama 3.2 1B Preview",
      "llama-3.2-3b-preview": "Llama 3.2 3B Preview",
      "llama-3.2-11b-vision-preview": "Llama 3.2 11B Vision Preview",
      "llama-3.2-90b-vision-preview": "Llama 3.2 90B Vision Preview",
      "llama3-70b-8192": "Llama 3 70B",
      "llama3-8b-8192": "Llama 3 8B",
      "llama3-groq-70b-8192-tool-use-preview": "Llama 3 Groq 70B Tool Use",
      "llama3-groq-8b-8192-tool-use-preview": "Llama 3 Groq 8B Tool Use",
      "mixtral-8x7b-32768": "Mixtral 8x7B",
      "gemma-7b-it": "Gemma 7B",
      "gemma2-9b-it": "Gemma 2 9B",
    };

    return nameMap[modelId] || modelId;
  }

  /**
   * Get fallback Bedrock models
   */
  public static getFallbackBedrockModels(): ModelInfo[] {
    return [
      { id: "anthropic.claude-sonnet-4-20250514-v1:0", name: "Claude Sonnet 4 (Latest)" },
      { id: "anthropic.claude-3-5-sonnet-20241022-v2:0", name: "Claude 3.5 Sonnet v2" },
      { id: "anthropic.claude-3-5-sonnet-20240620-v1:0", name: "Claude 3.5 Sonnet" },
      { id: "anthropic.claude-3-5-haiku-20241022-v1:0", name: "Claude 3.5 Haiku" },
      { id: "anthropic.claude-3-opus-20240229-v1:0", name: "Claude 3 Opus" },
      { id: "anthropic.claude-3-sonnet-20240229-v1:0", name: "Claude 3 Sonnet" },
      { id: "anthropic.claude-3-haiku-20240307-v1:0", name: "Claude 3 Haiku" },
      { id: "other", name: "Other (Custom Model ID)" },
    ];
  }

  /**
   * Get fallback Gemini models (when API key not available)
   */
  public static getFallbackGeminiModels(): ModelInfo[] {
    return [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B" },
      { id: "other", name: "Other (Custom Model ID)" },
    ];
  }

  /**
   * Get fallback Groq models (when API key not available)
   */
  public static getFallbackGroqModels(): ModelInfo[] {
    return [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile" },
      { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B Versatile" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
      { id: "gemma2-9b-it", name: "Gemma 2 9B" },
      { id: "other", name: "Other (Custom Model ID)" },
    ];
  }
}
