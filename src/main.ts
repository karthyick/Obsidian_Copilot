import { Plugin, WorkspaceLeaf, Notice } from "obsidian";
import {
  AIAssistantSettings,
  DEFAULT_SETTINGS,
  VIEW_TYPE_AI_ASSISTANT,
  ConnectionTestResult,
  AIProvider,
} from "./types";
import { AIAssistantSettingTab, validateSettings } from "./settings";
import { LLMServiceManager } from "./llmServiceManager";
import { NoteController } from "./noteController";
import { ContextBuilder } from "./contextBuilder";
import { AIChatView } from "./chatView";

/**
 * Main plugin class for AI Assistant
 */
export default class AIAssistantPlugin extends Plugin {
  settings: AIAssistantSettings;
  llmService: LLMServiceManager;
  noteController: NoteController;
  contextBuilder: ContextBuilder;

  async onload(): Promise<void> {
    // Load settings
    await this.loadSettings();

    // Initialize services
    this.noteController = new NoteController(this.app);
    this.llmService = new LLMServiceManager(this.settings);
    this.contextBuilder = new ContextBuilder(
      this.noteController,
      () => this.settings.excludedNotes
    );

    // Register view
    this.registerView(
      VIEW_TYPE_AI_ASSISTANT,
      (leaf) => new AIChatView(leaf, this)
    );

    // Add ribbon icon
    this.addRibbonIcon("bot", "AI assistant", () => {
      void this.activateView();
    });

    // Register commands
    this.registerCommands();

    // Add settings tab
    this.addSettingTab(new AIAssistantSettingTab(this.app, this));

    // Check settings on load
    this.checkSettings();
  }

  onunload(): void {
    // Clean up - don't detach leaves to preserve user's layout
  }

  /**
   * Register plugin commands
   */
  private registerCommands(): void {
    // Open AI chat
    this.addCommand({
      id: "open-ai-chat",
      name: "Open AI assistant",
      callback: () => {
        void this.activateView();
      },
    });

    // Send note to AI
    this.addCommand({
      id: "send-note-to-ai",
      name: "Send note to AI",
      editorCallback: async () => {
        await this.activateView();
        const content = await this.noteController.getActiveNoteContent();
        const chatView = this.getChatView();
        if (content && chatView) {
          await chatView.setInputAndSend(
            "Please analyze and summarize this note.",
            true
          );
        }
      },
    });

    // AI edit selection
    this.addCommand({
      id: "ai-edit-selection",
      name: "AI edit selection",
      editorCallback: async () => {
        const selection = this.noteController.getSelection();
        if (!selection) {
          new Notice("Please select some text first");
          return;
        }

        await this.activateView();
        const chatView = this.getChatView();
        if (chatView) {
          await chatView.setInputAndSend(
            `Please improve or edit the following selected text:\n\n"${selection}"`,
            false
          );
        }
      },
    });

    // Generate Mermaid diagram
    this.addCommand({
      id: "ai-generate-mermaid",
      name: "Generate Mermaid diagram",
      editorCallback: async () => {
        await this.activateView();
        const chatView = this.getChatView();
        if (chatView) {
          await chatView.setInputAndSend(
            "Based on the content of this note, create a Mermaid diagram that visualizes the key concepts or relationships.",
            true
          );
        }
      },
    });

    // Quick fix grammar
    this.addCommand({
      id: "ai-fix-grammar",
      name: "AI fix grammar",
      editorCallback: async () => {
        await this.activateView();
        const chatView = this.getChatView();
        if (chatView) {
          await chatView.setInputAndSend(
            "Please fix any grammar and spelling errors in this note while preserving the original meaning and formatting.",
            true
          );
        }
      },
    });

    // Expand content
    this.addCommand({
      id: "ai-expand-content",
      name: "AI expand content",
      editorCallback: async () => {
        const selection = this.noteController.getSelection();
        await this.activateView();

        const chatView = this.getChatView();
        if (chatView) {
          if (selection) {
            await chatView.setInputAndSend(
              `Please expand on the following selected text, adding more detail and context:\n\n"${selection}"`,
              true
            );
          } else {
            await chatView.setInputAndSend(
              "Please expand on the main topics in this note, adding more detail and context where appropriate.",
              true
            );
          }
        }
      },
    });

    // Clear chat
    this.addCommand({
      id: "ai-clear-chat",
      name: "Clear AI chat",
      callback: () => {
        const chatView = this.getChatView();
        if (chatView) {
          chatView.clearChat();
        }
      },
    });
  }

  /**
   * Activate the chat view
   */
  async activateView(): Promise<void> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_AI_ASSISTANT);

    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      leaf = leaves[0];
    } else {
      // Create a new leaf in the right sidebar
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_AI_ASSISTANT,
          active: true,
        });
      }
    }

    // Reveal and focus the leaf
    if (leaf) {
      void workspace.revealLeaf(leaf);
      // Focus the input
      const chatView = this.getChatView();
      if (chatView) {
        chatView.focusInput();
      }
    }
  }

  /**
   * Load settings from disk
   */
  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /**
   * Save settings to disk
   */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * Reinitialize the LLM service with current settings
   */
  reinitializeLLMService(): void {
    this.llmService.reinitialize(this.settings);
  }

  /**
   * Test connection to the current provider
   */
  async testConnection(): Promise<ConnectionTestResult> {
    // Validate settings first
    const validation = validateSettings(this.settings);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errors.join(", "),
      };
    }

    // Reinitialize and test
    this.reinitializeLLMService();
    return await this.llmService.testConnection();
  }

  /**
   * Test connection to a specific provider
   */
  async testProviderConnection(provider: AIProvider): Promise<ConnectionTestResult> {
    // Reinitialize and test specific provider
    this.reinitializeLLMService();
    return await this.llmService.testProviderConnection(provider);
  }

  /**
   * Check settings and show warning if not configured
   */
  private checkSettings(): void {
    const validation = validateSettings(this.settings);
    if (!validation.valid) {
      // Don't show notice on first load, only if user opens the view
      // The settings tab will guide them
    }
  }

  /**
   * Get the active chat view instance
   */
  getChatView(): AIChatView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_AI_ASSISTANT);
    if (leaves.length === 0) {
      return null;
    }
    const view = leaves[0].view;
    if (view instanceof AIChatView) {
      return view;
    }
    return null;
  }

  /**
   * Get the current provider name
   */
  getCurrentProviderName(): string {
    return this.llmService.getCurrentProviderName();
  }
}
