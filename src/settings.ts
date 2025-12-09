import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type AIAssistantPlugin from "./main";
import {
  AIAssistantSettings,
  AIProvider,
  BEDROCK_MODELS,
  GEMINI_MODELS,
  GROQ_MODELS,
  AWS_REGIONS,
  PROVIDER_NAMES,
} from "./types";

/**
 * Settings tab for the AI Assistant plugin
 */
export class AIAssistantSettingTab extends PluginSettingTab {
  plugin: AIAssistantPlugin;

  constructor(app: App, plugin: AIAssistantPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h1", { text: "AI Assistant Settings" });

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
    containerEl.createEl("h2", { text: "AI Provider" });

    new Setting(containerEl)
      .setName("Active Provider")
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

    section.createEl("h2", { text: "AWS Bedrock (Claude)" });

    if (!isActive) {
      section.createEl("p", {
        text: "Switch to AWS Bedrock provider to use these settings.",
        cls: "setting-item-description",
      });
    }

    new Setting(section)
      .setName("AWS Access Key ID")
      .setDesc("Your AWS access key ID")
      .addText((text) =>
        text
          .setPlaceholder("AKIAIOSFODNN7EXAMPLE")
          .setValue(this.plugin.settings.awsAccessKeyId)
          .onChange(async (value) => {
            this.plugin.settings.awsAccessKeyId = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(section)
      .setName("AWS Secret Access Key")
      .setDesc("Your AWS secret access key")
      .addText((text) => {
        text
          .setPlaceholder("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY")
          .setValue(this.plugin.settings.awsSecretAccessKey)
          .onChange(async (value) => {
            this.plugin.settings.awsSecretAccessKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
        return text;
      });

    new Setting(section)
      .setName("AWS Session Token (Optional)")
      .setDesc("Session token for temporary credentials")
      .addText((text) => {
        text
          .setPlaceholder("Optional session token")
          .setValue(this.plugin.settings.awsSessionToken)
          .onChange(async (value) => {
            this.plugin.settings.awsSessionToken = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
        return text;
      });

    new Setting(section)
      .setName("AWS Region")
      .setDesc("AWS region where Bedrock is enabled")
      .addDropdown((dropdown) => {
        for (const [value, label] of Object.entries(AWS_REGIONS)) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(this.plugin.settings.awsRegion);
        dropdown.onChange(async (value) => {
          this.plugin.settings.awsRegion = value;
          await this.plugin.saveSettings();
          this.plugin.reinitializeLLMService();
        });
      });

    new Setting(section)
      .setName("Model")
      .setDesc("Select the Claude model to use")
      .addDropdown((dropdown) => {
        for (const [value, label] of Object.entries(BEDROCK_MODELS)) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(this.plugin.settings.bedrockModelId);
        dropdown.onChange(async (value) => {
          this.plugin.settings.bedrockModelId = value;
          await this.plugin.saveSettings();
        });
      });

    // Test Connection Button
    new Setting(section)
      .setName("Test Connection")
      .setDesc("Verify your AWS credentials and model access")
      .addButton((button) =>
        button
          .setButtonText("Test Connection")
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

    section.createEl("h2", { text: "Google Gemini" });

    if (!isActive) {
      section.createEl("p", {
        text: "Switch to Google Gemini provider to use these settings.",
        cls: "setting-item-description",
      });
    }

    new Setting(section)
      .setName("Gemini API Key")
      .setDesc("Your Google AI Studio API key")
      .addText((text) => {
        text
          .setPlaceholder("Enter your Gemini API key")
          .setValue(this.plugin.settings.geminiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.geminiApiKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
        return text;
      });

    new Setting(section)
      .setName("Model")
      .setDesc("Select the Gemini model to use")
      .addDropdown((dropdown) => {
        for (const [value, label] of Object.entries(GEMINI_MODELS)) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(this.plugin.settings.geminiModelId);
        dropdown.onChange(async (value) => {
          this.plugin.settings.geminiModelId = value;
          await this.plugin.saveSettings();
        });
      });

    // Test Connection Button
    new Setting(section)
      .setName("Test Connection")
      .setDesc("Verify your Gemini API key")
      .addButton((button) =>
        button
          .setButtonText("Test Connection")
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
  }

  /**
   * Render Groq settings
   */
  private renderGroqSettings(containerEl: HTMLElement): void {
    const isActive = this.plugin.settings.provider === "groq";

    const section = containerEl.createDiv({
      cls: `ai-assistant-provider-section ${isActive ? "active" : "inactive"}`,
    });

    section.createEl("h2", { text: "Groq" });

    if (!isActive) {
      section.createEl("p", {
        text: "Switch to Groq provider to use these settings.",
        cls: "setting-item-description",
      });
    }

    new Setting(section)
      .setName("Groq API Key")
      .setDesc("Your Groq API key")
      .addText((text) => {
        text
          .setPlaceholder("Enter your Groq API key")
          .setValue(this.plugin.settings.groqApiKey)
          .onChange(async (value) => {
            this.plugin.settings.groqApiKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
        return text;
      });

    new Setting(section)
      .setName("Model")
      .setDesc("Select the Groq model to use")
      .addDropdown((dropdown) => {
        for (const [value, label] of Object.entries(GROQ_MODELS)) {
          dropdown.addOption(value, label);
        }
        dropdown.setValue(this.plugin.settings.groqModelId);
        dropdown.onChange(async (value) => {
          this.plugin.settings.groqModelId = value;
          await this.plugin.saveSettings();
        });
      });

    // Test Connection Button
    new Setting(section)
      .setName("Test Connection")
      .setDesc("Verify your Groq API key")
      .addButton((button) =>
        button
          .setButtonText("Test Connection")
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
  }

  /**
   * Test connection for a specific provider
   */
  private async testProviderConnection(
    provider: AIProvider,
    button: any
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
      button.setButtonText("Test Connection");
    }
  }

  /**
   * Render common settings
   */
  private renderCommonSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h2", { text: "Generation Settings" });

    new Setting(containerEl)
      .setName("Max Tokens")
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

    containerEl.createEl("h2", { text: "Behavior" });

    new Setting(containerEl)
      .setName("Auto-include Note Context")
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
      .setName("Stream Responses")
      .setDesc("Show AI responses in real-time as they are generated")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.streamResponses)
          .onChange(async (value) => {
            this.plugin.settings.streamResponses = value;
            await this.plugin.saveSettings();
          })
      );
  }

  /**
   * Render system prompt section
   */
  private renderSystemPromptSection(containerEl: HTMLElement): void {
    containerEl.createEl("h2", { text: "System Prompt" });
    containerEl.createEl("p", {
      text: "Customize the AI's behavior and capabilities. Leave empty to use the default prompt.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Custom System Prompt")
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
        text.inputEl.style.width = "100%";
        text.inputEl.style.minHeight = "200px";
        return text;
      });

    new Setting(containerEl)
      .setName("Reset System Prompt")
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
    containerEl.createEl("h2", { text: "Information" });

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
