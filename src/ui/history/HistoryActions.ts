import { App, ButtonComponent, Notice, TFile, MarkdownView } from 'obsidian';
import { HistoryEntry } from '../../types';
import { HistoryService } from '../../services';
import AutoSyntaxHighlightPlugin from '../../../main';

/**
 * Handles actions that can be performed on history entries
 */
export class HistoryActions {
	private app: App;
	private plugin: AutoSyntaxHighlightPlugin;
	private historyService: HistoryService;
	private modal?: { close: () => void };

	constructor(app: App, plugin: AutoSyntaxHighlightPlugin, modal?: { close: () => void }) {
		this.app = app;
		this.plugin = plugin;
		this.historyService = plugin.historyService;
		this.modal = modal;
	}

	/**
	 * Creates the action buttons section
	 * @param container The container element
	 * @param onRefresh Callback to refresh the modal content
	 */
	createActionButtons(container: HTMLElement, onRefresh: () => void): void {
		const actionsContainer = container.createDiv('aslh-modal-actions');

		// Basic statistics display
		this.createBasicStatisticsDisplay(actionsContainer);

		// Action buttons
		const buttonsContainer = actionsContainer.createDiv('aslh-buttons-container');
		this.createActionButtonsRow(buttonsContainer, onRefresh);
	}

	/**
	 * Creates the basic statistics display
	 * @param container The container element
	 */
	private createBasicStatisticsDisplay(container: HTMLElement): void {
		const stats = this.historyService.getStatistics();
		const statsEl = container.createDiv('aslh-stats');
		
		// Basic stats
		const basicStatsDiv = statsEl.createDiv('aslh-basic-stats');
		basicStatsDiv.textContent = `Total: ${stats.totalEntries} | Applied: ${stats.appliedEntries} | Avg Confidence: ${stats.avgConfidence}%`;

		// Show detailed statistics button
		const showStatsBtn = statsEl.createEl('button', {
			text: 'Show Detailed Statistics',
			cls: 'aslh-show-detailed-stats-btn'
		});
		
		showStatsBtn.addEventListener('click', () => {
			// Import here to avoid circular dependency
			import('./StatisticsModal').then(({ StatisticsModal }) => {
				new StatisticsModal(this.app, this.plugin).open();
			});
		});
	}

	/**
	 * Creates the action buttons row
	 * @param container The container element
	 * @param onRefresh Callback to refresh the modal content
	 */
	private createActionButtonsRow(container: HTMLElement, onRefresh: () => void): void {
		// Close button
		const closeButton = new ButtonComponent(container);
		closeButton.setButtonText('Close');
		closeButton.setClass('mod-cta');
		closeButton.onClick(() => {
			if (this.modal) {
				this.modal.close();
			}
		});
	}

	/**
	 * Toggles the status of a history entry (apply/undo)
	 * @param entry The history entry to toggle
	 * @returns Promise that resolves when the action is complete
	 */
	async toggleEntryStatus(entry: HistoryEntry): Promise<boolean> {
		try {
			if (entry.applied) {
				// Undo the entry
				const success = await this.plugin.undoLanguageApplication(entry);
				if (success) {
					this.historyService.undoEntry(entry.id);
					new Notice(`Removed language tag from ${entry.fileName}`);
					return true;
				}
			} else {
				// Reapply the entry
				const success = await this.plugin.reapplyLanguageDetection(entry);
				if (success) {
					this.historyService.reapplyEntry(entry.id);
					new Notice(`Applied language tag to ${entry.fileName}`);
					return true;
				}
			}
			return false;
		} catch (error) {
			console.error('Error toggling entry status:', error);
			new Notice(`Error: ${error.message}`);
			return false;
		}
	}

	/**
	 * Navigates to the file and code block of a history entry
	 * @param entry The history entry to navigate to
	 */
	async navigateToEntry(entry: HistoryEntry): Promise<void> {
		try {
			// Get the file from the vault
			const file = this.app.vault.getAbstractFileByPath(entry.filePath);
			
			if (!file || !(file instanceof TFile)) {
				new Notice(`File not found: ${entry.filePath}`);
				return;
			}
			
			// Open the file
			const leaf = this.app.workspace.getLeaf();
			await leaf.openFile(file);
			
			// Wait a bit for the file to load
			setTimeout(() => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view && view.editor) {
					this.navigateToCodeBlock(view.editor, entry);
				} else {
					new Notice(`Editor for ${entry.fileName} not available`);
				}
			}, 100);
			
		} catch (error) {
			console.error('Error navigating to code block:', error);
			new Notice(`Error opening file: ${entry.fileName}`);
		}
	}

	/**
	 * Navigates to the specific code block in the editor
	 * @param editor The editor instance
	 * @param entry The history entry
	 */
	private navigateToCodeBlock(editor: any, entry: HistoryEntry): void {
		const content = editor.getValue();
		
		// Try to find by line numbers first
		if (entry.codeBlock.startLine && entry.codeBlock.startLine <= editor.lineCount()) {
			editor.setCursor(entry.codeBlock.startLine - 1, 0);
			editor.scrollIntoView({ 
				from: { line: entry.codeBlock.startLine - 1, ch: 0 }, 
				to: { line: entry.codeBlock.startLine - 1, ch: 0 } 
			}, true);
			editor.focus();
			new Notice(`Navigated to line ${entry.codeBlock.startLine} in ${entry.fileName}`);
			return;
		}

		// Fallback: search for code content
		const codeBlockStart = content.indexOf(entry.codeBlock.content);
		if (codeBlockStart !== -1) {
			// Calculate line number
			const beforeCodeBlock = content.substring(0, codeBlockStart);
			const lineNumber = beforeCodeBlock.split('\n').length - 1;
			
			// Jump to the line
			editor.setCursor(lineNumber, 0);
			editor.scrollIntoView({ 
				from: { line: lineNumber, ch: 0 }, 
				to: { line: lineNumber, ch: 0 } 
			}, true);
			editor.focus();
			
			new Notice(`Found code block in ${entry.fileName}`);
		} else {
			new Notice(`Code block not found in ${entry.fileName}`);
		}
	}



	/**
	 * Bulk operations on multiple entries
	 * @param entries The entries to operate on
	 * @param operation The operation to perform
	 * @param onRefresh Callback to refresh the modal
	 */
	async performBulkOperation(
		entries: HistoryEntry[], 
		operation: 'apply' | 'undo' | 'delete',
		onRefresh: () => void
	): Promise<void> {
		if (entries.length === 0) {
			new Notice('No entries selected');
			return;
		}

		const confirmMessage = `Are you sure you want to ${operation} ${entries.length} entries?`;
		if (!confirm(confirmMessage)) {
			return;
		}

		let successCount = 0;
		const totalCount = entries.length;

		for (const entry of entries) {
			try {
				switch (operation) {
					case 'apply':
						if (!entry.applied) {
							const success = await this.plugin.reapplyLanguageDetection(entry);
							if (success) {
								this.historyService.reapplyEntry(entry.id);
								successCount++;
							}
						}
						break;
					case 'undo':
						if (entry.applied) {
							const success = await this.plugin.undoLanguageApplication(entry);
							if (success) {
								this.historyService.undoEntry(entry.id);
								successCount++;
							}
						}
						break;
					case 'delete':
						this.historyService.removeEntry(entry.id);
						successCount++;
						break;
				}
			} catch (error) {
				console.error(`Error performing ${operation} on entry ${entry.id}:`, error);
			}
		}

		new Notice(`${operation} completed: ${successCount}/${totalCount} entries processed`);
		onRefresh();
	}
}
