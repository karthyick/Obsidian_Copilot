import {
  ItemView,
  WorkspaceLeaf,
  setIcon,
  MarkdownRenderer,
  Notice,
} from "obsidian";
import type AIAssistantPlugin from "./main";
import {
  ChatMessage,
  VIEW_TYPE_AI_ASSISTANT,
  LLMMessage,
} from "./types";
import { EditProtocol } from "./editProtocol";
import { MermaidHandler } from "./mermaidHandler";

/**
 * Chat view for the AI Assistant
 */
export class AIChatView extends ItemView {
  private plugin: AIAssistantPlugin;
  private chatHistory: ChatMessage[] = [];
  private messagesContainer: HTMLElement;
  private inputContainer: HTMLElement;
  private inputTextarea: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement;
  private contextToggle: HTMLInputElement;
  private contextInfo: HTMLElement;
  private isLoading: boolean = false;
  private editProtocol: EditProtocol;
  private mermaidHandler: MermaidHandler;

  constructor(leaf: WorkspaceLeaf, plugin: AIAssistantPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.editProtocol = new EditProtocol(this.plugin.noteController);
    this.mermaidHandler = new MermaidHandler();
  }

  getViewType(): string {
    return VIEW_TYPE_AI_ASSISTANT;
  }

  getDisplayText(): string {
    return "AI Assistant";
  }

  getIcon(): string {
    return "bot";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("ai-assistant-container");

    // Create header
    this.createHeader(container as HTMLElement);

    // Create messages container
    this.messagesContainer = container.createDiv({
      cls: "ai-assistant-messages",
    });

    // Create context info bar
    this.createContextBar(container as HTMLElement);

    // Create input area
    this.createInputArea(container as HTMLElement);

    // Add welcome message
    this.addWelcomeMessage();

    // Update context info
    await this.updateContextInfo();
  }

  async onClose(): Promise<void> {
    // Cleanup if needed
  }

  /**
   * Create the header section
   */
  private createHeader(container: HTMLElement): void {
    const header = container.createDiv({ cls: "ai-assistant-header" });

    const title = header.createDiv({ cls: "ai-assistant-title" });
    title.createSpan({ text: "AI Assistant" });

    const actions = header.createDiv({ cls: "ai-assistant-header-actions" });

    // Settings button
    const settingsBtn = actions.createEl("button", {
      cls: "ai-assistant-header-btn",
      attr: { "aria-label": "Settings" },
    });
    setIcon(settingsBtn, "settings");
    settingsBtn.addEventListener("click", () => {
      // Open plugin settings
      (this.app as any).setting.open();
      (this.app as any).setting.openTabById(this.plugin.manifest.id);
    });

    // Clear chat button
    const clearBtn = actions.createEl("button", {
      cls: "ai-assistant-header-btn",
      attr: { "aria-label": "Clear chat" },
    });
    setIcon(clearBtn, "trash-2");
    clearBtn.addEventListener("click", () => this.clearChat());
  }

  /**
   * Create the context info bar
   */
  private createContextBar(container: HTMLElement): void {
    const contextBar = container.createDiv({ cls: "ai-assistant-context-bar" });

    this.contextInfo = contextBar.createDiv({ cls: "ai-assistant-context-info" });

    const clearContextBtn = contextBar.createEl("button", {
      cls: "ai-assistant-context-clear",
      attr: { "aria-label": "Clear context" },
    });
    setIcon(clearContextBtn, "x");
    clearContextBtn.addEventListener("click", () => {
      this.contextToggle.checked = false;
      this.updateContextInfo();
    });
  }

  /**
   * Create the input area
   */
  private createInputArea(container: HTMLElement): void {
    this.inputContainer = container.createDiv({ cls: "ai-assistant-input-area" });

    // Context toggle
    const toggleContainer = this.inputContainer.createDiv({
      cls: "ai-assistant-toggle-container",
    });

    const toggleLabel = toggleContainer.createEl("label", {
      cls: "ai-assistant-toggle-label",
    });

    this.contextToggle = toggleLabel.createEl("input", {
      type: "checkbox",
      cls: "ai-assistant-toggle",
    });
    this.contextToggle.checked = this.plugin.settings.autoIncludeContext;
    this.contextToggle.addEventListener("change", () => this.updateContextInfo());

    toggleLabel.createSpan({ text: "Include active note" });

    // Input row
    const inputRow = this.inputContainer.createDiv({
      cls: "ai-assistant-input-row",
    });

    this.inputTextarea = inputRow.createEl("textarea", {
      cls: "ai-assistant-input",
      attr: {
        placeholder: "Ask anything or request changes to your note...",
        rows: "1",
      },
    });

    // Auto-resize textarea
    this.inputTextarea.addEventListener("input", () => {
      this.inputTextarea.style.height = "auto";
      this.inputTextarea.style.height =
        Math.min(this.inputTextarea.scrollHeight, 150) + "px";
    });

    // Handle keyboard shortcuts
    this.inputTextarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button
    this.sendButton = inputRow.createEl("button", {
      cls: "ai-assistant-send-btn",
      attr: { "aria-label": "Send message" },
    });
    setIcon(this.sendButton, "send");
    this.sendButton.addEventListener("click", () => this.sendMessage());
  }

  /**
   * Add the welcome message
   */
  private addWelcomeMessage(): void {
    const welcomeDiv = this.messagesContainer.createDiv({
      cls: "ai-assistant-welcome",
    });

    welcomeDiv.createEl("h3", { text: "👋 Welcome to AI Assistant" });
    welcomeDiv.createEl("p", {
      text: "I can help you with your notes. Try asking me to:",
    });

    const suggestions = welcomeDiv.createEl("ul");
    const suggestionItems = [
      "Summarize this note",
      "Fix grammar and spelling",
      "Add a conclusion section",
      "Create a Mermaid diagram",
      "Expand on a topic",
    ];

    for (const item of suggestionItems) {
      const li = suggestions.createEl("li");
      const link = li.createEl("a", {
        text: item,
        cls: "ai-assistant-suggestion",
      });
      link.addEventListener("click", () => {
        this.inputTextarea.value = item;
        this.inputTextarea.focus();
      });
    }
  }

  /**
   * Update the context info display
   */
  private async updateContextInfo(): Promise<void> {
    if (!this.contextToggle.checked) {
      this.contextInfo.setText("No context attached");
      this.contextInfo.addClass("ai-assistant-context-none");
      return;
    }

    const summary = await this.plugin.contextBuilder.getContextSummary();
    if (summary) {
      this.contextInfo.setText(summary);
      this.contextInfo.removeClass("ai-assistant-context-none");
    } else {
      this.contextInfo.setText("No active note");
      this.contextInfo.addClass("ai-assistant-context-none");
    }
  }

  /**
   * Send a message to the AI
   */
  public async sendMessage(overrideMessage?: string): Promise<void> {
    const message = overrideMessage ?? this.inputTextarea.value.trim();
    if (!message || this.isLoading) {
      return;
    }

    // Clear input
    if (!overrideMessage) {
      this.inputTextarea.value = "";
      this.inputTextarea.style.height = "auto";
    }

    // Remove welcome message
    const welcome = this.messagesContainer.querySelector(".ai-assistant-welcome");
    if (welcome) {
      welcome.remove();
    }

    // Add user message
    const userMessage = this.createChatMessage("user", message);
    this.chatHistory.push(userMessage);
    this.renderMessage(userMessage);

    // Set loading state
    this.setLoading(true);

    // Create assistant message placeholder
    const assistantMessage = this.createChatMessage("assistant", "");
    this.chatHistory.push(assistantMessage);
    const messageEl = this.renderMessage(assistantMessage, true);
    const contentEl = messageEl.querySelector(
      ".ai-assistant-message-content"
    ) as HTMLElement;

    try {
      // Build messages for Bedrock
      const messages = await this.plugin.contextBuilder.buildMessages(
        this.chatHistory.slice(0, -1), // Exclude the empty assistant message
        message,
        this.contextToggle.checked
      );

      const systemPrompt = this.plugin.contextBuilder.buildSystemPrompt(
        this.plugin.settings.systemPrompt
      );

      let fullResponse = "";

      if (this.plugin.settings.streamResponses) {
        // Stream response
        const stream = this.plugin.llmService.sendMessageStream(
          messages,
          systemPrompt
        );

        for await (const chunk of stream) {
          fullResponse += chunk;
          assistantMessage.content = fullResponse;
          await this.updateMessageContent(contentEl, fullResponse);
          this.scrollToBottom();
        }
      } else {
        // Non-streaming response
        fullResponse = await this.plugin.llmService.sendMessage(
          messages,
          systemPrompt
        );
        assistantMessage.content = fullResponse;
        await this.updateMessageContent(contentEl, fullResponse);
      }

      // Parse edit commands and mermaid blocks
      assistantMessage.editCommands =
        this.editProtocol.parseEditCommands(fullResponse);
      assistantMessage.mermaidBlocks =
        this.mermaidHandler.extractMermaidCode(fullResponse);

      // Add action buttons if needed
      this.addMessageActions(messageEl, assistantMessage);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      assistantMessage.content = `❌ Error: ${errorMessage}`;
      contentEl.setText(assistantMessage.content);
      contentEl.addClass("ai-assistant-error");
    } finally {
      this.setLoading(false);
      this.scrollToBottom();
    }
  }

  /**
   * Create a chat message object
   */
  private createChatMessage(
    role: "user" | "assistant",
    content: string
  ): ChatMessage {
    return {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    };
  }

  /**
   * Render a message in the chat
   */
  private renderMessage(
    message: ChatMessage,
    isStreaming: boolean = false
  ): HTMLElement {
    const messageEl = this.messagesContainer.createDiv({
      cls: `ai-assistant-message ai-assistant-message-${message.role}`,
    });

    const bubble = messageEl.createDiv({ cls: "ai-assistant-bubble" });

    const contentEl = bubble.createDiv({
      cls: "ai-assistant-message-content",
    });

    if (message.content) {
      this.updateMessageContent(contentEl, message.content);
    } else if (isStreaming) {
      contentEl.createDiv({ cls: "ai-assistant-typing" });
    }

    // Add timestamp
    const meta = bubble.createDiv({ cls: "ai-assistant-message-meta" });
    meta.createSpan({
      text: message.timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    this.scrollToBottom();
    return messageEl;
  }

  /**
   * Update message content with markdown rendering
   */
  private async updateMessageContent(
    contentEl: HTMLElement,
    content: string
  ): Promise<void> {
    contentEl.empty();

    // Get display text (without edit command blocks)
    const displayText = this.editProtocol.getDisplayText(content);

    // Render markdown
    await MarkdownRenderer.render(
      this.app,
      displayText,
      contentEl,
      "",
      this.plugin
    );

    // Add copy buttons to code blocks
    const codeBlocks = contentEl.querySelectorAll("pre");
    codeBlocks.forEach((block) => {
      const copyBtn = block.createEl("button", {
        cls: "ai-assistant-copy-code",
        attr: { "aria-label": "Copy code" },
      });
      setIcon(copyBtn, "copy");

      copyBtn.addEventListener("click", async () => {
        const code = block.querySelector("code")?.textContent ?? "";
        await navigator.clipboard.writeText(code);
        setIcon(copyBtn, "check");
        setTimeout(() => setIcon(copyBtn, "copy"), 2000);
      });
    });
  }

  /**
   * Add action buttons to a message
   */
  private addMessageActions(
    messageEl: HTMLElement,
    message: ChatMessage
  ): void {
    const bubble = messageEl.querySelector(".ai-assistant-bubble");
    if (!bubble) return;

    const actionsEl = bubble.createDiv({ cls: "ai-assistant-message-actions" });

    // Copy button
    const copyBtn = actionsEl.createEl("button", {
      cls: "ai-assistant-action-btn",
      attr: { "aria-label": "Copy response" },
    });
    setIcon(copyBtn, "copy");
    copyBtn.createSpan({ text: "Copy" });
    copyBtn.addEventListener("click", async () => {
      const displayText = this.editProtocol.getDisplayText(message.content);
      await navigator.clipboard.writeText(displayText);
      new Notice("Copied to clipboard");
    });

    // Insert button
    const insertBtn = actionsEl.createEl("button", {
      cls: "ai-assistant-action-btn",
      attr: { "aria-label": "Insert at cursor" },
    });
    setIcon(insertBtn, "file-input");
    insertBtn.createSpan({ text: "Insert" });
    insertBtn.addEventListener("click", () => {
      const displayText = this.editProtocol.getDisplayText(message.content);
      if (this.plugin.noteController.insertAtCursor(displayText)) {
        new Notice("Inserted at cursor");
      } else {
        new Notice("No active note");
      }
    });

    // Apply edit button (if edit commands present)
    if (message.editCommands && message.editCommands.length > 0) {
      const applyBtn = actionsEl.createEl("button", {
        cls: "ai-assistant-action-btn ai-assistant-action-apply",
        attr: { "aria-label": "Apply edit" },
      });

      if (message.applied) {
        setIcon(applyBtn, "check-circle");
        applyBtn.createSpan({ text: "Applied" });
        applyBtn.disabled = true;
        applyBtn.addClass("ai-assistant-action-applied");
      } else {
        setIcon(applyBtn, "edit");
        applyBtn.createSpan({ text: "Apply Edit" });

        applyBtn.addEventListener("click", async () => {
          const results = await this.editProtocol.executeCommands(
            message.editCommands!
          );

          const allSuccess = results.every((r) => r.success);
          if (allSuccess) {
            message.applied = true;
            setIcon(applyBtn, "check-circle");
            const textSpan = applyBtn.querySelector("span");
            if (textSpan) textSpan.setText("Applied");
            applyBtn.disabled = true;
            applyBtn.addClass("ai-assistant-action-applied");
            new Notice("Edit applied successfully");
          } else {
            const failedResult = results.find((r) => !r.success);
            new Notice(`Edit failed: ${failedResult?.message}`);
          }
        });
      }
    }

    // Insert Mermaid button (if mermaid blocks present)
    if (message.mermaidBlocks && message.mermaidBlocks.length > 0) {
      const mermaidBtn = actionsEl.createEl("button", {
        cls: "ai-assistant-action-btn",
        attr: { "aria-label": "Insert diagram" },
      });
      setIcon(mermaidBtn, "git-branch");
      mermaidBtn.createSpan({ text: "Insert Diagram" });

      mermaidBtn.addEventListener("click", () => {
        for (const code of message.mermaidBlocks!) {
          if (this.plugin.noteController.insertMermaid(code)) {
            new Notice("Diagram inserted");
          } else {
            new Notice("No active note");
          }
        }
      });
    }
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.sendButton.disabled = loading;
    this.inputTextarea.disabled = loading;

    if (loading) {
      this.sendButton.addClass("ai-assistant-loading");
    } else {
      this.sendButton.removeClass("ai-assistant-loading");
    }
  }

  /**
   * Scroll to the bottom of the messages
   */
  private scrollToBottom(): void {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /**
   * Clear the chat history
   */
  public clearChat(): void {
    this.chatHistory = [];
    this.messagesContainer.empty();
    this.addWelcomeMessage();
    new Notice("Chat cleared");
  }

  /**
   * Get the chat history
   */
  public getChatHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  /**
   * Focus the input textarea
   */
  public focusInput(): void {
    this.inputTextarea.focus();
  }

  /**
   * Set the input value and optionally send
   */
  public async setInputAndSend(message: string, send: boolean = false): Promise<void> {
    this.inputTextarea.value = message;
    if (send) {
      await this.sendMessage();
    } else {
      this.inputTextarea.focus();
    }
  }
}
