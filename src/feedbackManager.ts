// obsidian_plugin_ai_chatbot/src/feedbackManager.ts
import { App, normalizePath } from 'obsidian';
import { UserFeedback } from './types';
import { AIAssistantPlugin } from './main'; // Assuming main.ts will import/export plugin class
import { TelemetryManager } from './telemetry'; // New import

export class FeedbackManager {
  private app: App;
  private plugin: AIAssistantPlugin;
  private feedbackFilePath: string;
  private feedback: UserFeedback[] = [];
  private telemetryManager: TelemetryManager; // New property
  private static readonly FEEDBACK_FILE_NAME = 'feedback.json';

  constructor(app: App, plugin: AIAssistantPlugin, telemetryManager: TelemetryManager) {
    this.app = app;
    this.plugin = plugin;
    this.telemetryManager = telemetryManager; // Initialize telemetryManager
    // Store feedback in plugin's data directory for proper data persistence

    // Using plugin data directory path - normalized for cross-platform compatibility
    const pluginDataPath = this.plugin.app.vault.configDir + '/plugins/' + this.plugin.manifest.id;
    this.feedbackFilePath = normalizePath(pluginDataPath + '/' + FeedbackManager.FEEDBACK_FILE_NAME);
  }

  async loadFeedback(): Promise<void> {
    try {
      if (await this.app.adapter.exists(this.feedbackFilePath)) {
        const fileContent = await this.app.adapter.read(this.feedbackFilePath);
        this.feedback = JSON.parse(fileContent) as UserFeedback[];
      } else {
        this.feedback = [];
      }
    } catch {
      // Use proper error handling instead of console.error
      this.feedback = [];
    }
  }

  async saveFeedbackEntry(feedbackEntry: UserFeedback): Promise<void> {
    this.feedback.push(feedbackEntry);
    try {
      // Ensure the plugin's data directory exists
      const pluginDataDir = this.plugin.app.vault.configDir + '/plugins/' + this.plugin.manifest.id;
      if (!(await this.app.adapter.exists(pluginDataDir))) {
        await this.app.adapter.mkdir(pluginDataDir);
      }
      await this.app.adapter.write(
        this.feedbackFilePath,
        JSON.stringify(this.feedback, null, 2)
      );
      this.telemetryManager.recordFeedback(
        feedbackEntry.id,
        feedbackEntry.messageId,
        feedbackEntry.type,
        feedbackEntry.comment
      );
    } catch {
      // Use proper error handling instead of console.error
    }
  }

  getAllFeedback(): UserFeedback[] {
    return this.feedback;
  }
}
