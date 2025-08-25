import { Setting } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../../../main';

/**
 * Settings section for detection engine overview configuration
 */
export class DetectionEngineSection {
	private plugin: AutoSyntaxHighlightPlugin;

	constructor(plugin: AutoSyntaxHighlightPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Creates the detection engine overview settings section
	 * @param containerEl The container element to add settings to
	 */
	create(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Detection Engine' });

		const registeredDetectors = this.plugin.detectionEngine.getRegisteredDetectors();
		const detectionOrder = this.getDetectionOrder();

		// Global confidence threshold
		new Setting(containerEl)
			.setName('Global confidence threshold')
			.setDesc('Default confidence threshold for detectors that don\'t have their own threshold configured (0-100)')
			.addSlider(slider => {
				slider
					.setLimits(0, 100, 5)
					.setValue(this.plugin.settings.confidenceThreshold)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.confidenceThreshold = value;
						await this.plugin.saveSettings();
						// Update the display
						const valueEl = slider.sliderEl.parentElement?.querySelector('.setting-item-info');
						if (valueEl) {
							valueEl.textContent = `Current: ${value}%`;
						}
					});
			})
			.then(setting => {
				// Add current value display
				const desc = setting.descEl;
				desc.createSpan({ text: ` (Current: ${this.plugin.settings.confidenceThreshold}%)` });
			});
	}

	/**
	 * Gets the current detection order
	 * @returns Array of detector names in order
	 */
	private getDetectionOrder(): string[] {
		const configs = this.plugin.settings.detectorConfigurations || {};
		
		return Object.entries(configs)
			.filter(([_, config]) => config.enabled)
			.sort((a, b) => a[1].order - b[1].order)
			.map(([name, _]) => name);
	}
}
