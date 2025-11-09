import { Setting } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../../../main';

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
		new Setting(containerEl)
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
			.setDesc('Export current plugin settings to clipboard')
			.addButton(button => {
				button
					.setButtonText('Export')
					.onClick(async () => {
						const settings = JSON.stringify(this.plugin.settings, null, 2);
						await navigator.clipboard.writeText(settings);
						console.log('Settings exported to clipboard');
					});
			});

		new Setting(containerEl)
			.setName('Import settings')
			.setDesc('Import plugin settings from clipboard')
			.addButton(button => {
				button
					.setButtonText('Import')
					.onClick(async () => {
						try {
							const clipboardText = await navigator.clipboard.readText();
							const importedSettings = JSON.parse(clipboardText);
							
							if (this.validateSettings(importedSettings)) {
								Object.assign(this.plugin.settings, importedSettings);
								await this.plugin.saveSettings();
								// Trigger display refresh
								this.onSettingsChanged?.();
								console.log('Settings imported successfully');
							} else {
								console.error('Invalid settings format');
							}
						} catch (error) {
							console.error('Failed to import settings:', error);
						}
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
						if (confirm('Are you sure you want to reset all settings to defaults?')) {
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
