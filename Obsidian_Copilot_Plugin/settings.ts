import { App, PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from './main';

export interface MyPluginSettings {
    readyToStartFolderPath: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    readyToStartFolderPath: 'Ready to Start', // Default folder path
};

export class MySettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: 'Obsidian Copilot Settings' });

        new Setting(containerEl)
            .setName('Ready to Start Folder Path')
            .setDesc('Specify the path to the folder where notes will be moved to be marked as "Ready to Start".')
            .addText(text => text
                .setPlaceholder('Example: Ready to Start')
                .setValue(this.plugin.settings.readyToStartFolderPath)
                .onChange(async (value) => {
                    this.plugin.settings.readyToStartFolderPath = value;
                    await this.plugin.saveSettings();
                }));
    }
}