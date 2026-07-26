import { Setting, Notice } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../../../main';
import { ConfirmModal } from '../../utils/ConfirmModal';
import { JsonExportModal } from '../../utils/JsonExportModal';
import { JsonImportModal } from '../../utils/JsonImportModal';

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
			.setDesc('Export history data as JSON (copy from dialog)')
			.addButton(button => {
				button
					.setButtonText('Export')
					.onClick(() => {
						this.exportHistory();
					});
			});

		// Import history button
		new Setting(containerEl)
			.setName('Import history')
			.setDesc('Import history data from pasted JSON')
			.addButton(button => {
				button
					.setButtonText('Import')
					.onClick(() => {
						this.openImportHistoryModal();
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
	 * Opens a dialog to export history as JSON
	 */
	private exportHistory(): void {
		try {
			const historyJson = this.plugin.historyService.exportHistory();
			new JsonExportModal(
				this.plugin.app,
				'Export History',
				'Copy the JSON below to back up your detection history.',
				historyJson
			).open();
		} catch (error) {
			console.error('Error exporting history:', error);
			new Notice('Error exporting history');
		}
	}

	/**
	 * Opens a dialog to import history from pasted JSON
	 */
	private openImportHistoryModal(): void {
		new JsonImportModal(
			this.plugin.app,
			'Import History',
			'Paste exported history JSON below.',
			async (jsonText) => {
				const confirmModal = new ConfirmModal(
					this.plugin.app,
					'Import History',
					'Replace existing history? Click OK to replace, Cancel to merge.'
				);
				confirmModal.open();
				const replace = await confirmModal.promise;
				const importedCount = this.plugin.historyService.importHistory(jsonText, replace);
				new Notice(`Imported ${importedCount} history entries`);
			},
			(jsonText) => {
				try {
					const parsed = JSON.parse(jsonText);
					return Array.isArray(parsed) || 'Invalid history data format';
				} catch {
					return 'Invalid JSON format';
				}
			}
		).open();
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
