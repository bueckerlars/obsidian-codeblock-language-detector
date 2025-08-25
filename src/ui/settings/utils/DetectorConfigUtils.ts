import { DetectorConfiguration } from '../../../types';
import AutoSyntaxHighlightPlugin from '../../../../main';

/**
 * Utility functions for detector configuration management
 */
export class DetectorConfigUtils {
	private plugin: AutoSyntaxHighlightPlugin;

	constructor(plugin: AutoSyntaxHighlightPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Gets detector configuration with fallback to defaults
	 * @param detectorName The detector name
	 * @returns The detector configuration
	 */
	getDetectorConfig(detectorName: string): DetectorConfiguration {
		const configs = this.plugin.settings.detectorConfigurations || {};
		return configs[detectorName] || {
			enabled: true,
			confidenceThreshold: this.plugin.settings.confidenceThreshold,
			order: 0,
			config: {}
		};
	}

	/**
	 * Updates detector configuration
	 * @param detectorName The detector name
	 * @param config The new configuration
	 */
	async updateDetectorConfig(detectorName: string, config: DetectorConfiguration): Promise<void> {
		// Ensure detectorConfigurations exists
		if (!this.plugin.settings.detectorConfigurations) {
			this.plugin.settings.detectorConfigurations = {};
		}
		
		this.plugin.settings.detectorConfigurations[detectorName] = config;
		await this.plugin.saveSettings();
		
		// Apply the configuration to the detection engine
		this.plugin.updateDetectionEngineSettings();
	}

	/**
	 * Gets the current detection order
	 * @returns Array of detector names in order
	 */
	getDetectionOrder(): string[] {
		const configs = this.plugin.settings.detectorConfigurations || {};
		
		return Object.entries(configs)
			.filter(([_, config]) => config.enabled)
			.sort((a, b) => a[1].order - b[1].order)
			.map(([name, _]) => name);
	}

	/**
	 * Toggles a detector's enabled state
	 * @param detectorName The detector name
	 * @param enabled Whether the detector should be enabled
	 */
	async toggleDetector(detectorName: string, enabled: boolean): Promise<void> {
		const currentConfig = this.getDetectorConfig(detectorName);
		
		await this.updateDetectorConfig(detectorName, {
			...currentConfig,
			enabled: enabled
		});
	}

	/**
	 * Moves a detector to a new position in the order
	 * @param detectorName The detector name
	 * @param newOrder The new position
	 */
	async moveDetector(detectorName: string, newOrder: number): Promise<void> {
		const detectionOrder = this.getDetectionOrder();
		const currentIndex = detectionOrder.indexOf(detectorName);
		
		if (currentIndex === -1 || newOrder < 0 || newOrder >= detectionOrder.length) {
			return;
		}
		
		// Reorder the array
		const newDetectionOrder = [...detectionOrder];
		newDetectionOrder.splice(currentIndex, 1);
		newDetectionOrder.splice(newOrder, 0, detectorName);
		
		// Update all order values
		for (let i = 0; i < newDetectionOrder.length; i++) {
			const detName = newDetectionOrder[i];
			const config = this.getDetectorConfig(detName);
			await this.updateDetectorConfig(detName, {
				...config,
				order: i
			});
		}
	}
}
