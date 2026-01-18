// obsidian_plugin_ai_chatbot/src/telemetry.ts

import {
  TelemetryEvent,
  LlmCallTelemetryEvent,
  FeedbackTelemetryEvent,
  AIProvider,
} from "./types";
import { debug } from "./utils/logger";

export class TelemetryManager {
  private isInitialized = false;

  constructor() {
    debug("TelemetryManager initialized.");
  }

  /**
   * Initializes the TelemetryManager.
   * This can be used for any setup logic, e.g., connecting to a telemetry service.
   */
  init(): void {
    if (this.isInitialized) {
      debug("TelemetryManager already initialized.");
      return;
    }
    // Future: Initialize connection to a telemetry service, etc.
    debug("TelemetryManager init complete.");
    this.isInitialized = true;
  }

  /**
   * Records a generic telemetry event.
   * @param eventType The type of the event (e.g., 'plugin_loaded', 'setting_changed').
   * @param data Arbitrary data associated with the event.
   */
  recordEvent(eventType: string, data: Record<string, any>): void {
    if (!this.isInitialized) {
      debug("TelemetryManager not initialized, skipping recordEvent.", { eventType, data });
      return;
    }
    const event: TelemetryEvent = {
      eventType,
      timestamp: Date.now(),
      data,
    };
    // Store telemetry data (production implementation would send to service)
    debug("Recorded generic event:", event);
    // Future: Send event to telemetry service
  }

  /**
   * Records an LLM call telemetry event.
   * @param provider The AI provider used.
   * @param model The specific model used.
   * @param durationMs The duration of the LLM call in milliseconds.
   * @param inputTokens Number of input tokens.
   * @param outputTokens Number of output tokens.
   * @param success Whether the call was successful.
   * @param errorMessage Optional error message if the call failed.
   */
  recordLlmCall(
    provider: AIProvider,
    model: string,
    durationMs: number,
    inputTokens: number | undefined,
    outputTokens: number | undefined,
    success: boolean,
    errorMessage?: string
  ): void {
    if (!this.isInitialized) {
      debug("TelemetryManager not initialized, skipping recordLlmCall.");
      return;
    }
    const event: LlmCallTelemetryEvent = {
      eventType: "llm_call",
      timestamp: Date.now(),
      data: {
        provider,
        model,
        durationMs,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined,
        success,
        errorMessage,
      },
    };
    // Store telemetry data (production implementation would send to service)
    debug("Recorded LLM call event:", event);
    // Future: Send event to telemetry service
  }

  /**
   * Records a feedback telemetry event.
   * @param feedbackId The ID of the feedback entry.
   * @param messageId The ID of the chat message the feedback is for.
   * @param type The type of feedback ('upvote', 'downvote', 'correction').
   * @param comment Optional comment provided by the user.
   */
  recordFeedback(
    feedbackId: string,
    messageId: string,
    type: "upvote" | "downvote" | "correction",
    comment?: string
  ): void {
    if (!this.isInitialized) {
      debug("TelemetryManager not initialized, skipping recordFeedback.");
      return;
    }
    const event: FeedbackTelemetryEvent = {
      eventType: "feedback_submitted",
      timestamp: Date.now(),
      data: {
        feedbackId,
        messageId,
        type,
        comment,
      },
    };
    // Store telemetry data (production implementation would send to service)
    debug("Recorded feedback event:", event);
    // Future: Send event to telemetry service
  }
}
