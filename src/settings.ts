import { App, PluginSettingTab, Setting, Notice, DropdownComponent, setIcon, FuzzySuggestModal, TFile, ButtonComponent } from "obsidian";
import type AIAssistantPlugin from "./main";
import {
  AIAssistantSettings,
  AIProvider,
  PROVIDER_NAMES,
  DEFAULT_HTML_EXPORT_STYLES,
} from "./types";
import { ModelFetcher, ModelInfo } from "./modelFetcher";

/**
 * Modal for selecting notes to exclude
 */
class ExcludedNoteSuggesterModal extends FuzzySuggestModal<TFile> {
  private onSelect: (file: TFile) => void;
  private excludedPaths: string[];

  constructor(app: App, excludedPaths: string[], onSelect: (file: TFile) => void) {
    super(app);
    this.onSelect = onSelect;
    this.excludedPaths = excludedPaths;
    this.setPlaceholder("Search for a note to exclude...");
  }

  getItems(): TFile[] {
    // Return all markdown files except already excluded ones
    return this.app.vault.getMarkdownFiles().filter(
      (file) => !this.excludedPaths.includes(file.path)
    );
  }

  getItemText(item: TFile): string {
    return item.path;
  }

  onChooseItem(item: TFile): void {
    this.onSelect(item);
  }
}

/**
 * Settings tab for the AI Assistant plugin
 */
export class AIAssistantSettingTab extends PluginSettingTab {
  plugin: AIAssistantPlugin;
  private bedrockModels: ModelInfo[] = [];
  private geminiModels: ModelInfo[] = [];
  private groqModels: ModelInfo[] = [];
  private bedrockDropdown: DropdownComponent | null = null;
  private geminiDropdown: DropdownComponent | null = null;
  private groqDropdown: DropdownComponent | null = null;

  constructor(app: App, plugin: AIAssistantPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // Utility wrappers to convert async functions to void-returning callbacks.
  private wrapVoid<T>(fn: (value: T) => Promise<void>) {
    return (value: T) => void fn(value);
  }

  private wrapVoid0(fn: () => Promise<void>) {
    return () => void fn();
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Add glassmorphism class to settings container
    containerEl.addClass("ai-assistant-settings");

    new Setting(containerEl).setName("AI assistant").setHeading();

    // Provider Selection Section
    this.renderProviderSection(containerEl);

    // Provider-specific settings
    this.renderBedrockSettings(containerEl);
    this.renderGeminiSettings(containerEl);
    this.renderGroqSettings(containerEl);

    // Common Settings Section
    this.renderCommonSettings(containerEl);

    // System Prompt Section
    this.renderSystemPromptSection(containerEl);

    // HTML Export Section
    this.renderHtmlExportSection(containerEl);

    // Info Section
    this.renderInfoSection(containerEl);
  }

  /**
   * Render provider selection section
   */
  private renderProviderSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("AI provider").setHeading();

    new Setting(containerEl)
      .setName("Active AI provider")
      .setDesc("Select which AI provider to use")
      .addDropdown((dropdown) => {
        for (const [value, label] of Object.entries(PROVIDER_NAMES)) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(this.plugin.settings.provider);
        dropdown.onChange(this.wrapVoid(async (value) => {
          this.plugin.settings.provider = value as AIProvider;
          await this.plugin.saveSettings();
          this.plugin.reinitializeLLMService();
          this.display(); // Refresh to show/hide relevant settings
        }));
      });

    // Provider status badges
    const statusContainer = containerEl.createDiv({
      cls: "ai-assistant-provider-status",
    });

    const providers: AIProvider[] = ["bedrock", "gemini", "groq"];
    for (const provider of providers) {
      const isActive = this.plugin.settings.provider === provider;
      const isConfigured = this.isProviderConfigured(provider);

      const badge = statusContainer.createSpan({
        cls: `ai-assistant-status-badge ${isActive ? "active" : ""} ${isConfigured ? "configured" : "not-configured"}`,
      });
      badge.createSpan({ text: PROVIDER_NAMES[provider] });
      badge.createSpan({
        text: isConfigured ? " ✓" : " ○",
        cls: "status-icon",
      });
    }
  }

  /**
   * Check if a provider is configured
   */
  private isProviderConfigured(provider: AIProvider): boolean {
    switch (provider) {
      case "bedrock":
        return !!(
          this.plugin.settings.bedrock.awsAccessKeyId &&
          this.plugin.settings.bedrock.awsSecretAccessKey
        );
      case "gemini":
        return !!this.plugin.settings.gemini.geminiApiKey;
      case "groq":
        return !!this.plugin.settings.groq.groqApiKey;
      default:
        return false;
    }
  }

  /**
   * Render AWS Bedrock settings
   */
  private renderBedrockSettings(containerEl: HTMLElement): void {
    const isActive = this.plugin.settings.provider === "bedrock";

    const section = containerEl.createDiv({
      cls: `ai-assistant-provider-section ${isActive ? "active" : "inactive"}`,
    });

    new Setting(section).setName("AWS Bedrock").setHeading();

    if (!isActive) {
      section.createEl("p", {
        text: "Switch to AWS Bedrock provider to configure it.",
        cls: "setting-item-description",
      });
    }

    new Setting(section)
      .setName("Access key")
      .setDesc("Your AWS access key ID")
      .addText((text) =>
        text
          .setPlaceholder("Enter your access key ID")
          .setValue(this.plugin.settings.bedrock.awsAccessKeyId)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.bedrock.awsAccessKeyId = value;
            await this.plugin.saveSettings();
          }))
      );

    new Setting(section)
      .setName("Secret key")
      .setDesc("Your AWS secret access key")
      .addText((text) => {
        text
          .setPlaceholder("Enter your secret access key")
          .setValue(this.plugin.settings.bedrock.awsSecretAccessKey)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.bedrock.awsSecretAccessKey = value;
            await this.plugin.saveSettings();
          }));
        text.inputEl.type = "password";
        return text;
      });

    new Setting(section)
      .setName("Session token (optional)")
      .setDesc("Session token for temporary credentials")
      .addText((text) => {
        text
          .setPlaceholder("Enter session token (if using temporary credentials)")
          .setValue(this.plugin.settings.bedrock.awsSessionToken)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.bedrock.awsSessionToken = value;
            await this.plugin.saveSettings();
          }));
        text.inputEl.type = "password";
        return text;
      });

    new Setting(section)
      .setName("Region")
      .setDesc("AWS region where Bedrock is enabled (e.g., us-east-1, us-west-2, ap-south-1)")
      .addText((text) =>
        text
          .setPlaceholder("Region code")
          .setValue(this.plugin.settings.bedrock.awsRegion)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.bedrock.awsRegion = value.trim();
            await this.plugin.saveSettings();
            this.plugin.reinitializeLLMService();
          }))
      );

    new Setting(section)
      .setName("Model")
      .setDesc("Select the Claude model to use")
      .addDropdown((dropdown) => {
        this.bedrockDropdown = dropdown;
        this.populateBedrockDropdown(dropdown);
        dropdown.setValue(this.plugin.settings.bedrock.bedrockModelId);
        dropdown.onChange(this.wrapVoid(async (value) => {
          this.plugin.settings.bedrock.bedrockModelId = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide custom model textbox
        }));
      })
      .addButton((button) =>
        button
          .setIcon("refresh-cw")
          .setTooltip("Refresh models list")
          .onClick(this.wrapVoid0(async () => {
            button.setDisabled(true);
            await this.refreshBedrockModels();
            button.setDisabled(false);
            new Notice("Bedrock models refreshed");
          }))
      );

    // Custom model ID textbox (shown when "Other" is selected)
    if (this.plugin.settings.bedrock.bedrockModelId === "other") {
      new Setting(section)
        .setName("Custom model")
        .setDesc("Full Bedrock model ID")
        .addText((text) =>
          text
            .setPlaceholder("Enter custom model ID")
            .setValue(this.plugin.settings.bedrock.bedrockCustomModelId)
            .onChange(this.wrapVoid(async (value) => {
              this.plugin.settings.bedrock.bedrockCustomModelId = value.trim();
              await this.plugin.saveSettings();
            }))
        );
    }

    // Test Connection Button
    new Setting(section)
      .setName("Connection")
      .setDesc("Verify your AWS credentials and model access")
      .addButton((button) =>
        button
          .setButtonText("Test")
          .setCta()
          .onClick(this.wrapVoid0(async () => {
            await this.testProviderConnection("bedrock", button);
          }))
      );
  }

  /**
   * Render Google Gemini settings
   */
  private renderGeminiSettings(containerEl: HTMLElement): void {
    const isActive = this.plugin.settings.provider === "gemini";

    const section = containerEl.createDiv({
      cls: `ai-assistant-provider-section ${isActive ? "active" : "inactive"}`,
    });

    new Setting(section).setName("Google Gemini").setHeading();

    if (!isActive) {
      section.createEl("p", {
        text: "Switch to Google Gemini provider to configure it.",
        cls: "setting-item-description",
      });
    }

    new Setting(section)
      .setName("API key")
      .setDesc("Google AI Studio API key")
      .addText((text) => {
        text
          .setPlaceholder("Enter API key")
          .setValue(this.plugin.settings.gemini.geminiApiKey)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.gemini.geminiApiKey = value;
            await this.plugin.saveSettings();
            // Refresh models when API key changes
            void this.refreshGeminiModels();
          }));
        text.inputEl.type = "password";
        return text;
      });

    new Setting(section)
      .setName("Model")
      .setDesc("Select the Gemini model to use (fetched from API)")
      .addDropdown((dropdown) => {
        this.geminiDropdown = dropdown;
        this.populateGeminiDropdown(dropdown);
        dropdown.setValue(this.plugin.settings.gemini.geminiModelId);
        dropdown.onChange(this.wrapVoid(async (value) => {
          this.plugin.settings.gemini.geminiModelId = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide custom model textbox
        }));
      })
      .addButton((button) =>
        button
          .setIcon("refresh-cw")
          .setTooltip("Refresh models from API")
          .onClick(this.wrapVoid0(async () => {
            button.setDisabled(true);
            await this.refreshGeminiModels();
            button.setDisabled(false);
            new Notice("Gemini models refreshed");
          }))
      );

    // Custom model ID textbox (shown when "Other" is selected)
    if (this.plugin.settings.gemini.geminiModelId === "other") {
      new Setting(section)
        .setName("Custom model")
        .setDesc("Gemini model ID")
        .addText((text) =>
          text
            .setPlaceholder("Enter custom model ID")
            .setValue(this.plugin.settings.gemini.geminiCustomModelId)
            .onChange(this.wrapVoid(async (value) => {
              this.plugin.settings.gemini.geminiCustomModelId = value.trim();
              await this.plugin.saveSettings();
            }))
        );
    }

    // Test Connection Button
    new Setting(section)
      .setName("Connection")
      .setDesc("Verify your Gemini API key")
      .addButton((button) =>
        button
          .setButtonText("Test")
          .setCta()
          .onClick(this.wrapVoid0(async () => {
            await this.testProviderConnection("gemini", button);
          }))
      );

    // API Key link
    const linkContainer = section.createDiv({ cls: "ai-assistant-link" });
    const link = linkContainer.createEl("a", {
      text: "Google AI Studio",
      href: "https://aistudio.google.com/app/apikey",
    });
    link.setAttr("target", "_blank");

    // Auto-fetch models if API key is set
    if (this.plugin.settings.geminiApiKey && this.geminiModels.length === 0) {
      void this.refreshGeminiModels();
    }
  }

  /**
   * Refresh Bedrock models
   */
  private async refreshBedrockModels(): Promise<void> {
    this.bedrockModels = ModelFetcher.getFallbackBedrockModels();

    if (this.bedrockDropdown) {
      const currentValue = this.bedrockDropdown.getValue();
      this.populateBedrockDropdown(this.bedrockDropdown);
      // Restore selection if still valid
      const validModel = this.bedrockModels.find(m => m.id === currentValue);
      if (validModel) {
        this.bedrockDropdown.setValue(currentValue);
      } else if (this.bedrockModels.length > 0) {
        this.bedrockDropdown.setValue(this.bedrockModels[0].id);
        this.plugin.settings.bedrock.bedrockModelId = this.bedrockModels[0].id;
        await this.plugin.saveSettings();
      }
    }
  }

  /**
   * Populate Bedrock dropdown with models
   */
  private populateBedrockDropdown(dropdown: DropdownComponent): void {
    // Clear existing options
    dropdown.selectEl.empty();

    const models = this.bedrockModels.length > 0
      ? this.bedrockModels
      : ModelFetcher.getFallbackBedrockModels();

    for (const model of models) {
      dropdown.addOption(model.id, model.name);
    }
  }

  /**
   * Refresh Gemini models from API
   */
  private async refreshGeminiModels(): Promise<void> {
    if (!this.plugin.settings.gemini.geminiApiKey) {
      this.geminiModels = ModelFetcher.getFallbackGeminiModels();
    } else {
      const models = await ModelFetcher.fetchGeminiModels(this.plugin.settings.gemini.geminiApiKey);
      this.geminiModels = models.length > 0 ? models : ModelFetcher.getFallbackGeminiModels();
    }

    if (this.geminiDropdown) {
      const currentValue = this.geminiDropdown.getValue();
      this.populateGeminiDropdown(this.geminiDropdown);
      // Restore selection if still valid, otherwise use first model
      const validModel = this.geminiModels.find(m => m.id === currentValue);
      if (validModel) {
        this.geminiDropdown.setValue(currentValue);
      } else if (this.geminiModels.length > 0) {
        this.geminiDropdown.setValue(this.geminiModels[0].id);
        this.plugin.settings.gemini.geminiModelId = this.geminiModels[0].id;
        await this.plugin.saveSettings();
      }
    }
  }

  /**
   * Populate Gemini dropdown with models
   */
  private populateGeminiDropdown(dropdown: DropdownComponent): void {
    // Clear existing options
    dropdown.selectEl.empty();

    const models = this.geminiModels.length > 0
      ? this.geminiModels
      : ModelFetcher.getFallbackGeminiModels();

    for (const model of models) {
      dropdown.addOption(model.id, model.name);
    }
  }

  /**
   * Render Groq settings
   */
  private renderGroqSettings(containerEl: HTMLElement): void {
    const isActive = this.plugin.settings.provider === "groq";

    const section = containerEl.createDiv({
      cls: `ai-assistant-provider-section ${isActive ? "active" : "inactive"}`,
    });

    new Setting(section).setName("Groq").setHeading();

    if (!isActive) {
      section.createEl("p", {
        text: "Switch to Groq provider to configure it.",
        cls: "setting-item-description",
      });
    }

    new Setting(section)
      .setName("API key")
      .setDesc("Your Groq API key")
      .addText((text) => {
        text
          .setPlaceholder("Enter API key")
          .setValue(this.plugin.settings.groq.groqApiKey)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.groq.groqApiKey = value;
            await this.plugin.saveSettings();
            // Refresh models when API key changes
            void this.refreshGroqModels();
          }));
        text.inputEl.type = "password";
        return text;
      });

    new Setting(section)
      .setName("Model")
      .setDesc("Select the Groq model to use (fetched from API)")
      .addDropdown((dropdown) => {
        this.groqDropdown = dropdown;
        this.populateGroqDropdown(dropdown);
        dropdown.setValue(this.plugin.settings.groq.groqModelId);
        dropdown.onChange(this.wrapVoid(async (value) => {
          this.plugin.settings.groq.groqModelId = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide custom model textbox
        }));
      })
      .addButton((button) =>
        button
          .setIcon("refresh-cw")
          .setTooltip("Refresh models from API")
          .onClick(this.wrapVoid0(async () => {
            button.setDisabled(true);
            await this.refreshGroqModels();
            button.setDisabled(false);
            new Notice("Groq models refreshed");
          }))
      );

    // Custom model ID textbox (shown when "Other" is selected)
    if (this.plugin.settings.groq.groqModelId === "other") {
      new Setting(section)
        .setName("Custom model")
        .setDesc("Groq model ID")
        .addText((text) =>
          text
            .setPlaceholder("Enter custom model ID")
            .setValue(this.plugin.settings.groq.groqCustomModelId)
            .onChange(this.wrapVoid(async (value) => {
              this.plugin.settings.groq.groqCustomModelId = value.trim();
              await this.plugin.saveSettings();
            }))
        );
    }

    // Test Connection Button
    new Setting(section)
      .setName("Connection")
      .setDesc("Verify your Groq API key")
      .addButton((button) =>
        button
          .setButtonText("Test")
          .setCta()
          .onClick(this.wrapVoid0(async () => {
            await this.testProviderConnection("groq", button);
          }))
      );

    // API Key link
    const linkContainer = section.createDiv({ cls: "ai-assistant-link" });
    const link = linkContainer.createEl("a", {
      text: "Get an API key from GroqCloud",
      href: "https://console.groq.com/keys",
    });
    link.setAttr("target", "_blank");

    // Auto-fetch models if API key is set
    if (this.plugin.settings.groqApiKey && this.groqModels.length === 0) {
      void this.refreshGroqModels();
    }
  }

  /**
   * Refresh Groq models from API
   */
  private async refreshGroqModels(): Promise<void> {
    if (!this.plugin.settings.groq.groqApiKey) {
      this.groqModels = ModelFetcher.getFallbackGroqModels();
    } else {
      const models = await ModelFetcher.fetchGroqModels(this.plugin.settings.groq.groqApiKey);
      this.groqModels = models.length > 0 ? models : ModelFetcher.getFallbackGroqModels();
    }

    if (this.groqDropdown) {
      const currentValue = this.groqDropdown.getValue();
      this.populateGroqDropdown(this.groqDropdown);
      // Restore selection if still valid, otherwise use first model
      const validModel = this.groqModels.find(m => m.id === currentValue);
      if (validModel) {
        this.groqDropdown.setValue(currentValue);
      } else if (this.groqModels.length > 0) {
        this.groqDropdown.setValue(this.groqModels[0].id);
        this.plugin.settings.groq.groqModelId = this.groqModels[0].id;
        await this.plugin.saveSettings();
      }
    }
  }

  /**
   * Populate Groq dropdown with models
   */
  private populateGroqDropdown(dropdown: DropdownComponent): void {
    // Clear existing options
    dropdown.selectEl.empty();

    const models = this.groqModels.length > 0
      ? this.groqModels
      : ModelFetcher.getFallbackGroqModels();

    for (const model of models) {
      dropdown.addOption(model.id, model.name);
    }
  }

  /**
   * Test connection for a specific provider
   */
  private async testProviderConnection(
    provider: AIProvider,
    button: ButtonComponent
  ): Promise<void> {
    button.setDisabled(true);
    button.setButtonText("Testing...");

    try {
      const result = await this.plugin.testProviderConnection(provider);
      if (result.success) {
        new Notice(`✓ ${PROVIDER_NAMES[provider]} connection successful!`);
      } else {
        new Notice(`✗ ${PROVIDER_NAMES[provider]} failed: ${result.message}`);
      }
    } catch (error) {
      new Notice(
        `✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      button.setDisabled(false);
      button.setButtonText("Test");
    }
  }

  /**
   * Render common settings
   */
  private renderCommonSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Generation").setHeading();

    new Setting(containerEl)
      .setName("Max tokens")
      .setDesc("Maximum number of tokens in the response (256-4096)")
      .addSlider((slider) =>
        slider
          .setLimits(256, 4096, 256)
          .setValue(this.plugin.settings.maxTokens)
          .setDynamicTooltip()
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.maxTokens = value;
            await this.plugin.saveSettings();
          }))
      );

    new Setting(containerEl)
      .setName("Temperature")
      .setDesc("Response creativity (0 = focused, 1 = creative)")
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.1)
          .setValue(this.plugin.settings.temperature)
          .setDynamicTooltip()
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.temperature = value;
            await this.plugin.saveSettings();
          }))
      );

    new Setting(containerEl).setName("Behavior").setHeading();

    new Setting(containerEl)
      .setName("Auto-include note context")
      .setDesc("Automatically include the active note content in AI requests")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoIncludeContext)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.autoIncludeContext = value;
            await this.plugin.saveSettings();
          }))
      );

    new Setting(containerEl)
      .setName("Stream responses")
      .setDesc("Show AI responses in real-time as they are generated")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.streamResponses)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.streamResponses = value;
            await this.plugin.saveSettings();
          }))
      );

    // Excluded Notes Section
    this.renderExcludedNotesSection(containerEl);
  }

  /**
   * Render excluded notes section
   */
  private renderExcludedNotesSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Excluded notes").setHeading();
    containerEl.createEl("p", {
      text: "Notes listed here will never be included in AI context, even when referenced. Use this to protect sensitive information.",
      cls: "setting-item-description",
    });

    // Add note button with search
    new Setting(containerEl)
      .setName("Add excluded note")
      .setDesc("Search and add a note to the exclusion list")
      .addButton((button) =>
        button
          .setButtonText("Add note")
          .setIcon("file-plus")
          .onClick(() => {
            // Open note suggester
            const modal = new ExcludedNoteSuggesterModal(
              this.app,
              this.plugin.settings.excludedNotes,
              this.wrapVoid(async (file) => {
                if (!this.plugin.settings.excludedNotes.includes(file.path)) {
                  this.plugin.settings.excludedNotes.push(file.path);
                  await this.plugin.saveSettings();
                  this.display(); // Refresh to show new note
                  new Notice(`Added "${file.basename}" to excluded notes`);
                } else {
                  new Notice(`"${file.basename}" is already excluded`);
                }
              })
            );
            modal.open();
          })
      );

    // List of currently excluded notes
    if (this.plugin.settings.excludedNotes.length > 0) {
      const listContainer = containerEl.createDiv({ cls: "ai-assistant-excluded-notes-list" });

      for (const notePath of this.plugin.settings.excludedNotes) {
        const noteItem = listContainer.createDiv({ cls: "ai-assistant-excluded-note-item" });

        // Note icon and path
        const noteInfo = noteItem.createDiv({ cls: "ai-assistant-excluded-note-info" });
        const icon = noteInfo.createSpan({ cls: "ai-assistant-excluded-note-icon" });
        setIcon(icon, "file-x");
        noteInfo.createSpan({ text: notePath, cls: "ai-assistant-excluded-note-path" });

        // Remove button
        const removeBtn = noteItem.createEl("button", {
          cls: "ai-assistant-excluded-note-remove",
          attr: { "aria-label": "Remove from exclusion list" },
        });
        setIcon(removeBtn, "trash-2");
        removeBtn.addEventListener("click", this.wrapVoid0(async () => {
          this.plugin.settings.excludedNotes = this.plugin.settings.excludedNotes.filter(
            (p) => p !== notePath
          );
          await this.plugin.saveSettings();
          this.display();
          const basename = notePath.split("/").pop()?.replace(".md", "") || notePath;
          new Notice(`Removed "${basename}" from excluded notes`);
        }));
      }
    } else {
      containerEl.createEl("p", {
        text: "No notes are currently excluded.",
        cls: "ai-assistant-no-excluded-notes",
      });
    }
  }

  /**
   * Render system prompt section
   */
  private renderSystemPromptSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("System prompt").setHeading();
    containerEl.createEl("p", {
      text: "Customize the AI's behavior and capabilities. Leave empty to use the default prompt.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Custom system prompt")
      .setDesc("Override the default system prompt (optional)")
      .addTextArea((text) => {
        text
          .setPlaceholder("Leave empty for default prompt...")
          .setValue(this.plugin.settings.systemPrompt)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.systemPrompt = value;
            await this.plugin.saveSettings();
          }));
        text.inputEl.rows = 10;
        text.inputEl.cols = 50;
        text.inputEl.addClass("ai-assistant-system-prompt-textarea");
        return text;
      });

    new Setting(containerEl)
      .setName("Reset system prompt")
      .setDesc("Reset to the default system prompt")
      .addButton((button) =>
        button
          .setButtonText("Reset to default")
          .setWarning()
          .onClick(this.wrapVoid0(async () => {
            this.plugin.settings.systemPrompt = "";
            await this.plugin.saveSettings();
            this.display();
            new Notice("System prompt reset to default");
          }))
      );
  }

  /**
   * Render HTML export settings section
   */
  private renderHtmlExportSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Export").setHeading();
    containerEl.createEl("p", {
      text: "Customize the appearance of exported files",
      cls: "setting-item-description",
    });

    // Ensure htmlExportStyles exists (for migration from older settings)
    if (!this.plugin.settings.htmlExportStyles) {
      this.plugin.settings.htmlExportStyles = { ...DEFAULT_HTML_EXPORT_STYLES };
    }

    // Dark mode toggle
    new Setting(containerEl)
      .setName("Export dark mode")
      .setDesc("Use dark color scheme for exported files")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.htmlExportStyles.useDarkMode)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.htmlExportStyles.useDarkMode = value;
            await this.plugin.saveSettings();
          }))
      );

    // Font family
    new Setting(containerEl)
      .setName("Export font")
      .setDesc("Font family for exported documents")
      .addText((text) =>
        text
          .setPlaceholder("")
          .setValue(this.plugin.settings.htmlExportStyles.fontFamily)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.htmlExportStyles.fontFamily = value || DEFAULT_HTML_EXPORT_STYLES.fontFamily;
            await this.plugin.saveSettings();
          }))
      );

    // Font size
    new Setting(containerEl)
      .setName("Font size")
      .setDesc("Base font size (e.g., 11pt, 14px, 1rem)")
      .addText((text) =>
        text
          .setPlaceholder("11pt")
          .setValue(this.plugin.settings.htmlExportStyles.fontSize)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.htmlExportStyles.fontSize = value || DEFAULT_HTML_EXPORT_STYLES.fontSize;
            await this.plugin.saveSettings();
          }))
      );

    // Max width
    new Setting(containerEl)
      .setName("Max content width")
      .setDesc("Maximum width of the content area (e.g., 800px, 60rem)")
      .addText((text) =>
        text
          .setPlaceholder("800px")
          .setValue(this.plugin.settings.htmlExportStyles.maxWidth)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.htmlExportStyles.maxWidth = value || DEFAULT_HTML_EXPORT_STYLES.maxWidth;
            await this.plugin.saveSettings();
          }))
      );

    // Link color
    new Setting(containerEl)
      .setName("Link color")
      .setDesc("Color for hyperlinks (hex format, e.g., #0969da)")
      .addText((text) =>
        text
          .setPlaceholder("#0969da")
          .setValue(this.plugin.settings.htmlExportStyles.linkColor)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.htmlExportStyles.linkColor = value || DEFAULT_HTML_EXPORT_STYLES.linkColor;
            await this.plugin.saveSettings();
          }))
      );

    // Code background
    new Setting(containerEl)
      .setName("Code block background")
      .setDesc("Background color for code blocks (hex format)")
      .addText((text) =>
        text
          .setPlaceholder("#f6f8fa")
          .setValue(this.plugin.settings.htmlExportStyles.codeBackground)
          .onChange(this.wrapVoid(async (value) => {
            this.plugin.settings.htmlExportStyles.codeBackground = value || DEFAULT_HTML_EXPORT_STYLES.codeBackground;
            await this.plugin.saveSettings();
          }))
      );

    // Reset to defaults button
    new Setting(containerEl)
      .setName("Reset styles")
      .setDesc("Reset all export styles to default values")
      .addButton((button) =>
        button
          .setButtonText("Reset")
          .setWarning()
          .onClick(this.wrapVoid0(async () => {
            this.plugin.settings.htmlExportStyles = { ...DEFAULT_HTML_EXPORT_STYLES };
            await this.plugin.saveSettings();
            this.display();
            new Notice("Export styles reset to default");
          }))
      );
  }

  /**
   * Render info section
   */
  private renderInfoSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("About").setHeading();

    const infoDiv = containerEl.createDiv({ cls: "ai-assistant-info" });
    infoDiv.createEl("p", {
      text: "This plugin supports multiple AI providers. Configure at least one provider to start using the AI assistant.",
    });

    const listEl = infoDiv.createEl("ul");
    listEl.createEl("li", {
      text: "AWS Bedrock: requires AWS account with Bedrock access and Claude models enabled",
    });
    listEl.createEl("li", {
      text: "Google Gemini: requires Google AI Studio API key (free tier available)",
    });
    listEl.createEl("li", {
      text: "Groq: requires Groq API key (free tier available with rate limits)",
    });
  }
}

/**
 * Validates settings for completeness
 */
export function validateSettings(settings: AIAssistantSettings): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  switch (settings.provider) {
    case "bedrock":
      if (!settings.bedrock.awsAccessKeyId) {
        errors.push("AWS Access Key ID is required");
      }
      if (!settings.bedrock.awsSecretAccessKey) {
        errors.push("AWS Secret Access Key is required");
      }
      if (!settings.bedrock.awsRegion) {
        errors.push("AWS Region is required");
      }
      if (!settings.bedrock.bedrockModelId) {
        errors.push("Bedrock model is required");
      }
      break;

    case "gemini":
      if (!settings.gemini.geminiApiKey) {
        errors.push("Gemini API key is required");
      }
      if (!settings.gemini.geminiModelId) {
        errors.push("Gemini model is required");
      }
      break;

    case "groq":
      if (!settings.groq.groqApiKey) {
        errors.push("Groq API key is required");
      }
      if (!settings.groq.groqModelId) {
        errors.push("Groq model is required");
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
