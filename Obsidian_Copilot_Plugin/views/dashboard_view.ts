import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import MyPlugin from '../main';

export const VIEW_TYPE_EXAMPLE = 'obsidian-copilot-dashboard-view';

export class ObsidianCopilotDashboardView extends ItemView {
    plugin: MyPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_EXAMPLE;
    }

    getDisplayText() {
        return 'Obsidian Copilot Dashboard';
    }

    	/**
    	 * Runs when the view is opened.
    	 * Initializes the UI components and sets up event listeners.
    	 */
    	async onOpen() {        const container = this.containerEl.children[1];
        container.empty();
        container.createEl('h2', { text: 'Obsidian Copilot Dashboard' });

        const dropZone = container.createDiv('copilot-drop-zone');
        dropZone.setText('Drag and Drop Notes Here to Mark as "Ready to Start"');
        dropZone.style.border = '2px dashed var(--background-modifier-border)';
        dropZone.style.borderRadius = '8px';
        dropZone.style.padding = '20px';
        dropZone.style.textAlign = 'center';
        dropZone.style.marginTop = '20px';
        dropZone.style.marginBottom = '20px';
        dropZone.style.backgroundColor = 'var(--background-secondary)';
        dropZone.style.color = 'var(--text-muted)';
        dropZone.style.transition = 'all 0.2s ease-in-out';

        dropZone.addEventListener('dragover', (e: DragEvent) => {
            e.preventDefault();
            dropZone.style.backgroundColor = 'var(--background-modifier-hover)';
            dropZone.style.borderColor = 'var(--interactive-accent)';
            dropZone.style.color = 'var(--text-normal)';
        });

        dropZone.addEventListener('dragenter', (e: DragEvent) => {
            e.preventDefault();
            dropZone.style.backgroundColor = 'var(--background-modifier-hover)';
            dropZone.style.borderColor = 'var(--interactive-accent)';
            dropZone.style.color = 'var(--text-normal)';
        });

        dropZone.addEventListener('dragleave', (e: DragEvent) => {
            e.preventDefault();
            dropZone.style.backgroundColor = 'var(--background-secondary)';
            dropZone.style.borderColor = 'var(--background-modifier-border)';
            dropZone.style.color = 'var(--text-muted)';
        });

        // Placeholder for drop event (implemented in next subtask)
                dropZone.addEventListener('drop', this.handleDrop.bind(this));

        container.createEl('p', { text: 'Current Pipeline Tasks:' });

        // Implement mock task display (subtask 6.4)
        this.displayMockTasks(container);
    }

    	/**
    	 * Runs when the view is closed.
    	 * Performs any necessary cleanup.
    	 */
    	async onClose() {        // Nothing to clean up, in this example.
    }

	/**
	 * Handles the drop event for notes onto the dashboard's drop zone.
	 * Processes dropped Markdown files to mark them as 'Ready to Start'.
	 * @param e The DragEvent containing information about the dropped item.
	 */
    private async handleDrop(e: DragEvent) {
        e.preventDefault();
        const dropZone = this.containerEl.querySelector('.copilot-drop-zone') as HTMLDivElement;
        if (dropZone) {
            dropZone.style.backgroundColor = 'var(--background-secondary)';
            dropZone.style.borderColor = 'var(--background-modifier-border)';
            dropZone.style.color = 'var(--text-muted)';
        }

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                // Check if it's a Markdown file
                if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
                    // The file.path is a webkitRelativePath for files from file system.
                    // For files dragged from Obsidian, the dataTransfer will have a different format.
                    // We need to handle both cases.

                    // For files dragged from Obsidian, dataTransfer.getData('text/plain') might contain "file://..." or obsidian path
                    const textData = e.dataTransfer?.getData('text/plain');
                    let filePath: string | null = null;

                    if (textData) {
                        // Attempt to parse as Obsidian internal link or file URI
                        // Simple check for file URI (e.g., file:///C:/path/to/note.md)
                        if (textData.startsWith('file://')) {
                            try {
                                // Decode URI and remove 'file://' prefix to get absolute path
                                filePath = decodeURI(textData.substring(7));
                                // Normalize path for Obsidian (remove drive letter for vault relative path, if applicable)
                                // This is a simplified approach, a robust solution would involve matching vault path.
                                if (this.app.vault.adapter.basePath && filePath.startsWith(this.app.vault.adapter.basePath)) {
                                    filePath = filePath.substring(this.app.vault.adapter.basePath.length + 1);
                                }
                            } catch (error) {
                                new Notice('Failed to process dropped file path.');
                            }
                        } else {
                            // Assume it's an Obsidian internal link or plain text for now
                            // Obsidian internal links usually don't contain absolute paths directly in text/plain
                            // For simplicity, we'll treat any .md ending text as a potential path relative to vault root
                            if (textData.endsWith('.md')) {
                                filePath = textData;
                            }
                        }
                    }

                    // If filePath is still null, try using file.path (might be empty or webkitRelativePath)
                    if (!filePath && file.path) {
                        filePath = file.path; // This could be relative or absolute depending on source
                    }

                    if (filePath) {
                        const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
                        if (abstractFile instanceof TFile) {
                            new Notice(`Note "${abstractFile.name}" dropped as "Ready to Start".`);
                            // Call a method on the main plugin to handle this
                            await this.plugin.sendToOrchestratorAsReady(abstractFile.path);
                        } else {
                            new Notice('Dropped file is not a valid Obsidian note.');
                        }
                    } else {
                        new Notice('Could not determine path for dropped file.');
                    }
                } else {
                    new Notice('Only Markdown notes can be dropped here.');
                }
            }
        } else {
        }
    }

	/**
	 * Fetches mock task data.
	 * @returns A promise that resolves with an array of mock task objects.
	 */
    private async fetchMockTasks() {
        return new Promise<Array<{ id: string; name: string; status: string }>>(resolve => {
            setTimeout(() => {
                resolve([
                    { id: 'TASK-001', name: 'Implement login feature', status: 'in-progress' },
                    { id: 'TASK-002', name: 'Design database schema', status: 'completed' },
                    { id: 'TASK-003', name: 'Write API documentation', status: 'pending' },
                    { id: 'TASK-004', name: 'Set up CI/CD pipeline', status: 'failed' },
                ]);
            }, 1000);
        });
    }

	/**
	 * Displays the mock task data in the dashboard view.
	 * @param container The HTMLElement to which the tasks will be appended.
	 */
    private async displayMockTasks(container: Element) {
        const tasks = await this.fetchMockTasks();
        const taskList = container.createEl('ul');
        taskList.empty(); // Clear "Loading tasks..."

        if (tasks.length === 0) {
            taskList.createEl('li', { text: 'No active tasks.' });
            return;
        }

        tasks.forEach(task => {
            const listItem = taskList.createEl('li');
            listItem.createSpan({ text: `${task.name} ` });
            const statusSpan = listItem.createSpan({ text: `(${task.status})` });
            statusSpan.style.fontWeight = 'bold';
            switch (task.status) {
                case 'in-progress':
                    statusSpan.style.color = 'orange';
                    break;
                case 'completed':
                    statusSpan.style.color = 'green';
                    break;
                case 'pending':
                    statusSpan.style.color = 'gray';
                    break;
                case 'failed':
                    statusSpan.style.color = 'red';
                    break;
                default:
                    statusSpan.style.color = 'black';
            }
        });
    }
}
