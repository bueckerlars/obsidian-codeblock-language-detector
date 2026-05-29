import { Setting } from 'obsidian';
import { ProcessingScope } from '../../../types';
import AutoSyntaxHighlightPlugin from '../../../../main';

/**
 * Settings section for processing scope configuration
 */
export class ProcessingScopeSection {
	private plugin: AutoSyntaxHighlightPlugin;

	constructor(plugin: AutoSyntaxHighlightPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Creates the processing scope settings section
	 * @param containerEl The container element to add settings to
	 */
	create(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName('Processing Scope')
			.setHeading();

		new Setting(containerEl)
			.setName('Code block processing scope')
			.setDesc('Controls manual processing (ribbon icon, command palette). "Entire vault" processes all markdown files; automatic triggers always process only the current note.')
			.addDropdown(dropdown => {
				dropdown
					.addOption('current-note', 'Current note only')
					.addOption('entire-vault', 'Entire vault')
					.setValue(this.plugin.settings.processingScope)
					.onChange(async (value: ProcessingScope) => {
						this.plugin.settings.processingScope = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
