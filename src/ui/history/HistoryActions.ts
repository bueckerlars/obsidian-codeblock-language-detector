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

	constructor(app: App, plugin: AutoSyntaxHighlightPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.historyService = plugin.historyService;
	}

	/**
	 * Creates the action buttons section
	 * @param container The container element
	 * @param onRefresh Callback to refresh the modal content
	 */
	createActionButtons(container: HTMLElement, onRefresh: () => void): void {
		const actionsContainer = container.createDiv('modal-actions');

		// Statistics display
		this.createStatisticsDisplay(actionsContainer);

		// Action buttons
		const buttonsContainer = actionsContainer.createDiv('buttons-container');
		this.createActionButtonsRow(buttonsContainer, onRefresh);
	}

	/**
	 * Creates the statistics display
	 * @param container The container element
	 */
	private createStatisticsDisplay(container: HTMLElement): void {
		const stats = this.historyService.getStatistics();
		const statsEl = container.createDiv('stats');
		
		// Basic stats
		const basicStatsDiv = statsEl.createDiv('basic-stats');
		basicStatsDiv.textContent = `Total: ${stats.totalEntries} | Applied: ${stats.appliedEntries} | Avg Confidence: ${stats.avgConfidence}%`;

		// Detailed stats (expandable)
		const detailedStats = this.historyService.getDetailedStatistics();
		if (detailedStats.basic.totalEntries > 0) {
			const expandableStats = statsEl.createDiv('expandable-stats');
			const toggleStatsBtn = expandableStats.createEl('button', {
				text: 'Show Details',
				cls: 'toggle-stats-btn'
			});
			
			const detailedStatsDiv = expandableStats.createDiv('detailed-stats-content');
			detailedStatsDiv.style.display = 'none';
			
			// Method breakdown
			const methodsDiv = detailedStatsDiv.createDiv('methods-breakdown');
			methodsDiv.createEl('h4', { text: 'Detection Methods:' });
			Object.entries(detailedStats.methods).forEach(([method, stats]) => {
				const methodRow = methodsDiv.createDiv('method-row');
				methodRow.textContent = `${method}: ${stats.count} detections (${stats.successRate}% success, ${stats.avgConfidence}% avg confidence)`;
			});

			// Language breakdown
			const languagesDiv = detailedStatsDiv.createDiv('languages-breakdown');
			languagesDiv.createEl('h4', { text: 'Top Languages:' });
			const topLanguages = Object.entries(detailedStats.languages)
				.sort(([,a], [,b]) => b.count - a.count)
				.slice(0, 5);
			
			topLanguages.forEach(([language, stats]) => {
				const langRow = languagesDiv.createDiv('language-row');
				langRow.textContent = `${language}: ${stats.count} detections (${stats.avgConfidence}% avg confidence)`;
			});

			// Trends
			if (detailedStats.trends) {
				const trendsDiv = detailedStatsDiv.createDiv('trends');
				trendsDiv.createEl('h4', { text: 'Trends:' });
				const trendsText = trendsDiv.createDiv();
				trendsText.innerHTML = `
					Confidence: ${detailedStats.trends.confidenceTrend} 
					(Recent: ${detailedStats.trends.recentAvgConfidence}%, Overall: ${detailedStats.trends.overallAvgConfidence}%)<br>
					Application Rate: ${detailedStats.trends.applicationRateTrend} 
					(Recent: ${detailedStats.trends.recentApplicationRate}%, Overall: ${detailedStats.trends.overallApplicationRate}%)
				`;
			}

			toggleStatsBtn.addEventListener('click', () => {
				const isHidden = detailedStatsDiv.style.display === 'none';
				detailedStatsDiv.style.display = isHidden ? 'block' : 'none';
				toggleStatsBtn.textContent = isHidden ? 'Hide Details' : 'Show Details';
			});
		}
	}

	/**
	 * Creates the action buttons row
	 * @param container The container element
	 * @param onRefresh Callback to refresh the modal content
	 */
	private createActionButtonsRow(container: HTMLElement, onRefresh: () => void): void {
		// Export history button
		const exportButton = new ButtonComponent(container);
		exportButton.setButtonText('Export History');
		exportButton.setTooltip('Export history to clipboard as JSON');
		exportButton.onClick(() => {
			this.exportHistory();
		});

		// Import history button
		const importButton = new ButtonComponent(container);
		importButton.setButtonText('Import History');
		importButton.setTooltip('Import history from clipboard');
		importButton.onClick(async () => {
			await this.importHistory(onRefresh);
		});

		// Validate and repair button
		const validateButton = new ButtonComponent(container);
		validateButton.setButtonText('Validate & Repair');
		validateButton.setTooltip('Check and repair history data integrity');
		validateButton.onClick(() => {
			this.validateAndRepairHistory(onRefresh);
		});

		// Clear all button
		const clearButton = new ButtonComponent(container);
		clearButton.setButtonText('Clear All');
		clearButton.setClass('mod-warning');
		clearButton.setTooltip('Remove all history entries');
		clearButton.onClick(() => {
			this.clearAllHistory(onRefresh);
		});

		// Close button
		const closeButton = new ButtonComponent(container);
		closeButton.setButtonText('Close');
		closeButton.setClass('mod-cta');
		closeButton.onClick(() => {
			// This will be handled by the modal
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
	 * Exports history to clipboard
	 */
	private exportHistory(): void {
		try {
			const historyJson = this.historyService.exportHistory();
			navigator.clipboard.writeText(historyJson).then(() => {
				new Notice('History exported to clipboard');
			});
		} catch (error) {
			console.error('Error exporting history:', error);
			new Notice('Error exporting history');
		}
	}

	/**
	 * Imports history from clipboard
	 * @param onRefresh Callback to refresh the modal
	 */
	private async importHistory(onRefresh: () => void): Promise<void> {
		try {
			const clipboardText = await navigator.clipboard.readText();
			
			if (!clipboardText.trim()) {
				new Notice('Clipboard is empty');
				return;
			}

			const replace = confirm('Replace existing history? Click OK to replace, Cancel to merge.');
			const importedCount = this.historyService.importHistory(clipboardText, replace);
			
			new Notice(`Imported ${importedCount} history entries`);
			onRefresh();
		} catch (error) {
			console.error('Error importing history:', error);
			new Notice('Error importing history: Invalid format or clipboard access denied');
		}
	}

	/**
	 * Validates and repairs history data
	 * @param onRefresh Callback to refresh the modal
	 */
	private validateAndRepairHistory(onRefresh: () => void): void {
		try {
			const result = this.historyService.validateAndRepairHistory();
			
			let message = `Validation complete:\n`;
			message += `Total entries: ${result.totalEntries}\n`;
			message += `Valid entries: ${result.validEntries}\n`;
			
			if (result.repairedEntries > 0) {
				message += `Repaired entries: ${result.repairedEntries}\n`;
			}
			
			if (result.removedEntries > 0) {
				message += `Removed invalid entries: ${result.removedEntries}\n`;
			}
			
			if (result.duplicatesRemoved > 0) {
				message += `Removed duplicates: ${result.duplicatesRemoved}\n`;
			}

			if (result.repairedEntries > 0 || result.removedEntries > 0 || result.duplicatesRemoved > 0) {
				message += `\nHistory has been cleaned up.`;
				onRefresh();
			} else {
				message += `\nNo issues found.`;
			}

			new Notice(message);
		} catch (error) {
			console.error('Error validating history:', error);
			new Notice('Error validating history');
		}
	}

	/**
	 * Clears all history entries
	 * @param onRefresh Callback to refresh the modal
	 */
	private clearAllHistory(onRefresh: () => void): void {
		if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
			this.historyService.clearHistory();
			new Notice('History cleared');
			onRefresh();
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
