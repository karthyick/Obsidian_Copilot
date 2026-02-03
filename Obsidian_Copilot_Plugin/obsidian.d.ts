// This file declares the global types for Obsidian API

declare module 'obsidian' {
    export class Plugin {
        app: App;
        constructor(app: App, manifest: PluginManifest);
        addStatusBarItem(): StatusBarItem;
        addCommand(command: Command): void;
        registerEvent(eventRef: EventRef): void;
        registerInterval(interval: number): void;
        registerMarkdownPostProcessor(processor: MarkdownPostProcessor): void;
        addSettingTab(settingTab: PluginSettingTab): void;
        registerView(viewType: string, viewCreator: (leaf: WorkspaceLeaf) => View): void;
        loadData(): Promise<any>;
        saveData(data: any): Promise<void>;
        loadSettings(): Promise<void>;
        saveSettings(): Promise<void>;
        onunload(): void;
    }

    export class ItemView extends View {
        leaf: WorkspaceLeaf;
        onOpen(): Promise<void>;
        onClose(): Promise<void>;
        constructor(leaf: WorkspaceLeaf);
    }

    export class PluginSettingTab {
        app: App;
        plugin: Plugin;
        containerEl: HTMLElement;
        constructor(app: App, plugin: Plugin);
        display(): void;
        hide(): void;
    }

    // New interfaces/classes or updated ones

    export interface App {
        workspace: Workspace;
        commands: Commands;
        fileManager: FileManager;
        vault: Vault;
    }
    export interface Workspace {
        activeLeaf: WorkspaceLeaf | null;
        getActiveViewOfType<T extends View>(type: new (...args: any[]) => T): T | null;
        getRightLeaf(createAndActivate: boolean): WorkspaceLeaf;
        revealLeaf(leaf: WorkspaceLeaf): void;
        getLeavesOfType(viewType: string): WorkspaceLeaf[];
        detachLeavesOfType(viewType: string): void;
        on(name: string, callback: (...args: any[]) => any): EventRef;
    }
    export interface Commands {
        registerCommand(command: Command): void;
    }
    export interface Command {
        id: string;
        name: string;
        callback?: () => any;
        checkCallback?: (checking: boolean) => boolean;
    }
    export class MarkdownView extends View { // Changed from interface to class
        editor: Editor;
        file: TFile;
    }
    export class Editor { // Changed from interface to class
        getValue(): string;
    }
    export class View { // Changed from interface to class
        leaf: WorkspaceLeaf;
        getViewType(): string;
        getDisplayText(): string;
        containerEl: HTMLElement;
    }
    export interface WorkspaceLeaf {
        setViewState(state: ViewState, ephemeral?: boolean): Promise<void>;
    }
    export interface ViewState {
        type: string;
        active: boolean;
    }

    export interface StatusBarItem extends HTMLElement {
        setText(text: string): this;
    }

    export interface TFile {
        path: string;
        basename: string;
    }
    export class Notice {
        constructor(message: string | HTMLElement, timeout?: number);
    }
    export type EventRef = any;
    export type MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => void;
    export interface MarkdownPostProcessorContext {}

    export class Setting {
        constructor(containerEl: HTMLElement);
        setName(name: string): Setting;
        setDesc(desc: string): Setting;
        addText(cb: (component: TextComponent) => any): Setting;
        addToggle(cb: (component: ToggleComponent) => any): Setting;
    }
    export class TextComponent {
        setPlaceholder(placeholder: string): TextComponent;
        setValue(value: string): TextComponent;
        onChange(cb: (value: string) => any): TextComponent;
    }
    export class ToggleComponent {
        setValue(value: boolean): ToggleComponent;
        onChange(cb: (value: boolean) => any): ToggleComponent;
    }
    export interface FileManager { }
    export interface Vault { }

    export interface PluginManifest {
        id: string;
        name: string;
        version: string;
        minAppVersion: string;
        author: string;
        description: string;
    }

    export interface Menu {
        addItem(cb: (item: MenuItem) => any): any;
    }
    export interface MenuItem {
        setTitle(title: string): MenuItem;
        setIcon(icon: string): MenuItem;
        onClick(cb: () => any): MenuItem;
    }
}
