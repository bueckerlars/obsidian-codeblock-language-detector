import { Setting, Notice } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../../../main';
import { ConfirmModal } from '../../utils/ConfirmModal';

/**
 * Settings section for history configuration
 */
export class HistorySettingsSection {
	private plugin: AutoSyntaxHighlightPlugin;

	constructor(plugin: AutoSyntaxHighlightPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Creates the history settings section
	 * @param containerEl The container element to add settings to
	 */
	create(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('History & Undo')
			.setHeading();

		// Enable history tracking
		new Setting(containerEl)
			.setName('Enable history tracking')
			.setDesc('Track all language detection and application operations for undo functionality')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.enableHistory)
					.onChange(async (value) => {
						this.plugin.settings.enableHistory = value;
						await this.plugin.saveSettings();
					});
			});

		// Maximum history entries
		new Setting(containerEl)
			.setName('Maximum history entries')
			.setDesc('Maximum number of history entries to keep (higher values use more memory)')
			.addSlider(slider => {
				slider
					.setLimits(10, 1000, 10)
					.setValue(this.plugin.settings.maxHistoryEntries)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxHistoryEntries = value;
						await this.plugin.saveSettings();
					});
			})
			.then(setting => {
				const desc = setting.descEl;
				desc.createSpan({ text: ` (Current: ${this.plugin.settings.maxHistoryEntries})` });
			});

		// Export history button
		new Setting(containerEl)
			.setName('Export history')
			.setDesc('Export history data to clipboard as JSON')
			.addButton(button => {
				button
					.setButtonText('Export to Clipboard')
					.onClick(() => {
						this.exportHistory();
					});
			});

		// Import history button
		new Setting(containerEl)
			.setName('Import history')
			.setDesc('Import history data from clipboard (JSON format)')
			.addButton(button => {
				button
					.setButtonText('Import from Clipboard')
					.onClick(async () => {
						await this.importHistory();
					});
			});

		// Validate and repair button
		new Setting(containerEl)
			.setName('Validate & repair history')
			.setDesc('Check history data integrity and repair if necessary')
			.addButton(button => {
				button
					.setButtonText('Validate & Repair')
					.onClick(() => {
						this.validateAndRepairHistory();
					});
			});

		// Clear history button
		new Setting(containerEl)
			.setName('Clear history')
			.setDesc('Remove all history entries')
			.addButton(button => {
				button
					.setButtonText('Clear All History')
					.setWarning()
					.onClick(async () => {
						const modal = new ConfirmModal(this.plugin.app, 'Clear History', 'Are you sure you want to clear all history? This action cannot be undone.');
						modal.open();
						const confirmed = await modal.promise;
						if (confirmed) {
							this.plugin.historyService.clearHistory();
							new Notice('History cleared');
						}
					});
			});
	}

	/**
	 * Exports history to clipboard
	 */
	private exportHistory(): void {
		try {
			const historyJson = this.plugin.historyService.exportHistory();
			void navigator.clipboard.writeText(historyJson).then(() => {
				new Notice('History exported to clipboard');
			}).catch((error) => {
				console.error('Error exporting history to clipboard:', error);
				new Notice('Error exporting history to clipboard');
			});
		} catch (error) {
			console.error('Error exporting history:', error);
			new Notice('Error exporting history');
		}
	}

	/**
	 * Imports history from clipboard
	 */
	private async importHistory(): Promise<void> {
		try {
			const clipboardText = await navigator.clipboard.readText();
			
			if (!clipboardText.trim()) {
				new Notice('Clipboard is empty');
				return;
			}

			const modal = new ConfirmModal(this.plugin.app, 'Import History', 'Replace existing history? Click OK to replace, Cancel to merge.');
			modal.open();
			const replace = await modal.promise;
			const importedCount = this.plugin.historyService.importHistory(clipboardText, replace);
			
			new Notice(`Imported ${importedCount} history entries`);
		} catch (error) {
			console.error('Error importing history:', error);
			new Notice('Error importing history: Invalid format or clipboard access denied');
		}
	}

	/**
	 * Validates and repairs history data
	 */
	private validateAndRepairHistory(): void {
		try {
			const result = this.plugin.historyService.validateAndRepairHistory();
			
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
			} else {
				message += `\nNo issues found.`;
			}

			new Notice(message);
		} catch (error) {
			console.error('Error validating history:', error);
			new Notice('Error validating history');
		}
	}
}
