'use strict';

var obsidian = require('obsidian');

const VIEW_TYPE_OBSIDIAN_COPILOT_DASHBOARD = 'obsidian-copilot-dashboard-view';
class ObsidianCopilotDashboardView extends obsidian.ItemView {
    constructor(leaf) {
        super(leaf);
    }
    getViewType() {
        return VIEW_TYPE_OBSIDIAN_COPILOT_DASHBOARD;
    }
    getDisplayText() {
        return 'Obsidian Copilot Dashboard';
    }
    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl('h2', { text: 'Obsidian Copilot Dashboard' });
        const taskListContainer = container.createDiv({ cls: 'obsidian-copilot-task-list-container' });
        this.renderTasks(taskListContainer);
    }
    renderTasks(container) {
        container.empty();
        // Mock data for tasks
        const mockTasks = [
            { id: 'TASK-001', name: 'Implement feature X', status: 'in-progress' },
            { id: 'TASK-002', name: 'Review PR #123', status: 'pending' },
            { id: 'TASK-003', name: 'Fix bug in component Y', status: 'completed' },
            { id: 'TASK-004', name: 'Write documentation for Z', status: 'failed' },
        ];
        if (mockTasks.length === 0) {
            container.createEl('p', { text: 'No active tasks found.' });
            return;
        }
        const ul = container.createEl('ul', { cls: 'obsidian-copilot-task-list' });
        mockTasks.forEach(task => {
            const li = ul.createEl('li', { cls: 'obsidian-copilot-task-list-item' });
            li.createSpan({ text: `${task.id}: `, cls: 'task-id' });
            li.createSpan({ text: task.name, cls: 'task-name' });
            li.createSpan({ text: ` (${task.status})`, cls: `task-status task-status-${task.status}` });
        });
    }
    async onClose() {
        // Nothing to close for now
    }
}

const DEFAULT_SETTINGS = {
    mySetting: 'default',
    readyToStartFolderPath: 'Copilot/Ready to Start' // Default path
};
class CopilotSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Obsidian Copilot Settings' });
        new obsidian.Setting(containerEl)
            .setName('Setting #1')
            .setDesc('It\'s a secret')
            .addText(text => text
            .setPlaceholder('Enter your secret')
            .setValue(this.plugin.settings.mySetting)
            .onChange(async (value) => {
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName('Ready to Start Folder Path')
            .setDesc('Specify the path to the folder where notes will be moved when ready to start processing by the Copilot.')
            .addText(text => text
            .setPlaceholder('e.g., Copilot/Ready to Start')
            .setValue(this.plugin.settings.readyToStartFolderPath)
            .onChange(async (value) => {
            this.plugin.settings.readyToStartFolderPath = value;
            await this.plugin.saveSettings();
        }));
    }
}

class MyPlugin extends obsidian.Plugin {
    async onload() {
        await this.loadSettings();
        this.statusBarItemEl = this.addStatusBarItem(); // Subtask 3.1: Create status bar item
        this.statusBarItemEl.setText('Copilot Tasks: Loading...'); // Subtask 3.2: Initialize widget text
        // Subtask 4.2: Activate notification listener
        this.listenForOrchestratorNotifications();
        this.addCommand({
            id: 'send-note-to-pipeline',
            name: 'Send note to Copilot pipeline',
            callback: async () => {
                const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
                if (activeView) {
                    const noteContent = activeView.editor.getValue();
                    console.log('Sending note to orchestrator:', noteContent);
                    await this.sendNoteToOrchestrator(noteContent);
                }
                else {
                    console.log('No active Markdown view found.');
                    new obsidian.Notice('No active Markdown view found to send to pipeline.');
                }
            }
        });
        this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, view) => {
            menu.addItem((item) => {
                item
                    .setTitle('Send to Copilot Pipeline')
                    .setIcon('send')
                    .onClick(async () => {
                    const noteContent = editor.getValue();
                    console.log('Sending note to orchestrator from context menu:', noteContent);
                    await this.sendNoteToOrchestrator(noteContent);
                });
            });
        }));
        this.registerInterval(window.setInterval(async () => {
            const activeTasks = await this.fetchActiveTasksCount();
            this.statusBarItemEl.setText(`Copilot Tasks: ${activeTasks}`);
        }, 5000) // Update every 5 seconds
        );
        this.registerInterval(window.setInterval(async () => {
            const activeTasks = await this.fetchActiveTasksCount();
            this.statusBarItemEl.setText(`Copilot Tasks: ${activeTasks}`);
        }, 5000) // Update every 5 seconds
        );
        // Subtask 5.1: Register Markdown post-processor
        // Subtask 5.2: Identify task ID patterns
        // Subtask 5.3: Implement task status fetch stub
        // Subtask 5.4: Render status badge
        this.registerMarkdownPostProcessor((el, ctx) => {
            const taskPattern = /\bTASK-(\d+)\b/g;
            el.querySelectorAll('p').forEach(async (p) => {
                const text = p.textContent;
                if (text) {
                    let match;
                    let lastIndex = 0;
                    const fragment = document.createDocumentFragment();
                    while ((match = taskPattern.exec(text)) !== null) {
                        const taskId = match[0]; // e.g., TASK-123
                        const fullMatch = match[0]; // The entire matched string
                        // Add text before the current match
                        fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                        // Fetch mock status
                        const status = await this.getTaskStatus(taskId);
                        // Create and append badge
                        fragment.appendChild(this.createTaskBadge(fullMatch, status));
                        lastIndex = taskPattern.lastIndex;
                    }
                    // Add any remaining text after the last match
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
                    // Replace the paragraph's content with the new fragment
                    p.empty();
                    p.appendChild(fragment);
                }
            });
        });
        this.addSettingTab(new CopilotSettingTab(this.app, this));
        // Subtask 6.2: Register view and command
        this.registerView(VIEW_TYPE_OBSIDIAN_COPILOT_DASHBOARD, (leaf) => new ObsidianCopilotDashboardView(leaf));
        this.addCommand({
            id: 'open-copilot-dashboard',
            name: 'Open Copilot Dashboard',
            callback: async () => {
                this.activateView();
            }
        });
    }
    onunload() {
        // Clean up any registered events or resources if necessary.
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_OBSIDIAN_COPILOT_DASHBOARD);
    }
    async activateView() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_OBSIDIAN_COPILOT_DASHBOARD);
        await this.app.workspace.getRightLeaf(false).setViewState({
            type: VIEW_TYPE_OBSIDIAN_COPILOT_DASHBOARD,
            active: true,
        });
        this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(VIEW_TYPE_OBSIDIAN_COPILOT_DASHBOARD)[0]);
    }
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
    // Placeholder function for sending note content to the orchestrator
    // This will be replaced with actual API calls later.
    async sendNoteToOrchestrator(noteContent) {
        console.log('--- Orchestrator Stub ---');
        console.log('Received note content for pipeline:', noteContent);
        console.log('--- End Orchestrator Stub ---');
        new obsidian.Notice('Note sent to Copilot pipeline (stub). Check console for details.');
    }
    // Subtask 3.3: Implement task count fetch stub
    async fetchActiveTasksCount() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockTaskCount = Math.floor(Math.random() * 10); // Mock number between 0 and 9
                console.log('Fetching active tasks (stub):', mockTaskCount);
                resolve(mockTaskCount);
            }, 1000); // Simulate network delay
        });
    }
    // Subtask 4.1: Define notification handler
    async handleTaskCompletion(taskId, status) {
        console.log(`--- Notification Handler ---`);
        console.log(`Received task completion notification for Task ID: ${taskId}, Status: ${status}`);
        // Subtask 4.3: Find and update note content (mock implementation)
        // In a real scenario, you would search for the note file, read its content,
        // modify it, and then write it back.
        // For this stub, we'll simulate the update and log it.
        const mockNoteContent = `
# My Daily Tasks

- [ ] TASK-1234 Some important task
- [ ] Another task to do
- [ ] ${taskId} This is the task that needs updating
- [ ] Yet another task
`;
        const oldTaskString = `- [ ] ${taskId}`;
        const newTaskString = `- [x] ${taskId} ${status}`;
        if (mockNoteContent.includes(oldTaskString)) {
            const updatedNoteContent = mockNoteContent.replace(oldTaskString, newTaskString);
            console.log(`Simulating update of note for task ${taskId}:`);
            console.log(`Original content snippet:\n${oldTaskString}`);
            console.log(`Updated content snippet:\n${newTaskString}`);
            console.log(`Full simulated updated note content:\n${updatedNoteContent}`);
            new obsidian.Notice(`Task ${taskId} status updated to ${status} in mock note.`);
        }
        else {
            console.log(`Could not find task ${taskId} in mock note content.`);
            new obsidian.Notice(`Could not find task ${taskId} in any mock note.`);
        }
        console.log(`--- End Notification Handler ---`);
    }
    // Subtask 4.2: Implement notification listener stub
    async listenForOrchestratorNotifications() {
        console.log('Listening for orchestrator notifications (stub)...');
        this.registerInterval(window.setInterval(async () => {
            const taskId = `TASK-${Math.floor(Math.random() * 10000)}`;
            const statuses = ['completed', 'failed', 'in-progress'];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            console.log(`Simulating notification for ${taskId} with status ${status}`);
            await this.handleTaskCompletion(taskId, status);
        }, 15000) // Simulate receiving a notification every 15 seconds
        );
    }
    // Subtask 5.3: Implement task status fetch stub
    async getTaskStatus(taskId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const statuses = ['pending', 'in-progress', 'completed', 'failed'];
                const mockStatus = statuses[Math.floor(Math.random() * statuses.length)];
                console.log(`Fetching status for ${taskId} (stub): ${mockStatus}`);
                resolve(mockStatus);
            }, 500); // Simulate network delay
        });
    }
    // Subtask 5.4: Helper to create styled task badges
    createTaskBadge(taskId, status) {
        const badge = document.createElement('span');
        badge.textContent = `${taskId} (${status})`;
        badge.className = 'task-badge'; // Base class for styling
        // Add status-specific classes for visual differentiation
        switch (status) {
            case 'pending':
                badge.classList.add('task-badge-pending');
                break;
            case 'in-progress':
                badge.classList.add('task-badge-in-progress');
                break;
            case 'completed':
                badge.classList.add('task-badge-completed');
                break;
            case 'failed':
                badge.classList.add('task-badge-failed');
                break;
            default:
                badge.classList.add('task-badge-unknown');
                break;
        }
        // Apply minimal inline styles for immediate visual feedback (can be overridden by CSS)
        badge.style.display = 'inline-block';
        badge.style.padding = '2px 6px';
        badge.style.borderRadius = '3px';
        badge.style.marginLeft = '5px';
        badge.style.fontSize = '0.8em';
        badge.style.fontWeight = 'bold';
        badge.style.color = '#ffffff';
        switch (status) {
            case 'pending':
                badge.style.backgroundColor = '#f0ad4e'; // Orange
                break;
            case 'in-progress':
                badge.style.backgroundColor = '#5bc0de'; // Blue
                break;
            case 'completed':
                badge.style.backgroundColor = '#5cb85c'; // Green
                break;
            case 'failed':
                badge.style.backgroundColor = '#d9534f'; // Red
                break;
            default:
                badge.style.backgroundColor = '#777777'; // Grey
                break;
        }
        return badge;
    }
}

module.exports = MyPlugin;
