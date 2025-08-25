import { Setting } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../../../main';

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
		containerEl.createEl('h3', { text: 'History & Undo' });

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

		// Clear history button
		new Setting(containerEl)
			.setName('Clear history')
			.setDesc('Remove all history entries')
			.addButton(button => {
				button
					.setButtonText('Clear All History')
					.setWarning()
					.onClick(async () => {
						if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
							this.plugin.historyService.clearHistory();
						}
					});
			});
	}
}
