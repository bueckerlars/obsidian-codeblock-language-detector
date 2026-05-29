import { Notice, Setting } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../../../main';
import { ConfirmModal } from '../../utils/ConfirmModal';
import { JsonExportModal } from '../../utils/JsonExportModal';
import { JsonImportModal } from '../../utils/JsonImportModal';

/**
 * Settings section for advanced configuration
 */
export class AdvancedSettingsSection {
	private plugin: AutoSyntaxHighlightPlugin;

	constructor(plugin: AutoSyntaxHighlightPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Creates the advanced settings section
	 * @param containerEl The container element to add settings to
	 */
	create(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Advanced')
			.setHeading();

		// Plugin version and info
		void new Setting(containerEl)
			.setName('Plugin information')
			.setDesc('Current plugin version and statistics')
			.then(setting => {
				const infoContainer = setting.controlEl.createDiv('aslh-plugin-info');

				// Add version info
				const versionEl = infoContainer.createDiv();
				versionEl.textContent = `Version: ${this.plugin.manifest.version}`;

				// Add statistics if history is enabled
				if (this.plugin.settings.enableHistory) {
					const stats = this.plugin.historyService.getStatistics();
					const statsEl = infoContainer.createDiv('aslh-stats');
					statsEl.textContent = `Total detections: ${stats.totalEntries}, Applied: ${stats.appliedEntries}, Avg confidence: ${stats.avgConfidence}%`;
				}
			});

		// Export/Import settings
		new Setting(containerEl)
			.setName('Export settings')
			.setDesc('Export current plugin settings as JSON (copy from dialog)')
			.addButton(button => {
				button
					.setButtonText('Export')
					.onClick(() => {
						const settings = JSON.stringify(this.plugin.settings, null, 2);
						new JsonExportModal(
							this.plugin.app,
							'Export Settings',
							'Copy the JSON below to back up your plugin settings.',
							settings
						).open();
					});
			});

		new Setting(containerEl)
			.setName('Import settings')
			.setDesc('Import plugin settings from pasted JSON')
			.addButton(button => {
				button
					.setButtonText('Import')
					.onClick(() => {
						new JsonImportModal(
							this.plugin.app,
							'Import Settings',
							'Paste exported settings JSON below.',
							async (jsonText) => {
								const importedSettings = JSON.parse(jsonText);
								if (!this.validateSettings(importedSettings)) {
									new Notice('Invalid settings format');
									throw new Error('Invalid settings format');
								}
								Object.assign(this.plugin.settings, importedSettings);
								await this.plugin.saveSettings();
								this.onSettingsChanged?.();
								new Notice('Settings imported successfully');
							},
							(jsonText) => {
								try {
									const parsed = JSON.parse(jsonText);
									return this.validateSettings(parsed) || 'Invalid settings format';
								} catch {
									return 'Invalid JSON format';
								}
							}
						).open();
					});
			});

		// Reset to defaults
		new Setting(containerEl)
			.setName('Reset to defaults')
			.setDesc('Reset all settings to their default values')
			.addButton(button => {
				button
					.setButtonText('Reset')
					.setWarning()
					.onClick(async () => {
						const modal = new ConfirmModal(this.plugin.app, 'Reset Settings', 'Are you sure you want to reset all settings to defaults?');
						modal.open();
						const confirmed = await modal.promise;
						if (confirmed) {
							await this.plugin.resetSettings();
							// Trigger display refresh
							this.onSettingsChanged?.();
						}
					});
			});
	}

	/**
	 * Callback function called when settings are changed and display needs refresh
	 */
	public onSettingsChanged?: () => void;

	/**
	 * Validates imported settings format
	 * @param settings The settings object to validate
	 * @returns True if settings are valid
	 */
	private validateSettings(settings: any): boolean {
		return (
			typeof settings === 'object' &&
			typeof settings.triggerBehavior === 'string' &&
			typeof settings.confidenceThreshold === 'number' &&
			typeof settings.enableHistory === 'boolean' &&
			typeof settings.maxHistoryEntries === 'number' &&
			typeof settings.showNotifications === 'boolean' &&
			typeof settings.processingScope === 'string'
		);
	}
}
