import {
  ItemView,
  WorkspaceLeaf,
  setIcon,
  MarkdownRenderer,
  Notice,
  TFile,
  FuzzySuggestModal,
  App,
} from "obsidian";
import type AIAssistantPlugin from "./main";
import {
  ChatMessage,
  VIEW_TYPE_AI_ASSISTANT,
  BEDROCK_MODELS,
  PROVIDER_NAMES,
  AIProvider,
} from "./types";
import { EditProtocol } from "./editProtocol";
import { MermaidHandler } from "./mermaidHandler";
import { ModelFetcher } from "./modelFetcher";
import { TransformType, getTransformPrompt, TRANSFORM_NAMES, TRANSFORM_DESCRIPTIONS, TRANSFORM_ICONS } from "./transformPrompts";

/**
 * Note suggester modal for @mentions
 */
class NoteSuggesterModal extends FuzzySuggestModal<TFile> {
  private onSelect: (file: TFile) => void;

  constructor(app: App, onSelect: (file: TFile) => void) {
    super(app);
    this.onSelect = onSelect;
    this.setPlaceholder("Search for a note to reference...");
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(item: TFile): string {
    return item.path;
  }

  onChooseItem(item: TFile): void {
    this.onSelect(item);
  }
}

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
  private isLoading: boolean = false;
  private editProtocol: EditProtocol;
  private mermaidHandler: MermaidHandler;
  private modelSelector: HTMLSelectElement;
  private providerSelector: HTMLSelectElement;
  private referencedNotes: TFile[] = [];
  private referencedNotesContainer: HTMLElement;
  private contextToggle: HTMLInputElement;
  private activeNoteDisplay: HTMLElement;
  // Transform selections
  private selectedTransforms: Set<TransformType> = new Set();
  private transformTagsContainer: HTMLElement | null = null;

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
    return "AI assistant";
  }

  getIcon(): string {
    return "bot";
  }

  onOpen(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("ai-assistant-container");

    // Create header with model selector
    this.createHeader(container);

    // Create messages container
    this.messagesContainer = container.createDiv({
      cls: "ai-assistant-messages",
    });

    // Create input area (modern design)
    this.createInputArea(container);

    // Add welcome message
    this.addWelcomeMessage();

    // Register for active leaf changes to update context
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.updateActiveNoteDisplay();
      })
    );

    // Initial update
    this.updateActiveNoteDisplay();
  }

  onClose(): void {
    // Cleanup
  }

  /**
   * Create the header section with model selector
   */
  private createHeader(container: HTMLElement): void {
    const header = container.createDiv({ cls: "ai-assistant-header" });

    // Left side - Title and provider/model selectors
    const headerLeft = header.createDiv({ cls: "ai-assistant-header-left" });

    const titleRow = headerLeft.createDiv({ cls: "ai-assistant-title-row" });
    const logoIcon = titleRow.createSpan({ cls: "ai-assistant-logo" });
    setIcon(logoIcon, "bot");
    titleRow.createSpan({ text: "AI assistant", cls: "ai-assistant-title-text" });

    // Provider and Model selectors row
    const selectorsRow = headerLeft.createDiv({ cls: "ai-assistant-selectors" });

    // Provider selector
    const providerGroup = selectorsRow.createDiv({ cls: "ai-assistant-selector-group" });
    providerGroup.createSpan({ text: "Provider:", cls: "ai-assistant-selector-label" });
    this.providerSelector = providerGroup.createEl("select", {
      cls: "ai-assistant-provider-select",
    });

    for (const [value, label] of Object.entries(PROVIDER_NAMES)) {
      const option = this.providerSelector.createEl("option", {
        value,
        text: label,
      });
      if (value === this.plugin.settings.provider) {
        option.selected = true;
      }
    }

    this.providerSelector.addEventListener("change", () => {
      void (async () => {
        this.plugin.settings.provider = this.providerSelector.value as AIProvider;
        await this.plugin.saveSettings();
        this.plugin.reinitializeLLMService();
        await this.updateModelSelector();
      })();
    });

    // Model selector
    const modelGroup = selectorsRow.createDiv({ cls: "ai-assistant-selector-group" });
    modelGroup.createSpan({ text: "Model:", cls: "ai-assistant-selector-label" });
    this.modelSelector = modelGroup.createEl("select", {
      cls: "ai-assistant-model-select",
    });
    void this.updateModelSelector();

    this.modelSelector.addEventListener("change", () => {
      void (async () => {
        const provider = this.plugin.settings.provider;
        if (provider === "bedrock") {
          this.plugin.settings.bedrockModelId = this.modelSelector.value;
        } else if (provider === "gemini") {
          this.plugin.settings.geminiModelId = this.modelSelector.value;
        } else if (provider === "groq") {
          this.plugin.settings.groqModelId = this.modelSelector.value;
        }
        await this.plugin.saveSettings();
      })();
    });

    // Right side - Actions
    const headerRight = header.createDiv({ cls: "ai-assistant-header-actions" });

    // New chat button
    const newChatBtn = headerRight.createEl("button", {
      cls: "ai-assistant-header-btn",
      attr: { "aria-label": "New chat" },
    });
    setIcon(newChatBtn, "plus");
    newChatBtn.addEventListener("click", () => this.clearChat());

    // Settings button
    const settingsBtn = headerRight.createEl("button", {
      cls: "ai-assistant-header-btn",
      attr: { "aria-label": "Settings" },
    });
    setIcon(settingsBtn, "settings");
    settingsBtn.addEventListener("click", () => {
      // Access Obsidian's internal settings API (not exposed in public types)
      const app = this.app as App & { setting: { open: () => void; openTabById: (id: string) => void } };
      app.setting.open();
      app.setting.openTabById(this.plugin.manifest.id);
    });

    // Close button
    const closeBtn = headerRight.createEl("button", {
      cls: "ai-assistant-header-btn ai-assistant-close-btn",
      attr: { "aria-label": "Close" },
    });
    setIcon(closeBtn, "x");
    closeBtn.addEventListener("click", () => {
      this.leaf.detach();
    });
  }

  /**
   * Update model selector based on current provider
   */
  private async updateModelSelector(): Promise<void> {
    this.modelSelector.empty();
    const provider = this.plugin.settings.provider;

    let models: { id: string; name: string }[] = [];
    let currentModelId = "";

    if (provider === "bedrock") {
      models = Object.entries(BEDROCK_MODELS).map(([id, name]) => ({ id, name }));
      currentModelId = this.plugin.settings.bedrockModelId;
    } else if (provider === "gemini") {
      if (this.plugin.settings.geminiApiKey) {
        const fetchedModels = await ModelFetcher.fetchGeminiModels(this.plugin.settings.geminiApiKey);
        models = fetchedModels.length > 0 ? fetchedModels : ModelFetcher.getFallbackGeminiModels();
      } else {
        models = ModelFetcher.getFallbackGeminiModels();
      }
      currentModelId = this.plugin.settings.geminiModelId;
    } else if (provider === "groq") {
      if (this.plugin.settings.groqApiKey) {
        const fetchedModels = await ModelFetcher.fetchGroqModels(this.plugin.settings.groqApiKey);
        models = fetchedModels.length > 0 ? fetchedModels : ModelFetcher.getFallbackGroqModels();
      } else {
        models = ModelFetcher.getFallbackGroqModels();
      }
      currentModelId = this.plugin.settings.groqModelId;
    }

    // If saved model ID is not in the fetched list, add it at the top
    // This ensures user's saved model is always available
    const modelExists = models.some(m => m.id === currentModelId);
    if (currentModelId && !modelExists) {
      models.unshift({ id: currentModelId, name: `${currentModelId} (saved)` });
    }

    let selectedFound = false;
    for (const model of models) {
      const option = this.modelSelector.createEl("option", {
        value: model.id,
        text: model.name,
      });
      if (model.id === currentModelId) {
        option.selected = true;
        selectedFound = true;
      }
    }

    // If no model was selected (edge case), select first one and save
    if (!selectedFound && models.length > 0) {
      this.modelSelector.selectedIndex = 0;
      const firstModelId = models[0].id;
      if (provider === "bedrock") {
        this.plugin.settings.bedrockModelId = firstModelId;
      } else if (provider === "gemini") {
        this.plugin.settings.geminiModelId = firstModelId;
      } else if (provider === "groq") {
        this.plugin.settings.groqModelId = firstModelId;
      }
      await this.plugin.saveSettings();
    }
  }

  /**
   * Create the input area with modern design
   */
  private createInputArea(container: HTMLElement): void {
    this.inputContainer = container.createDiv({ cls: "ai-assistant-input-wrapper" });

    // Context section
    const contextSection = this.inputContainer.createDiv({ cls: "ai-assistant-context-section" });

    // Active note display
    const activeNoteRow = contextSection.createDiv({ cls: "ai-assistant-active-note-row" });

    // Toggle for including active note
    const toggleWrapper = activeNoteRow.createDiv({ cls: "ai-assistant-toggle-wrapper" });
    this.contextToggle = toggleWrapper.createEl("input", {
      type: "checkbox",
      cls: "ai-assistant-context-toggle",
    });
    this.contextToggle.checked = this.plugin.settings.autoIncludeContext;
    this.contextToggle.id = "context-toggle";

    const toggleLabel = toggleWrapper.createEl("label", {
      attr: { for: "context-toggle" },
      cls: "ai-assistant-toggle-label-modern",
    });
    toggleLabel.createSpan({ cls: "ai-assistant-toggle-slider" });

    this.activeNoteDisplay = activeNoteRow.createDiv({ cls: "ai-assistant-active-note-display" });
    this.updateActiveNoteDisplay();

    this.contextToggle.addEventListener("change", () => {
      void (async () => {
        this.plugin.settings.autoIncludeContext = this.contextToggle.checked;
        await this.plugin.saveSettings();
        this.updateActiveNoteDisplay();
      })();
    });

    // Referenced notes section
    const referencesRow = contextSection.createDiv({ cls: "ai-assistant-references-row" });

    const addRefBtn = referencesRow.createEl("button", {
      cls: "ai-assistant-add-ref-btn",
      attr: { "aria-label": "Add note reference" },
    });
    setIcon(addRefBtn, "file-plus");
    addRefBtn.createSpan({ text: "Add note reference" });
    addRefBtn.addEventListener("click", () => this.openNoteSuggester());

    this.referencedNotesContainer = referencesRow.createDiv({ cls: "ai-assistant-referenced-notes" });

    // Input area
    const inputArea = this.inputContainer.createDiv({ cls: "ai-assistant-input-area-modern" });

    // Textarea container
    const textareaContainer = inputArea.createDiv({ cls: "ai-assistant-textarea-container" });

    this.inputTextarea = textareaContainer.createEl("textarea", {
      cls: "ai-assistant-input-modern",
      attr: {
        placeholder: "Ask me anything about your notes...",
        rows: "1",
      },
    });

    // Auto-resize textarea - requires dynamic height calculation based on content
    this.inputTextarea.addEventListener("input", () => {
      this.inputTextarea.setCssStyles({ height: "auto" });
      const newHeight = Math.min(Math.max(this.inputTextarea.scrollHeight, 44), 200);
      this.inputTextarea.setCssStyles({ height: `${newHeight}px` });
    });

    // Handle @ mentions
    this.inputTextarea.addEventListener("input", (_e: Event) => {
      const value = this.inputTextarea.value;
      const cursorPos = this.inputTextarea.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPos);

      // Check if user just typed @
      if (textBeforeCursor.endsWith("@")) {
        this.openNoteSuggester();
      }
    });

    // Handle keyboard shortcuts
    this.inputTextarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void this.sendMessage();
      }
    });

    // Send button
    this.sendButton = inputArea.createEl("button", {
      cls: "ai-assistant-send-btn-modern",
      attr: { "aria-label": "Send message" },
    });
    const sendIcon = this.sendButton.createSpan({ cls: "ai-assistant-send-icon" });
    setIcon(sendIcon, "send");
    this.sendButton.addEventListener("click", () => {
      void this.sendMessage();
    });

    // Hint text
    const hintText = this.inputContainer.createDiv({ cls: "ai-assistant-hint" });
    hintText.createSpan({ text: "Press Enter to send • Shift+Enter for new line • @ to reference notes" });
  }

  /**
   * Update active note display
   */
  private updateActiveNoteDisplay(): void {
    if (!this.activeNoteDisplay) return;

    this.activeNoteDisplay.empty();

    if (!this.contextToggle.checked) {
      this.activeNoteDisplay.createSpan({
        text: "Active note not included",
        cls: "ai-assistant-note-disabled"
      });
      return;
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      const noteTag = this.activeNoteDisplay.createDiv({ cls: "ai-assistant-note-tag" });
      const icon = noteTag.createSpan({ cls: "ai-assistant-note-icon" });
      setIcon(icon, "file-text");
      noteTag.createSpan({ text: activeFile.basename, cls: "ai-assistant-note-name" });
    } else {
      this.activeNoteDisplay.createSpan({
        text: "No note open",
        cls: "ai-assistant-note-disabled"
      });
    }
  }

  /**
   * Open note suggester modal
   */
  private openNoteSuggester(): void {
    new NoteSuggesterModal(this.app, (file) => {
      this.addReferencedNote(file);
    }).open();
  }

  /**
   * Check if a note is excluded
   */
  private isNoteExcluded(file: TFile): boolean {
    return this.plugin.settings.excludedNotes.includes(file.path);
  }

  /**
   * Add a referenced note
   */
  private addReferencedNote(file: TFile): void {
    // Check if note is excluded
    if (this.isNoteExcluded(file)) {
      new Notice(`⚠️ "${file.basename}" is in the excluded notes list and cannot be referenced.`);
      return;
    }

    // Don't add duplicates
    if (this.referencedNotes.some(n => n.path === file.path)) {
      return;
    }

    this.referencedNotes.push(file);
    this.renderReferencedNotes();
  }

  /**
   * Remove a referenced note
   */
  private removeReferencedNote(file: TFile): void {
    this.referencedNotes = this.referencedNotes.filter(n => n.path !== file.path);
    this.renderReferencedNotes();
  }

  /**
   * Render referenced notes tags
   */
  private renderReferencedNotes(): void {
    this.referencedNotesContainer.empty();

    for (const file of this.referencedNotes) {
      const tag = this.referencedNotesContainer.createDiv({ cls: "ai-assistant-ref-tag" });
      const icon = tag.createSpan({ cls: "ai-assistant-ref-icon" });
      setIcon(icon, "file-text");
      tag.createSpan({ text: file.basename, cls: "ai-assistant-ref-name" });

      const removeBtn = tag.createSpan({ cls: "ai-assistant-ref-remove" });
      setIcon(removeBtn, "x");
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.removeReferencedNote(file);
      });
    }
  }

  /**
   * Add the welcome message
   */
  private addWelcomeMessage(): void {
    const welcomeDiv = this.messagesContainer.createDiv({
      cls: "ai-assistant-welcome-modern",
    });

    const logoContainer = welcomeDiv.createDiv({ cls: "ai-assistant-welcome-logo" });
    setIcon(logoContainer, "bot");

    welcomeDiv.createEl("h2", { text: "AI assistant" });
    welcomeDiv.createEl("p", {
      text: "I can help you write, edit, and analyze your notes. Try one of these:",
      cls: "ai-assistant-welcome-subtitle",
    });

    const suggestionsGrid = welcomeDiv.createDiv({ cls: "ai-assistant-suggestions-grid" });

    const suggestions = [
      { icon: "file-text", text: "Summarize this note", desc: "Get a quick summary" },
      { icon: "spell-check", text: "Fix grammar and spelling", desc: "Polish your writing" },
      { icon: "list-plus", text: "Add a conclusion", desc: "Complete your note" },
      { icon: "git-branch", text: "Create a diagram", desc: "Visualize concepts" },
    ];

    for (const suggestion of suggestions) {
      const card = suggestionsGrid.createDiv({ cls: "ai-assistant-suggestion-card" });
      const iconEl = card.createDiv({ cls: "ai-assistant-suggestion-icon" });
      setIcon(iconEl, suggestion.icon);
      card.createDiv({ text: suggestion.text, cls: "ai-assistant-suggestion-text" });
      card.createDiv({ text: suggestion.desc, cls: "ai-assistant-suggestion-desc" });

      card.addEventListener("click", () => {
        // Auto-send when clicking suggestion cards for better UX
        void this.sendMessage(suggestion.text);
      });
    }

    // Transform card with expandable sub-options
    this.createTransformCard(suggestionsGrid);
  }

  /**
   * Create the Transform card with expandable full-screen view
   */
  private createTransformCard(container: HTMLElement): void {
    const transformCard = container.createDiv({ cls: "ai-assistant-suggestion-card ai-assistant-transform-card" });
    const iconEl = transformCard.createDiv({ cls: "ai-assistant-suggestion-icon ai-assistant-transform-icon" });
    setIcon(iconEl, "shuffle");
    transformCard.createDiv({ text: "Transform", cls: "ai-assistant-suggestion-text" });
    transformCard.createDiv({ text: "Select format(s)", cls: "ai-assistant-suggestion-desc" });

    // Store reference to the suggestions grid for hiding/showing
    const suggestionsGrid = container;

    // Click handler to expand transform view
    transformCard.addEventListener("click", () => {
      this.showTransformExpandedView(suggestionsGrid);
    });
  }

  /**
   * Show the expanded transform view with all options centered
   */
  private showTransformExpandedView(suggestionsGrid: HTMLElement): void {
    // Get the welcome container (parent of suggestions grid)
    const welcomeDiv = suggestionsGrid.closest(".ai-assistant-welcome-modern") as HTMLElement;
    if (!welcomeDiv) return;

    // Hide all other content in welcome div
    welcomeDiv.addClass("ai-assistant-transform-mode");

    // Create transform expanded view
    const expandedView = welcomeDiv.createDiv({ cls: "ai-assistant-transform-expanded" });

    // Header with back button
    const header = expandedView.createDiv({ cls: "ai-assistant-transform-header" });

    const backBtn = header.createEl("button", { cls: "ai-assistant-transform-back-btn" });
    const backIcon = backBtn.createSpan();
    setIcon(backIcon, "arrow-left");
    backBtn.createSpan({ text: "Back" });
    backBtn.addEventListener("click", () => {
      this.hideTransformExpandedView(welcomeDiv, expandedView);
    });

    const headerTitle = header.createDiv({ cls: "ai-assistant-transform-header-title" });
    const titleIcon = headerTitle.createSpan();
    setIcon(titleIcon, "shuffle");
    headerTitle.createSpan({ text: "Transform document" });

    // Description
    expandedView.createEl("p", {
      text: "Select one format to restructure your document",
      cls: "ai-assistant-transform-subtitle"
    });

    // Transform options grid
    const optionsGrid = expandedView.createDiv({ cls: "ai-assistant-transform-options-grid" });

    // All transform types from backend
    const transformTypes: TransformType[] = ["pyramid", "coin", "developer", "business", "management", "cosmos", "cringe"];

    for (const type of transformTypes) {
      const option = optionsGrid.createDiv({ cls: "ai-assistant-transform-option-card" });
      option.dataset.transform = type;

      // Check if already selected
      if (this.selectedTransforms.has(type)) {
        option.addClass("selected");
      }

      const optionIcon = option.createDiv({ cls: "ai-assistant-transform-option-icon" });
      setIcon(optionIcon, TRANSFORM_ICONS[type]);

      const textContent = option.createDiv({ cls: "ai-assistant-transform-option-content" });
      textContent.createDiv({ text: TRANSFORM_NAMES[type], cls: "ai-assistant-transform-option-title" });
      textContent.createDiv({ text: TRANSFORM_DESCRIPTIONS[type], cls: "ai-assistant-transform-option-desc" });

      // Selection indicator
      const checkIcon = option.createDiv({ cls: "ai-assistant-transform-check" });
      setIcon(checkIcon, "check");

      option.addEventListener("click", () => {
        const isSelected = option.classList.toggle("selected");
        this.toggleTransformSelection(type, isSelected);
      });
    }

    // Action buttons at bottom
    const actions = expandedView.createDiv({ cls: "ai-assistant-transform-actions" });

    const clearBtn = actions.createEl("button", {
      cls: "ai-assistant-transform-clear-btn",
      text: "Clear all"
    });
    clearBtn.addEventListener("click", () => {
      this.selectedTransforms.clear();
      optionsGrid.querySelectorAll(".ai-assistant-transform-option-card").forEach(card => {
        card.removeClass("selected");
      });
      this.updateTransformIndicator();
    });

    const doneBtn = actions.createEl("button", {
      cls: "ai-assistant-transform-done-btn",
      text: "Done"
    });
    doneBtn.addEventListener("click", () => {
      this.hideTransformExpandedView(welcomeDiv, expandedView);
    });
  }

  /**
   * Hide the expanded transform view and restore normal view
   */
  private hideTransformExpandedView(welcomeDiv: HTMLElement, expandedView: HTMLElement): void {
    expandedView.remove();
    welcomeDiv.removeClass("ai-assistant-transform-mode");
  }

  /**
   * Toggle transform selection and update UI indicator
   * Single-select only - selecting one clears any previous selection
   */
  private toggleTransformSelection(type: TransformType, selected: boolean): void {
    if (selected) {
      // Single-select: clear ALL other selections first
      this.selectedTransforms.clear();
      // Update UI for all cards
      const allCards = this.containerEl.querySelectorAll(".ai-assistant-transform-option-card.selected");
      allCards.forEach(card => card.removeClass("selected"));
      // Add the new selection
      this.selectedTransforms.add(type);
      // Re-add selected class to current card
      const currentCard = this.containerEl.querySelector(`.ai-assistant-transform-option-card[data-transform="${type}"]`);
      if (currentCard) currentCard.addClass("selected");
    } else {
      this.selectedTransforms.delete(type);
    }
    this.updateTransformIndicator();
  }

  /**
   * Update the transform tags inside the textarea container
   */
  private updateTransformIndicator(): void {
    // Remove existing tags container
    if (this.transformTagsContainer) {
      this.transformTagsContainer.remove();
      this.transformTagsContainer = null;
    }

    if (this.selectedTransforms.size === 0) {
      // Update placeholder back to normal
      if (this.inputTextarea) {
        this.inputTextarea.placeholder = "Ask me anything about your notes...";
      }
      return;
    }

    // Get the textarea container
    const textareaContainer = this.containerEl.querySelector(".ai-assistant-textarea-container");
    if (!textareaContainer) return;

    // Create tags container inside textarea container (before textarea)
    this.transformTagsContainer = document.createElement("div");
    this.transformTagsContainer.className = "ai-assistant-transform-tags";
    textareaContainer.insertBefore(this.transformTagsContainer, this.inputTextarea);

    // Create individual tags for each selected transform
    const transforms = Array.from(this.selectedTransforms);
    for (const type of transforms) {
      const tag = this.transformTagsContainer.createDiv({ cls: "ai-assistant-transform-tag" });
      tag.dataset.transform = type;

      // Icon
      const tagIcon = tag.createDiv({ cls: "ai-assistant-transform-tag-icon" });
      setIcon(tagIcon, TRANSFORM_ICONS[type]);

      // Name
      tag.createSpan({ text: TRANSFORM_NAMES[type], cls: "ai-assistant-transform-tag-name" });

      // Remove button
      const removeBtn = tag.createDiv({ cls: "ai-assistant-transform-tag-remove" });
      setIcon(removeBtn, "x");
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.removeTransformSelection(type);
      });
    }

    // Update placeholder to indicate transforms are selected
    if (this.inputTextarea) {
      this.inputTextarea.placeholder = "Add instructions (optional) or just send...";
    }
  }

  /**
   * Remove a single transform selection
   */
  private removeTransformSelection(type: TransformType): void {
    this.selectedTransforms.delete(type);
    // Update the expanded view if visible
    const optionCard = this.containerEl.querySelector(`.ai-assistant-transform-option-card[data-transform="${type}"]`);
    if (optionCard) {
      optionCard.removeClass("selected");
    }
    this.updateTransformIndicator();
  }

  /**
   * Clear transform selections after sending
   */
  private clearTransformSelections(): void {
    this.selectedTransforms.clear();
    // Clear any visible transform option cards
    const optionCards = this.containerEl.querySelectorAll(".ai-assistant-transform-option-card");
    optionCards.forEach(card => card.removeClass("selected"));
    this.updateTransformIndicator();
  }

  /**
   * Send a message to the AI
   */
  public async sendMessage(overrideMessage?: string): Promise<void> {
    const message = overrideMessage ?? this.inputTextarea.value.trim();
    const hasTransforms = this.selectedTransforms.size > 0;

    // Allow sending if there's a message OR transforms are selected
    if ((!message && !hasTransforms) || this.isLoading) {
      return;
    }

    // Clear input
    if (!overrideMessage) {
      this.inputTextarea.value = "";
      this.inputTextarea.setCssStyles({ height: "auto" });
    }

    // Remove welcome message
    const welcome = this.messagesContainer.querySelector(".ai-assistant-welcome-modern");
    if (welcome) {
      welcome.remove();
    }

    // Build display message with transforms info
    let displayMessage = message;
    const selectedTransformsCopy = new Set(this.selectedTransforms); // Copy before clearing
    if (selectedTransformsCopy.size > 0) {
      const transformNames = Array.from(selectedTransformsCopy).map(t => TRANSFORM_NAMES[t]);
      const transformInfo = `**Transform:** ${transformNames.join(", ")}`;
      displayMessage = displayMessage ? `${transformInfo}\n\n${displayMessage}` : transformInfo;
    }

    // Add user message
    const userMessage = this.createChatMessage("user", displayMessage);
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
      // Build context including referenced notes
      let contextMessage = message;

      // Add referenced notes content
      if (this.referencedNotes.length > 0) {
        contextMessage = await this.buildReferencedNotesContext() + "\n\nUser Request: " + message;
      }

      // Get transform prompt if transforms are selected
      const transformPrompt = getTransformPrompt(this.selectedTransforms);
      const hasTransformSelected = this.selectedTransforms.size > 0;

      // Clear transform selections after capturing the prompt
      if (hasTransformSelected) {
        this.clearTransformSelections();
      }

      // Build messages - limit to last 10 messages for context continuity
      const historyWithoutCurrent = this.chatHistory.slice(0, -1);
      const recentHistory = historyWithoutCurrent.slice(-10); // Keep last 10 messages (5 exchanges)
      const messages = await this.plugin.contextBuilder.buildMessages(
        recentHistory,
        contextMessage,
        this.contextToggle.checked
      );

      // When transform is selected, use transform prompt as system prompt
      // Transform prompts are comprehensive and self-contained - no need to merge with main prompt
      const systemPrompt = hasTransformSelected && transformPrompt
        ? transformPrompt
        : this.plugin.contextBuilder.buildSystemPrompt(this.plugin.settings.systemPrompt);

      let fullResponse = "";

      if (this.plugin.settings.streamResponses) {
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
        fullResponse = await this.plugin.llmService.sendMessage(
          messages,
          systemPrompt
        );
        assistantMessage.content = fullResponse;
        await this.updateMessageContent(contentEl, fullResponse);
      }

      // Strip markdown code block wrapper only for transform responses (Business, Pyramid, etc.)
      if (hasTransformSelected) {
        fullResponse = this.stripMarkdownWrapper(fullResponse);
        assistantMessage.content = fullResponse;
        await this.updateMessageContent(contentEl, fullResponse);
      }

      // Parse edit commands and mermaid blocks
      assistantMessage.editCommands =
        this.editProtocol.parseEditCommands(fullResponse);
      assistantMessage.mermaidBlocks =
        this.mermaidHandler.extractMermaidCode(fullResponse);

      // Add action buttons
      this.addMessageActions(messageEl, assistantMessage);
    } catch (error) {
      const rawError = error instanceof Error ? error.message : String(error);

      // Parse and display user-friendly error messages
      let errorMessage = rawError;
      let errorDetails = "";

      if (rawError.includes("401") || rawError.includes("Unauthorized") || rawError.includes("invalid_api_key")) {
        errorMessage = "Authentication Failed";
        errorDetails = "Your API key is invalid or expired. Please check your API key in the plugin settings.";
      } else if (rawError.includes("403") || rawError.includes("Forbidden") || rawError.includes("access")) {
        errorMessage = "Model Access Denied";
        errorDetails = `You don't have access to the selected model. Try switching to a different model from the dropdown above, or check your API permissions.`;
      } else if (rawError.includes("404") || rawError.includes("not found")) {
        errorMessage = "Model Not Found";
        errorDetails = "The selected model doesn't exist or is not available. Please select a different model.";
      } else if (rawError.includes("429") || rawError.includes("rate limit") || rawError.includes("quota")) {
        errorMessage = "Rate Limit Exceeded";
        errorDetails = "You've exceeded the API rate limit. Please wait a moment and try again.";
      } else if (rawError.includes("500") || rawError.includes("502") || rawError.includes("503")) {
        errorMessage = "Server Error";
        errorDetails = "The AI service is temporarily unavailable. Please try again later.";
      } else if (rawError.includes("timeout") || rawError.includes("ETIMEDOUT")) {
        errorMessage = "Request Timeout";
        errorDetails = "The request took too long. Please try again with a shorter message.";
      } else if (rawError.includes("network") || rawError.includes("ENOTFOUND") || rawError.includes("fetch")) {
        errorMessage = "Network Error";
        errorDetails = "Unable to connect to the AI service. Please check your internet connection.";
      }

      // Format the error display
      const errorContent = errorDetails
        ? `**⚠️ ${errorMessage}**\n\n${errorDetails}\n\n<details><summary>Technical Details</summary>\n\n\`\`\`\n${rawError}\n\`\`\`\n</details>`
        : `**⚠️ Error:** ${rawError}`;

      assistantMessage.content = errorContent;
      await this.updateMessageContent(contentEl, errorContent);
      contentEl.addClass("ai-assistant-error");
    } finally {
      this.setLoading(false);
      this.scrollToBottom();
    }
  }

  /**
   * Build context from referenced notes
   */
  private async buildReferencedNotesContext(): Promise<string> {
    const parts: string[] = [];
    parts.push("=== ADDITIONAL REFERENCED NOTES ===");
    parts.push("(The user has explicitly referenced these notes for context. Use this information to answer their question.)\n");

    for (let i = 0; i < this.referencedNotes.length; i++) {
      const file = this.referencedNotes[i];
      const content = await this.app.vault.read(file);
      parts.push(`### Referenced Note ${i + 1}: "${file.basename}"`);
      parts.push(`Path: ${file.path}`);
      parts.push("Content:");
      parts.push("```markdown");
      parts.push(content.substring(0, 8000)); // Limit each note to ~2000 tokens
      parts.push("```\n");
    }

    parts.push("=== END REFERENCED NOTES ===\n");
    return parts.join("\n");
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

    // Avatar
    const avatar = messageEl.createDiv({ cls: "ai-assistant-avatar" });
    if (message.role === "assistant") {
      setIcon(avatar, "bot");
    } else {
      setIcon(avatar, "user");
    }

    const messageContent = messageEl.createDiv({ cls: "ai-assistant-message-wrapper" });

    const bubble = messageContent.createDiv({ cls: "ai-assistant-bubble" });

    const contentEl = bubble.createDiv({
      cls: "ai-assistant-message-content",
    });

    if (message.content) {
      this.updateMessageContent(contentEl, message.content);
    } else if (isStreaming) {
      const typingIndicator = contentEl.createDiv({ cls: "ai-assistant-typing-modern" });
      typingIndicator.createSpan({ cls: "ai-assistant-typing-dot" });
      typingIndicator.createSpan({ cls: "ai-assistant-typing-dot" });
      typingIndicator.createSpan({ cls: "ai-assistant-typing-dot" });
    }

    // Timestamp and actions row
    const metaRow = messageContent.createDiv({ cls: "ai-assistant-message-meta-row" });

    const meta = metaRow.createDiv({ cls: "ai-assistant-message-meta" });
    meta.createSpan({
      text: message.timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    // Add copy button for user messages
    if (message.role === "user" && message.content) {
      const userActions = metaRow.createDiv({ cls: "ai-assistant-user-actions" });
      const copyBtn = userActions.createEl("button", {
        cls: "ai-assistant-action-btn-small",
        attr: { "aria-label": "Copy message" },
      });
      setIcon(copyBtn, "copy");
      copyBtn.addEventListener("click", () => {
        void (async () => {
          await navigator.clipboard.writeText(message.content);
          setIcon(copyBtn, "check");
          new Notice("Copied to clipboard");
          setTimeout(() => setIcon(copyBtn, "copy"), 2000);
        })();
      });
    }

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

    const displayText = this.editProtocol.getDisplayText(content);

    await MarkdownRenderer.render(
      this.app,
      displayText,
      contentEl,
      "",
      this
    );

    // Add copy buttons to code blocks
    const codeBlocks = contentEl.querySelectorAll("pre");
    codeBlocks.forEach((block) => {
      const copyBtn = block.createEl("button", {
        cls: "ai-assistant-copy-code",
        attr: { "aria-label": "Copy code" },
      });
      setIcon(copyBtn, "copy");

      copyBtn.addEventListener("click", () => {
        const code = block.querySelector("code")?.textContent ?? "";
        void navigator.clipboard.writeText(code).then(() => {
          setIcon(copyBtn, "check");
          setTimeout(() => setIcon(copyBtn, "copy"), 2000);
        });
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
    const wrapper = messageEl.querySelector(".ai-assistant-message-wrapper");
    if (!wrapper) return;

    const actionsEl = wrapper.createDiv({ cls: "ai-assistant-message-actions" });

    // Copy button
    const copyBtn = actionsEl.createEl("button", {
      cls: "ai-assistant-action-btn-modern",
      attr: { "aria-label": "Copy" },
    });
    setIcon(copyBtn, "copy");
    copyBtn.addEventListener("click", () => {
      const displayText = this.editProtocol.getDisplayText(message.content);
      void navigator.clipboard.writeText(displayText).then(() => {
        new Notice("Copied to clipboard");
      });
    });

    // Insert button
    const insertBtn = actionsEl.createEl("button", {
      cls: "ai-assistant-action-btn-modern",
      attr: { "aria-label": "Insert at cursor" },
    });
    setIcon(insertBtn, "file-input");
    insertBtn.addEventListener("click", () => {
      const displayText = this.editProtocol.getDisplayText(message.content);
      if (this.plugin.noteController.insertAtCursor(displayText)) {
        new Notice("Inserted at cursor");
      } else {
        new Notice("No active note");
      }
    });

    // Apply edit button
    if (message.editCommands && message.editCommands.length > 0) {
      const applyBtn = actionsEl.createEl("button", {
        cls: "ai-assistant-action-btn-modern ai-assistant-action-apply",
        attr: { "aria-label": "Apply edit" },
      });

      if (message.applied) {
        setIcon(applyBtn, "check-circle");
        applyBtn.disabled = true;
        applyBtn.addClass("ai-assistant-action-applied");
      } else {
        setIcon(applyBtn, "edit");
        applyBtn.addEventListener("click", () => {
          const results = this.editProtocol.executeCommands(
            message.editCommands!
          );
          const allSuccess = results.every((r) => r.success);
          if (allSuccess) {
            message.applied = true;
            setIcon(applyBtn, "check-circle");
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

    // Mermaid button
    if (message.mermaidBlocks && message.mermaidBlocks.length > 0) {
      const mermaidBtn = actionsEl.createEl("button", {
        cls: "ai-assistant-action-btn-modern",
        attr: { "aria-label": "Insert diagram" },
      });
      setIcon(mermaidBtn, "git-branch");
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

    // Retry button - regenerate this response
    const retryBtn = actionsEl.createEl("button", {
      cls: "ai-assistant-action-btn-modern ai-assistant-action-retry",
      attr: { "aria-label": "Retry" },
    });
    setIcon(retryBtn, "refresh-cw");
    retryBtn.addEventListener("click", () => {
      void this.retryMessage(message, messageEl);
    });
  }

  /**
   * Retry/regenerate an assistant message
   */
  private async retryMessage(assistantMessage: ChatMessage, messageEl: HTMLElement): Promise<void> {
    // Find the index of this assistant message in history
    const assistantIndex = this.chatHistory.findIndex(m => m.id === assistantMessage.id);
    if (assistantIndex === -1 || assistantIndex === 0) {
      new Notice("Cannot retry this message");
      return;
    }

    // Get the user message that preceded this assistant message
    const userMessage = this.chatHistory[assistantIndex - 1];
    if (!userMessage || userMessage.role !== "user") {
      new Notice("Cannot find original request");
      return;
    }

    // Store the original user content
    const originalUserContent = userMessage.content;

    // Remove the assistant message from UI
    messageEl.remove();

    // Remove assistant message from history (keep the user message)
    this.chatHistory.splice(assistantIndex, 1);

    // Set loading state
    this.setLoading(true);

    // Create new assistant message placeholder
    const newAssistantMessage = this.createChatMessage("assistant", "");
    this.chatHistory.push(newAssistantMessage);
    const newMessageEl = this.renderMessage(newAssistantMessage, true);
    const contentEl = newMessageEl.querySelector(
      ".ai-assistant-message-content"
    ) as HTMLElement;

    try {
      // Build messages - limit to last 10 messages for context
      const historyWithoutCurrent = this.chatHistory.slice(0, -1);
      const recentHistory = historyWithoutCurrent.slice(-10);
      const messages = await this.plugin.contextBuilder.buildMessages(
        recentHistory,
        originalUserContent,
        this.contextToggle.checked
      );

      const systemPrompt = this.plugin.contextBuilder.buildSystemPrompt(
        this.plugin.settings.systemPrompt
      );

      let fullResponse = "";

      if (this.plugin.settings.streamResponses) {
        const stream = this.plugin.llmService.sendMessageStream(
          messages,
          systemPrompt
        );

        for await (const chunk of stream) {
          fullResponse += chunk;
          newAssistantMessage.content = fullResponse;
          await this.updateMessageContent(contentEl, fullResponse);
          this.scrollToBottom();
        }
      } else {
        fullResponse = await this.plugin.llmService.sendMessage(
          messages,
          systemPrompt
        );
        newAssistantMessage.content = fullResponse;
        await this.updateMessageContent(contentEl, fullResponse);
      }

      // Parse edit commands and mermaid blocks
      newAssistantMessage.editCommands =
        this.editProtocol.parseEditCommands(fullResponse);
      newAssistantMessage.mermaidBlocks =
        this.mermaidHandler.extractMermaidCode(fullResponse);

      // Add action buttons
      this.addMessageActions(newMessageEl, newAssistantMessage);
      new Notice("Response regenerated");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      newAssistantMessage.content = `**Error regenerating response:** ${errorMessage}`;
      await this.updateMessageContent(contentEl, newAssistantMessage.content);
      // Still add action buttons so user can retry again
      this.addMessageActions(newMessageEl, newAssistantMessage);
    } finally {
      this.setLoading(false);
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
   * Strip markdown code block wrapper from response if entire response is wrapped
   * e.g., ```markdown\n...\n``` or ```\n...\n```
   */
  private stripMarkdownWrapper(response: string): string {
    const trimmed = response.trim();
    // Check if response starts with ```markdown or ``` and ends with ```
    const markdownBlockRegex = /^```(?:markdown)?\s*\n([\s\S]*?)\n```\s*$/;
    const match = trimmed.match(markdownBlockRegex);
    if (match) {
      return match[1];
    }
    return response;
  }

  /**
   * Clear the chat history
   */
  public clearChat(): void {
    this.chatHistory = [];
    this.referencedNotes = [];
    this.messagesContainer.empty();
    this.renderReferencedNotes();
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
    this.inputTextarea?.focus();
  }

  /**
   * Set the input value and optionally send
   */
  public async setInputAndSend(message: string, send: boolean = false): Promise<void> {
    if (this.inputTextarea) {
      this.inputTextarea.value = message;
      if (send) {
        await this.sendMessage();
      } else {
        this.inputTextarea.focus();
      }
    }
  }
}
