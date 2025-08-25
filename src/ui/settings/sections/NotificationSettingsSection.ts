import { Setting } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../../../main';

/**
 * Settings section for notification configuration
 */
export class NotificationSettingsSection {
	private plugin: AutoSyntaxHighlightPlugin;

	constructor(plugin: AutoSyntaxHighlightPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Creates the notification settings section
	 * @param containerEl The container element to add settings to
	 */
	create(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Notifications' });

		new Setting(containerEl)
			.setName('Show notifications')
			.setDesc('Display notifications when languages are detected and applied')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.showNotifications)
					.onChange(async (value) => {
						this.plugin.settings.showNotifications = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
