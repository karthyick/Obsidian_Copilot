/**
 * Supported AI providers
 */
export type AIProvider = "bedrock" | "gemini" | "groq";

/**
 * Plugin settings interface
 */
export interface AIAssistantSettings {
  // Provider selection
  provider: AIProvider;

  // AWS Bedrock settings
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsSessionToken: string;
  awsRegion: string;
  bedrockModelId: string;
  bedrockCustomModelId: string;

  // Google Gemini settings
  geminiApiKey: string;
  geminiModelId: string;
  geminiCustomModelId: string;

  // Groq settings
  groqApiKey: string;
  groqModelId: string;
  groqCustomModelId: string;

  // Common settings
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  autoIncludeContext: boolean;
  streamResponses: boolean;

  // Excluded notes (paths that should never be included in context)
  excludedNotes: string[];
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: AIAssistantSettings = {
  provider: "bedrock",

  // AWS Bedrock
  awsAccessKeyId: "",
  awsSecretAccessKey: "",
  awsSessionToken: "",
  awsRegion: "us-east-1",
  bedrockModelId: "anthropic.claude-sonnet-4-20250514-v1:0",
  bedrockCustomModelId: "",

  // Gemini
  geminiApiKey: "",
  geminiModelId: "gemini-2.0-flash",
  geminiCustomModelId: "",

  // Groq
  groqApiKey: "",
  groqModelId: "llama-3.3-70b-versatile",
  groqCustomModelId: "",

  // Common
  maxTokens: 8192,
  temperature: 0.7,
  systemPrompt: "",
  autoIncludeContext: true,
  streamResponses: true,

  // Excluded notes
  excludedNotes: [],
};

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  editCommands?: EditCommand[];
  mermaidBlocks?: string[];
  applied?: boolean;
}

/**
 * Edit command actions
 */
export type EditAction =
  | "replace_selection"
  | "insert_at_cursor"
  | "replace_range"
  | "find_replace"
  | "update_section"
  | "append"
  | "prepend"
  | "replace_all"
  | "insert_after_heading";

/**
 * Edit command interface
 */
export interface EditCommand {
  action: EditAction;
  params: EditCommandParams;
}

/**
 * Edit command parameters
 */
export interface EditCommandParams {
  text?: string;
  content?: string;
  find?: string;
  replace?: string;
  all?: boolean;
  heading?: string;
  startLine?: number;
  endLine?: number;
}

/**
 * Note context for AI requests
 */
export interface NoteContext {
  path: string;
  basename: string;
  content: string;
  frontmatter: Record<string, unknown> | null;
  selection: string | null;
  selectionRange: {
    startLine: number;
    endLine: number;
    startCh: number;
    endCh: number;
  } | null;
  cursorPosition: {
    line: number;
    ch: number;
  } | null;
}

/**
 * Common LLM message format
 */
export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Bedrock message format (for API calls)
 */
export interface BedrockMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Bedrock request body
 */
export interface BedrockRequestBody {
  anthropic_version: string;
  max_tokens: number;
  temperature: number;
  system: string;
  messages: BedrockMessage[];
}

/**
 * Bedrock response
 */
export interface BedrockResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Bedrock stream event types
 */
export interface BedrockStreamEvent {
  type: string;
  index?: number;
  content_block?: {
    type: string;
    text: string;
  };
  delta?: {
    type: string;
    text?: string;
    stop_reason?: string;
  };
  message?: {
    id: string;
    type: string;
    role: string;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

/**
 * Gemini request content part
 */
export interface GeminiContentPart {
  text: string;
}

/**
 * Gemini request content
 */
export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiContentPart[];
}

/**
 * Gemini request body
 */
export interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: GeminiContentPart[];
  };
  generationConfig: {
    maxOutputTokens: number;
    temperature: number;
  };
}

/**
 * Gemini response
 */
export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Groq request message
 */
export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Groq request body
 */
export interface GroqRequestBody {
  model: string;
  messages: GroqMessage[];
  max_tokens: number;
  temperature: number;
  stream: boolean;
}

/**
 * Groq response
 */
export interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Groq stream chunk
 */
export interface GroqStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

/**
 * Mermaid block info
 */
export interface MermaidBlock {
  code: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Editor position
 */
export interface EditorPosition {
  line: number;
  ch: number;
}

/**
 * Editor range
 */
export interface EditorRange {
  from: EditorPosition;
  to: EditorPosition;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  error?: Error;
}

/**
 * LLM Service interface
 */
export interface ILLMService {
  sendMessage(messages: LLMMessage[], systemPrompt: string): Promise<string>;
  sendMessageStream(
    messages: LLMMessage[],
    systemPrompt: string
  ): AsyncGenerator<string, void, unknown>;
  testConnection(): Promise<ConnectionTestResult>;
  isInitialized(): boolean;
}

/**
 * Available Bedrock models
 */
export const BEDROCK_MODELS: Record<string, string> = {
  "anthropic.claude-sonnet-4-20250514-v1:0": "Claude Sonnet 4 (Latest)",
  "anthropic.claude-3-5-sonnet-20241022-v2:0": "Claude 3.5 Sonnet v2",
  "anthropic.claude-3-5-sonnet-20240620-v1:0": "Claude 3.5 Sonnet",
  "anthropic.claude-3-5-haiku-20241022-v1:0": "Claude 3.5 Haiku",
  "anthropic.claude-3-opus-20240229-v1:0": "Claude 3 Opus",
  "anthropic.claude-3-sonnet-20240229-v1:0": "Claude 3 Sonnet",
  "anthropic.claude-3-haiku-20240307-v1:0": "Claude 3 Haiku",
};

/**
 * Available Gemini models
 */
export const GEMINI_MODELS: Record<string, string> = {
  "gemini-1.5-pro": "Gemini 1.5 Pro",
  "gemini-1.5-flash": "Gemini 1.5 Flash",
  "gemini-1.5-flash-8b": "Gemini 1.5 Flash 8B",
  "gemini-2.0-flash-exp": "Gemini 2.0 Flash (Experimental)",
};

/**
 * Available Groq models
 */
export const GROQ_MODELS: Record<string, string> = {
  "llama-3.3-70b-versatile": "Llama 3.3 70B Versatile",
  "llama-3.1-70b-versatile": "Llama 3.1 70B Versatile",
  "llama-3.1-8b-instant": "Llama 3.1 8B Instant",
  "llama3-groq-70b-8192-tool-use-preview": "Llama 3 Groq 70B Tool Use",
  "mixtral-8x7b-32768": "Mixtral 8x7B",
  "gemma2-9b-it": "Gemma 2 9B",
};

/**
 * AWS regions with Bedrock
 */
export const AWS_REGIONS: Record<string, string> = {
  "us-east-1": "US East (N. Virginia)",
  "us-west-2": "US West (Oregon)",
  "eu-west-1": "Europe (Ireland)",
  "eu-central-1": "Europe (Frankfurt)",
  "ap-southeast-1": "Asia Pacific (Singapore)",
  "ap-northeast-1": "Asia Pacific (Tokyo)",
  "ap-south-1": "Asia Pacific (Mumbai)",
};

/**
 * Provider display names
 */
export const PROVIDER_NAMES: Record<AIProvider, string> = {
  bedrock: "AWS Bedrock (Claude)",
  gemini: "Google Gemini",
  groq: "Groq",
};

/**
 * View type identifier
 */
export const VIEW_TYPE_AI_ASSISTANT = "ai-assistant-view";
