/**
 * Utility functions for settings validation
 */
export class SettingsValidation {
	/**
	 * Validates imported settings format
	 * @param settings The settings object to validate
	 * @returns True if settings are valid
	 */
	static validateSettings(settings: any): boolean {
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

	/**
	 * Validates confidence threshold value
	 * @param threshold The threshold value to validate
	 * @returns True if valid
	 */
	static validateConfidenceThreshold(threshold: number): boolean {
		return typeof threshold === 'number' && threshold >= 0 && threshold <= 100;
	}

	/**
	 * Validates max history entries value
	 * @param maxEntries The max entries value to validate
	 * @returns True if valid
	 */
	static validateMaxHistoryEntries(maxEntries: number): boolean {
		return typeof maxEntries === 'number' && maxEntries >= 10 && maxEntries <= 1000;
	}

	/**
	 * Validates detector configuration
	 * @param config The detector configuration to validate
	 * @returns True if valid
	 */
	static validateDetectorConfig(config: any): boolean {
		return (
			typeof config === 'object' &&
			typeof config.enabled === 'boolean' &&
			typeof config.confidenceThreshold === 'number' &&
			typeof config.order === 'number' &&
			typeof config.config === 'object'
		);
	}
}
