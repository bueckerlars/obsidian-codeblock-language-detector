import { Setting } from 'obsidian';
import { TriggerBehavior } from '../../../types';
import AutoSyntaxHighlightPlugin from '../../../../main';

/**
 * Settings section for trigger behavior configuration
 */
export class TriggerBehaviorSection {
	private plugin: AutoSyntaxHighlightPlugin;

	constructor(plugin: AutoSyntaxHighlightPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Creates the trigger behavior settings section
	 * @param containerEl The container element to add settings to
	 */
	create(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Trigger Behavior' });

		new Setting(containerEl)
			.setName('When to detect language')
			.setDesc('Choose when the plugin should automatically detect and apply language tags')
			.addDropdown(dropdown => {
				dropdown
					.addOption('auto-on-open', 'When opening a note')
					.addOption('auto-on-edit', 'When editing a note')
					.addOption('auto-on-save', 'When saving a note')
					.addOption('manual', 'Manual only (via command)')
					.setValue(this.plugin.settings.triggerBehavior)
					.onChange(async (value: TriggerBehavior) => {
						this.plugin.settings.triggerBehavior = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
