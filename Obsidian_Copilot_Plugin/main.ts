import { type App, Plugin, MarkdownView, Notice, StatusBarItem, Menu, Editor, MenuItem, TFile } from 'obsidian';
import { ObsidianCopilotDashboardView, VIEW_TYPE_EXAMPLE } from './views/dashboard_view';
import { MyPluginSettings, DEFAULT_SETTINGS, MySettingTab } from './settings';

export default class MyPlugin extends Plugin {
	settings!: MyPluginSettings;
	statusBarItemEl!: StatusBarItem; // Declare statusBarItemEl here

	/**
	 * Runs when the plugin is loaded.
	 * Sets up event handlers, registers commands, and initializes components.
	 */
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
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					const noteContent = activeView.editor.getValue();

					await this.sendNoteToOrchestrator(noteContent);

					new Notice('No active Markdown view found to send to pipeline.');
				}
			}
		});

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view) => {
				menu.addItem((item: MenuItem) => {
					item
						.setTitle('Send to Copilot Pipeline')
						.setIcon('send')
						.onClick(async () => {
							const noteContent = editor.getValue();

							await this.sendNoteToOrchestrator(noteContent);
						});
				});
			})
		);

		this.registerInterval(
			window.setInterval(async () => {
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

		this.addSettingTab(new MySettingTab(this.app, this));

		// Subtask 6.2: Register view and command
		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new ObsidianCopilotDashboardView(leaf, this)
		);

		this.addCommand({
			id: 'open-copilot-dashboard',
			name: 'Open Copilot Dashboard',
			callback: async () => {
				this.activateView();
			}
		});
	}

	/**
	 * Runs when the plugin is unloaded.
	 * Cleans up any registered resources.
	 */
	onunload() {
		// Clean up any registered events or resources if necessary.
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);
	}

	/**
	 * Activates and reveals the Copilot Dashboard view.
	 */
	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);

		await this.app.workspace.getRightLeaf(false).setViewState({
			type: VIEW_TYPE_EXAMPLE,
			active: true,
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE)[0]
		);
	}


	/**
	 * Loads the plugin settings from storage.
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * Saves the plugin settings to storage.
	 */
	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Placeholder function for sending note content to the orchestrator
	// This will be replaced with actual API calls later.
	/**
	 * Placeholder function for sending note content to the orchestrator.
	 * This will be replaced with actual API calls later.
	 * @param noteContent The Markdown content of the note to send.
	 */
	private async sendNoteToOrchestrator(noteContent: string): Promise<void> {
		new Notice('Note sent to Copilot pipeline (stub). Check console for details.');
	}

	// Subtask 7.4: Stub 'Ready to Start' action
	/**
	 * Stub for sending a note to the orchestrator to mark it as 'Ready to Start'.
	 * @param noteFilePath The path of the note file to mark as ready.
	 */
	public async sendToOrchestratorAsReady(noteFilePath: string): Promise<void> {
		new Notice(`Note "${noteFilePath}" marked as 'Ready to Start' (stub).`);
	}

	// Subtask 3.3: Implement task count fetch stub
	/**
	 * Stub for fetching the count of active tasks from the orchestrator.
	 * Simulates a network delay and returns a random number.
	 * @returns A promise that resolves with a mock number of active tasks.
	 */
	private async fetchActiveTasksCount(): Promise<number> {
		return new Promise((resolve) => {
			setTimeout(() => {
				const mockTaskCount = Math.floor(Math.random() * 10); // Mock number between 0 and 9
				resolve(mockTaskCount);
			}, 1000); // Simulate network delay
		});
	}

	// Subtask 4.1: Define notification handler
	/**
	 * Handles incoming task completion notifications from the orchestrator.
	 * @param taskId The ID of the task that was updated.
	 * @param status The new status of the task (e.g., 'completed', 'failed').
	 */
	private async handleTaskCompletion(taskId: string, status: string): Promise<void> {

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
			new Notice(`Task ${taskId} status updated to ${status} in mock note.`);
		} else {
			new Notice(`Could not find task ${taskId} in any mock note.`);
		}


	}

	// Subtask 4.2: Implement notification listener stub
	/**
	 * Stub for listening to orchestrator notifications.
	 * Simulates receiving periodic task completion notifications.
	 */
	private async listenForOrchestratorNotifications(): Promise<void> {
		this.registerInterval(
			window.setInterval(async () => {
				const taskId = `TASK-${Math.floor(Math.random() * 10000)}`;
				const statuses = ['completed', 'failed', 'in-progress'];
				const status = statuses[Math.floor(Math.random() * statuses.length)];
				await this.handleTaskCompletion(taskId, status);
			}, 15000) // Simulate receiving a notification every 15 seconds
		);
	}

	// Subtask 5.3: Implement task status fetch stub
	/**
	 * Stub for fetching the status of a specific task from the orchestrator.
	 * Simulates a network delay and returns a random status.
	 * @param taskId The ID of the task to fetch the status for.
	 * @returns A promise that resolves with a mock status string.
	 */
	private async getTaskStatus(taskId: string): Promise<string> {
		return new Promise((resolve) => {
			setTimeout(() => {
				const statuses = ['pending', 'in-progress', 'completed', 'failed'];
				const mockStatus = statuses[Math.floor(Math.random() * statuses.length)];
				resolve(mockStatus);
			}, 500); // Simulate network delay
		});
	}

	// Subtask 5.4: Helper to create styled task badges
	/**
	 * Creates a styled HTML span element representing a task badge.
	 * @param taskId The ID of the task to display.
	 * @param status The status of the task (e.g., 'pending', 'in-progress', 'completed', 'failed').
	 * @returns An HTMLElement representing the task badge.
	 */
	private createTaskBadge(taskId: string, status: string): HTMLElement {
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
