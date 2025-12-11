import { App, PluginSettingTab, Setting, Notice, DropdownComponent, setIcon, FuzzySuggestModal, TFile, ButtonComponent } from "obsidian";
import type AIAssistantPlugin from "./main";
import {
  AIAssistantSettings,
  AIProvider,
  PROVIDER_NAMES,
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

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Add glassmorphism class to settings container
    containerEl.addClass("ai-assistant-settings");

    new Setting(containerEl).setName("AI Assistant settings").setHeading();

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

    // Info Section
    this.renderInfoSection(containerEl);
  }

  /**
   * Render provider selection section
   */
  private renderProviderSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("AI provider").setHeading();

    new Setting(containerEl)
      .setName("Active provider")
      .setDesc("Select which AI provider to use")
      .addDropdown((dropdown) => {
        for (const [value, label] of Object.entries(PROVIDER_NAMES)) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(this.plugin.settings.provider);
        dropdown.onChange(async (value) => {
          this.plugin.settings.provider = value as AIProvider;
          await this.plugin.saveSettings();
          this.plugin.reinitializeLLMService();
          this.display(); // Refresh to show/hide relevant settings
        });
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
          this.plugin.settings.awsAccessKeyId &&
          this.plugin.settings.awsSecretAccessKey
        );
      case "gemini":
        return !!this.plugin.settings.geminiApiKey;
      case "groq":
        return !!this.plugin.settings.groqApiKey;
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

    new Setting(section).setName("AWS Bedrock (Claude)").setHeading();

    if (!isActive) {
      section.createEl("p", {
        text: "Switch to AWS Bedrock provider to use these settings.",
        cls: "setting-item-description",
      });
    }

    new Setting(section)
      .setName("AWS access key ID")
      .setDesc("Your AWS access key ID")
      .addText((text) =>
        text
          .setPlaceholder("Enter your access key ID")
          .setValue(this.plugin.settings.awsAccessKeyId)
          .onChange(async (value) => {
            this.plugin.settings.awsAccessKeyId = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(section)
      .setName("AWS secret access key")
      .setDesc("Your AWS secret access key")
      .addText((text) => {
        text
          .setPlaceholder("Enter your secret access key")
          .setValue(this.plugin.settings.awsSecretAccessKey)
          .onChange(async (value) => {
            this.plugin.settings.awsSecretAccessKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
        return text;
      });

    new Setting(section)
      .setName("AWS session token (optional)")
      .setDesc("Session token for temporary credentials")
      .addText((text) => {
        text
          .setPlaceholder("Enter session token (if using temporary credentials)")
          .setValue(this.plugin.settings.awsSessionToken)
          .onChange(async (value) => {
            this.plugin.settings.awsSessionToken = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
        return text;
      });

    new Setting(section)
      .setName("AWS region")
      .setDesc("AWS region where Bedrock is enabled (e.g., us-east-1, us-west-2, ap-south-1)")
      .addText((text) =>
        text
          .setPlaceholder("e.g., us-east-1")
          .setValue(this.plugin.settings.awsRegion)
          .onChange(async (value) => {
            this.plugin.settings.awsRegion = value.trim();
            await this.plugin.saveSettings();
            this.plugin.reinitializeLLMService();
          })
      );

    new Setting(section)
      .setName("Model")
      .setDesc("Select the Claude model to use")
      .addDropdown((dropdown) => {
        this.bedrockDropdown = dropdown;
        this.populateBedrockDropdown(dropdown);
        dropdown.setValue(this.plugin.settings.bedrockModelId);
        dropdown.onChange(async (value) => {
          this.plugin.settings.bedrockModelId = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide custom model textbox
        });
      })
      .addButton((button) =>
        button
          .setIcon("refresh-cw")
          .setTooltip("Refresh models list")
          .onClick(async () => {
            button.setDisabled(true);
            await this.refreshBedrockModels();
            button.setDisabled(false);
            new Notice("Bedrock models refreshed");
          })
      );

    // Custom model ID textbox (shown when "Other" is selected)
    if (this.plugin.settings.bedrockModelId === "other") {
      new Setting(section)
        .setName("Custom model ID")
        .setDesc("Enter the full Bedrock model ID (e.g., anthropic.claude-3-opus-20240229-v1:0)")
        .addText((text) =>
          text
            .setPlaceholder("Enter custom model ID")
            .setValue(this.plugin.settings.bedrockCustomModelId)
            .onChange(async (value) => {
              this.plugin.settings.bedrockCustomModelId = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    // Test Connection Button
    new Setting(section)
      .setName("Test connection")
      .setDesc("Verify your AWS credentials and model access")
      .addButton((button) =>
        button
          .setButtonText("Test connection")
          .setCta()
          .onClick(async () => {
            await this.testProviderConnection("bedrock", button);
          })
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
        text: "Switch to Google Gemini provider to use these settings.",
        cls: "setting-item-description",
      });
    }

    new Setting(section)
      .setName("Gemini API key")
      .setDesc("Your Google AI Studio API key")
      .addText((text) => {
        text
          .setPlaceholder("Enter your Gemini API key")
          .setValue(this.plugin.settings.geminiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.geminiApiKey = value;
            await this.plugin.saveSettings();
            // Refresh models when API key changes
            void this.refreshGeminiModels();
          });
        text.inputEl.type = "password";
        return text;
      });

    new Setting(section)
      .setName("Model")
      .setDesc("Select the Gemini model to use (fetched from API)")
      .addDropdown((dropdown) => {
        this.geminiDropdown = dropdown;
        this.populateGeminiDropdown(dropdown);
        dropdown.setValue(this.plugin.settings.geminiModelId);
        dropdown.onChange(async (value) => {
          this.plugin.settings.geminiModelId = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide custom model textbox
        });
      })
      .addButton((button) =>
        button
          .setIcon("refresh-cw")
          .setTooltip("Refresh models from API")
          .onClick(async () => {
            button.setDisabled(true);
            await this.refreshGeminiModels();
            button.setDisabled(false);
            new Notice("Gemini models refreshed");
          })
      );

    // Custom model ID textbox (shown when "Other" is selected)
    if (this.plugin.settings.geminiModelId === "other") {
      new Setting(section)
        .setName("Custom model ID")
        .setDesc("Enter the Gemini model ID (e.g., gemini-1.5-pro-latest)")
        .addText((text) =>
          text
            .setPlaceholder("Enter custom model ID")
            .setValue(this.plugin.settings.geminiCustomModelId)
            .onChange(async (value) => {
              this.plugin.settings.geminiCustomModelId = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    // Test Connection Button
    new Setting(section)
      .setName("Test connection")
      .setDesc("Verify your Gemini API key")
      .addButton((button) =>
        button
          .setButtonText("Test connection")
          .setCta()
          .onClick(async () => {
            await this.testProviderConnection("gemini", button);
          })
      );

    // API Key link
    const linkContainer = section.createDiv({ cls: "ai-assistant-link" });
    const link = linkContainer.createEl("a", {
      text: "Get a Gemini API key from Google AI Studio",
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
        this.plugin.settings.bedrockModelId = this.bedrockModels[0].id;
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
    if (!this.plugin.settings.geminiApiKey) {
      this.geminiModels = ModelFetcher.getFallbackGeminiModels();
    } else {
      const models = await ModelFetcher.fetchGeminiModels(this.plugin.settings.geminiApiKey);
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
        this.plugin.settings.geminiModelId = this.geminiModels[0].id;
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
        text: "Switch to Groq provider to use these settings.",
        cls: "setting-item-description",
      });
    }

    new Setting(section)
      .setName("Groq API key")
      .setDesc("Your Groq API key")
      .addText((text) => {
        text
          .setPlaceholder("Enter your Groq API key")
          .setValue(this.plugin.settings.groqApiKey)
          .onChange(async (value) => {
            this.plugin.settings.groqApiKey = value;
            await this.plugin.saveSettings();
            // Refresh models when API key changes
            void this.refreshGroqModels();
          });
        text.inputEl.type = "password";
        return text;
      });

    new Setting(section)
      .setName("Model")
      .setDesc("Select the Groq model to use (fetched from API)")
      .addDropdown((dropdown) => {
        this.groqDropdown = dropdown;
        this.populateGroqDropdown(dropdown);
        dropdown.setValue(this.plugin.settings.groqModelId);
        dropdown.onChange(async (value) => {
          this.plugin.settings.groqModelId = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide custom model textbox
        });
      })
      .addButton((button) =>
        button
          .setIcon("refresh-cw")
          .setTooltip("Refresh models from API")
          .onClick(async () => {
            button.setDisabled(true);
            await this.refreshGroqModels();
            button.setDisabled(false);
            new Notice("Groq models refreshed");
          })
      );

    // Custom model ID textbox (shown when "Other" is selected)
    if (this.plugin.settings.groqModelId === "other") {
      new Setting(section)
        .setName("Custom model ID")
        .setDesc("Enter the Groq model ID (e.g., llama-3.2-90b-text-preview)")
        .addText((text) =>
          text
            .setPlaceholder("Enter custom model ID")
            .setValue(this.plugin.settings.groqCustomModelId)
            .onChange(async (value) => {
              this.plugin.settings.groqCustomModelId = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    // Test Connection Button
    new Setting(section)
      .setName("Test connection")
      .setDesc("Verify your Groq API key")
      .addButton((button) =>
        button
          .setButtonText("Test connection")
          .setCta()
          .onClick(async () => {
            await this.testProviderConnection("groq", button);
          })
      );

    // API Key link
    const linkContainer = section.createDiv({ cls: "ai-assistant-link" });
    const link = linkContainer.createEl("a", {
      text: "Get a Groq API key from GroqCloud",
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
    if (!this.plugin.settings.groqApiKey) {
      this.groqModels = ModelFetcher.getFallbackGroqModels();
    } else {
      const models = await ModelFetcher.fetchGroqModels(this.plugin.settings.groqApiKey);
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
        this.plugin.settings.groqModelId = this.groqModels[0].id;
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
      button.setButtonText("Test connection");
    }
  }

  /**
   * Render common settings
   */
  private renderCommonSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Generation settings").setHeading();

    new Setting(containerEl)
      .setName("Max tokens")
      .setDesc("Maximum number of tokens in the response (256-4096)")
      .addSlider((slider) =>
        slider
          .setLimits(256, 4096, 256)
          .setValue(this.plugin.settings.maxTokens)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxTokens = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Temperature")
      .setDesc("Response creativity (0 = focused, 1 = creative)")
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.1)
          .setValue(this.plugin.settings.temperature)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.temperature = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Behavior").setHeading();

    new Setting(containerEl)
      .setName("Auto-include note context")
      .setDesc("Automatically include the active note content in AI requests")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoIncludeContext)
          .onChange(async (value) => {
            this.plugin.settings.autoIncludeContext = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Stream responses")
      .setDesc("Show AI responses in real-time as they are generated")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.streamResponses)
          .onChange(async (value) => {
            this.plugin.settings.streamResponses = value;
            await this.plugin.saveSettings();
          })
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
              async (file) => {
                if (!this.plugin.settings.excludedNotes.includes(file.path)) {
                  this.plugin.settings.excludedNotes.push(file.path);
                  await this.plugin.saveSettings();
                  this.display(); // Refresh to show new note
                  new Notice(`Added "${file.basename}" to excluded notes`);
                } else {
                  new Notice(`"${file.basename}" is already excluded`);
                }
              }
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
        removeBtn.addEventListener("click", async () => {
          this.plugin.settings.excludedNotes = this.plugin.settings.excludedNotes.filter(
            (p) => p !== notePath
          );
          await this.plugin.saveSettings();
          this.display();
          const basename = notePath.split("/").pop()?.replace(".md", "") || notePath;
          new Notice(`Removed "${basename}" from excluded notes`);
        });
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
          .onChange(async (value) => {
            this.plugin.settings.systemPrompt = value;
            await this.plugin.saveSettings();
          });
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
          .setButtonText("Reset to Default")
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.systemPrompt = "";
            await this.plugin.saveSettings();
            this.display();
            new Notice("System prompt reset to default");
          })
      );
  }

  /**
   * Render info section
   */
  private renderInfoSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Information").setHeading();

    const infoDiv = containerEl.createDiv({ cls: "ai-assistant-info" });
    infoDiv.createEl("p", {
      text: "This plugin supports multiple AI providers. Configure at least one provider to start using the AI Assistant.",
    });

    const listEl = infoDiv.createEl("ul");
    listEl.createEl("li", {
      text: "AWS Bedrock: Requires AWS account with Bedrock access and Claude models enabled",
    });
    listEl.createEl("li", {
      text: "Google Gemini: Requires Google AI Studio API key (free tier available)",
    });
    listEl.createEl("li", {
      text: "Groq: Requires Groq API key (free tier available with rate limits)",
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
      if (!settings.awsAccessKeyId) {
        errors.push("AWS Access Key ID is required");
      }
      if (!settings.awsSecretAccessKey) {
        errors.push("AWS Secret Access Key is required");
      }
      if (!settings.awsRegion) {
        errors.push("AWS Region is required");
      }
      if (!settings.bedrockModelId) {
        errors.push("Bedrock Model is required");
      }
      break;

    case "gemini":
      if (!settings.geminiApiKey) {
        errors.push("Gemini API Key is required");
      }
      if (!settings.geminiModelId) {
        errors.push("Gemini Model is required");
      }
      break;

    case "groq":
      if (!settings.groqApiKey) {
        errors.push("Groq API Key is required");
      }
      if (!settings.groqModelId) {
        errors.push("Groq Model is required");
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
