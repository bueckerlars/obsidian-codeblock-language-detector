import { DetectorRegistry } from './DetectorRegistry';
import { DetectionOrchestrator } from './DetectionOrchestrator';

/**
 * Manages configuration for the language detection engine
 */
export class ConfigurationManager {
	private registry: DetectorRegistry;
	private orchestrator: DetectionOrchestrator;

	constructor(registry: DetectorRegistry, orchestrator: DetectionOrchestrator) {
		this.registry = registry;
		this.orchestrator = orchestrator;
	}

	/**
	 * Gets the current engine configuration
	 * @returns Configuration object
	 */
	getConfiguration(): Record<string, any> {
		return {
			detectionOrder: this.registry.getDetectionOrder(),
			confidenceThreshold: this.orchestrator.getConfidenceThreshold(),
			enabledPatternLanguages: this.orchestrator.getEnabledPatternLanguages(),
			registeredDetectors: this.registry.getDetectorNames(),
			registryInfo: this.registry.getRegistryInfo(),
			performanceMetrics: this.orchestrator.getPerformanceMetrics()
		};
	}

	/**
	 * Sets the engine configuration
	 * @param config Configuration object
	 */
	setConfiguration(config: Record<string, any>): void {
		if (config.detectionOrder && Array.isArray(config.detectionOrder)) {
			this.registry.setDetectionOrder(config.detectionOrder);
		}
		
		if (typeof config.confidenceThreshold === 'number') {
			this.setConfidenceThreshold(config.confidenceThreshold);
		}
		
		if (config.enabledPatternLanguages && Array.isArray(config.enabledPatternLanguages)) {
			this.orchestrator.setEnabledPatternLanguages(config.enabledPatternLanguages);
		}

		// Apply detector-specific configurations
		if (config.detectorConfigs && typeof config.detectorConfigs === 'object') {
			this.applyDetectorConfigurations(config.detectorConfigs);
		}
	}

	/**
	 * Updates the confidence threshold for all components
	 * @param threshold New confidence threshold (0-100)
	 */
	setConfidenceThreshold(threshold: number): void {
		const normalizedThreshold = Math.max(0, Math.min(100, threshold)) / 100;
		
		// Update orchestrator
		this.orchestrator.setConfidenceThreshold(threshold);
		
		// Update all detectors
		this.registry.updateAllDetectorThresholds(normalizedThreshold);
	}

	/**
	 * Gets the current confidence threshold
	 * @returns Current confidence threshold (0-100)
	 */
	getConfidenceThreshold(): number {
		return this.orchestrator.getConfidenceThreshold();
	}

	/**
	 * Updates the detection method order
	 * @param order New detection method order (detector names)
	 */
	setDetectionOrder(order: string[]): void {
		this.registry.setDetectionOrder(order);
	}

	/**
	 * Gets the current detection method order
	 * @returns Current detection method order (detector names)
	 */
	getDetectionOrder(): string[] {
		return this.registry.getDetectionOrder();
	}

	/**
	 * Enables or disables a specific detection method
	 * @param detectorName The name of the detector to enable/disable
	 * @param enabled Whether the method should be enabled
	 */
	setDetectorEnabled(detectorName: string, enabled: boolean): void {
		this.registry.setDetectorEnabled(detectorName, enabled);
	}

	/**
	 * Checks if a specific detection method is enabled
	 * @param detectorName The name of the detector to check
	 * @returns True if the method is enabled
	 */
	isDetectorEnabled(detectorName: string): boolean {
		return this.registry.isDetectorEnabled(detectorName);
	}

	/**
	 * Updates the list of enabled languages for pattern matching
	 * @param enabledPatternLanguages Array of language names
	 */
	setEnabledPatternLanguages(enabledPatternLanguages: string[]): void {
		this.orchestrator.setEnabledPatternLanguages(enabledPatternLanguages);
	}

	/**
	 * Gets the current enabled pattern languages
	 * @returns Array of currently enabled pattern language names
	 */
	getEnabledPatternLanguages(): string[] {
		return this.orchestrator.getEnabledPatternLanguages();
	}

	/**
	 * Applies detector-specific configurations
	 * @param detectorConfigs Configuration object for individual detectors
	 */
	private applyDetectorConfigurations(detectorConfigs: Record<string, any>): void {
		Object.entries(detectorConfigs).forEach(([detectorName, config]) => {
			const detector = this.registry.getDetector(detectorName);
			
			if (detector && detector.isConfigurable && detector.isConfigurable()) {
				if (detector.setConfiguration) {
					detector.setConfiguration(config);
				}
			}
		});
	}

	/**
	 * Validates the current configuration
	 * @returns Validation result with details
	 */
	validateConfiguration(): {
		isValid: boolean;
		issues: string[];
		warnings: string[];
		recommendations: string[];
	} {
		const issues: string[] = [];
		const warnings: string[] = [];
		const recommendations: string[] = [];

		// Check basic configuration validity
		if (!this.orchestrator.isConfigurationValid()) {
			issues.push('Orchestrator configuration is invalid');
		}

		if (!this.registry.isValid()) {
			issues.push('Detector registry is invalid');
		}

		// Check confidence threshold
		const threshold = this.getConfidenceThreshold();
		if (threshold < 10) {
			warnings.push('Very low confidence threshold may result in false positives');
		} else if (threshold > 90) {
			warnings.push('Very high confidence threshold may result in missed detections');
		}

		// Check detection order
		const detectionOrder = this.getDetectionOrder();
		if (detectionOrder.length === 0) {
			issues.push('No detectors are enabled');
		} else if (detectionOrder.length === 1) {
			recommendations.push('Consider enabling multiple detectors for better accuracy');
		}

		// Check available languages
		const availableLanguages = this.registry.getAvailableLanguages();
		const enabledPatternLanguages = this.getEnabledPatternLanguages();
		
		if (enabledPatternLanguages.length === 0 && this.isDetectorEnabled('pattern-matching')) {
			warnings.push('Pattern matching detector is enabled but no languages are configured');
		}

		if (availableLanguages.length < 5) {
			warnings.push('Limited language support detected');
		}

		// Performance recommendations
		const metrics = this.orchestrator.getPerformanceMetrics();
		if (metrics.enabledDetectors < metrics.availableDetectors) {
			recommendations.push(`Consider enabling more detectors (${metrics.enabledDetectors}/${metrics.availableDetectors} active)`);
		}

		return {
			isValid: issues.length === 0,
			issues,
			warnings,
			recommendations
		};
	}

	/**
	 * Resets configuration to defaults
	 */
	resetToDefaults(): void {
		this.setDetectionOrder(['vscode-ml', 'highlight-js', 'pattern-matching']);
		this.setConfidenceThreshold(70);
		this.setEnabledPatternLanguages(['javascript', 'typescript', 'python', 'java', 'cpp', 'bash']);
		
		// Enable all registered detectors
		const allDetectors = this.registry.getDetectorNames();
		allDetectors.forEach(detectorName => {
			this.setDetectorEnabled(detectorName, true);
		});
	}

	/**
	 * Exports the current configuration
	 * @returns Serializable configuration object
	 */
	exportConfiguration(): string {
		const config = this.getConfiguration();
		return JSON.stringify(config, null, 2);
	}

	/**
	 * Imports configuration from a serialized string
	 * @param configString Serialized configuration
	 * @returns Success status and any errors
	 */
	importConfiguration(configString: string): {
		success: boolean;
		errors: string[];
		warnings: string[];
	} {
		const errors: string[] = [];
		const warnings: string[] = [];

		try {
			const config = JSON.parse(configString);
			
			// Validate basic structure
			if (typeof config !== 'object' || config === null) {
				errors.push('Configuration must be a valid object');
				return { success: false, errors, warnings };
			}

			// Apply configuration
			this.setConfiguration(config);

			// Validate the applied configuration
			const validation = this.validateConfiguration();
			if (!validation.isValid) {
				errors.push(...validation.issues);
			}
			warnings.push(...validation.warnings);

			return {
				success: errors.length === 0,
				errors,
				warnings
			};

		} catch (error) {
			errors.push(`Failed to parse configuration: ${error.message}`);
			return { success: false, errors, warnings };
		}
	}

	/**
	 * Gets configuration summary for display
	 * @returns Human-readable configuration summary
	 */
	getConfigurationSummary(): {
		enabled_detectors: string[];
		detection_order: string[];
		confidence_threshold: number;
		pattern_languages_count: number;
		total_available_languages: number;
		status: 'healthy' | 'warning' | 'error';
	} {
		const validation = this.validateConfiguration();
		const metrics = this.orchestrator.getPerformanceMetrics();
		
		let status: 'healthy' | 'warning' | 'error' = 'healthy';
		if (!validation.isValid) {
			status = 'error';
		} else if (validation.warnings.length > 0) {
			status = 'warning';
		}

		return {
			enabled_detectors: this.getDetectionOrder(),
			detection_order: this.getDetectionOrder(),
			confidence_threshold: this.getConfidenceThreshold(),
			pattern_languages_count: this.getEnabledPatternLanguages().length,
			total_available_languages: metrics.totalAvailableLanguages,
			status
		};
	}
}
