/**
 * Utility functions for settings validation
 */
export class SettingsValidation {
	/**
	 * Validates imported settings format
	 * @param settings The settings object to validate
	 * @returns True if settings are valid
	 */
	static validateSettings(settings: unknown): boolean {
		if (typeof settings !== 'object' || settings === null) {
			return false;
		}

		const s = settings as Record<string, unknown>;
		return (
			typeof s.triggerBehavior === 'string' &&
			typeof s.confidenceThreshold === 'number' &&
			typeof s.enableHistory === 'boolean' &&
			typeof s.maxHistoryEntries === 'number' &&
			typeof s.showNotifications === 'boolean' &&
			typeof s.processingScope === 'string'
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
	static validateDetectorConfig(config: unknown): boolean {
		if (typeof config !== 'object' || config === null) {
			return false;
		}

		const c = config as Record<string, unknown>;
		return (
			typeof c.enabled === 'boolean' &&
			typeof c.confidenceThreshold === 'number' &&
			typeof c.order === 'number' &&
			typeof c.config === 'object' &&
			c.config !== null
		);
	}
}
