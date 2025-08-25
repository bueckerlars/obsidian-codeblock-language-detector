import { ILanguageDetector } from '../../../types';
import { HighlightJsDetector } from '../HighlightJsDetector';
import { PatternMatchingDetector } from '../PatternMatchingDetector';
import { VSCodeDetector } from '../VSCodeDetector';

/**
 * Manages registration and lifecycle of language detectors
 */
export class DetectorRegistry {
	private readonly registeredDetectors: Map<string, ILanguageDetector>;
	private detectionOrder: string[];

	constructor(initialOrder: string[] = ['vscode-ml', 'highlight-js', 'pattern-matching']) {
		this.registeredDetectors = new Map();
		this.detectionOrder = [...initialOrder];
	}

	/**
	 * Registers the default detection methods
	 * @param confidenceThreshold Normalized confidence threshold (0-1)
	 * @param enabledPatternLanguages Languages enabled for pattern matching
	 */
	registerDefaultDetectors(confidenceThreshold: number, enabledPatternLanguages: string[]): void {
		// Register VSCode ML detector
		const vscodeDetector = new VSCodeDetector(confidenceThreshold);
		this.registerDetector(vscodeDetector);
		
		// Register highlight.js detector
		const highlightJsDetector = new HighlightJsDetector(confidenceThreshold);
		this.registerDetector(highlightJsDetector);
		
		// Register pattern matching detector
		const patternMatchingDetector = new PatternMatchingDetector(confidenceThreshold, enabledPatternLanguages);
		this.registerDetector(patternMatchingDetector);
	}

	/**
	 * Registers a new detection method
	 * @param detector The detector to register
	 */
	registerDetector(detector: ILanguageDetector): void {
		const name = detector.getName();
		this.registeredDetectors.set(name, detector);
		
		// Add to detection order if not already present
		if (!this.detectionOrder.includes(name)) {
			this.detectionOrder.push(name);
		}
	}

	/**
	 * Unregisters a detection method
	 * @param detectorName The name of the detector to unregister
	 */
	unregisterDetector(detectorName: string): void {
		this.registeredDetectors.delete(detectorName);
		this.detectionOrder = this.detectionOrder.filter(name => name !== detectorName);
	}

	/**
	 * Gets a registered detector by name
	 * @param detectorName The name of the detector
	 * @returns The detector instance or undefined if not found
	 */
	getDetector(detectorName: string): ILanguageDetector | undefined {
		return this.registeredDetectors.get(detectorName);
	}

	/**
	 * Gets all registered detectors
	 * @returns Array of registered detector instances
	 */
	getAllDetectors(): ILanguageDetector[] {
		return Array.from(this.registeredDetectors.values());
	}

	/**
	 * Gets the names of all registered detectors
	 * @returns Array of detector names
	 */
	getDetectorNames(): string[] {
		return Array.from(this.registeredDetectors.keys());
	}

	/**
	 * Gets detectors in the current detection order
	 * @returns Array of detectors in order
	 */
	getDetectorsInOrder(): ILanguageDetector[] {
		const detectors: ILanguageDetector[] = [];
		
		for (const detectorName of this.detectionOrder) {
			const detector = this.registeredDetectors.get(detectorName);
			if (detector) {
				detectors.push(detector);
			}
		}
		
		return detectors;
	}

	/**
	 * Updates the detection method order
	 * @param order New detection method order (detector names)
	 */
	setDetectionOrder(order: string[]): void {
		// Filter out detectors that are not registered
		const validOrder = order.filter(name => this.registeredDetectors.has(name));
		this.detectionOrder = [...validOrder];
	}

	/**
	 * Gets the current detection method order
	 * @returns Current detection method order (detector names)
	 */
	getDetectionOrder(): string[] {
		return [...this.detectionOrder];
	}

	/**
	 * Enables or disables a specific detection method
	 * @param detectorName The name of the detector to enable/disable
	 * @param enabled Whether the method should be enabled
	 */
	setDetectorEnabled(detectorName: string, enabled: boolean): void {
		if (enabled) {
			if (!this.detectionOrder.includes(detectorName) && this.registeredDetectors.has(detectorName)) {
				this.detectionOrder.push(detectorName);
			}
		} else {
			this.detectionOrder = this.detectionOrder.filter(name => name !== detectorName);
		}
	}

	/**
	 * Checks if a specific detection method is enabled
	 * @param detectorName The name of the detector to check
	 * @returns True if the method is enabled
	 */
	isDetectorEnabled(detectorName: string): boolean {
		return this.detectionOrder.includes(detectorName);
	}

	/**
	 * Gets specific detector instances for backward compatibility
	 */
	getHighlightJsDetector(): HighlightJsDetector | undefined {
		return this.registeredDetectors.get('highlight-js') as HighlightJsDetector;
	}

	getPatternMatchingDetector(): PatternMatchingDetector | undefined {
		return this.registeredDetectors.get('pattern-matching') as PatternMatchingDetector;
	}

	getVSCodeDetector(): VSCodeDetector | undefined {
		return this.registeredDetectors.get('vscode-ml') as VSCodeDetector;
	}

	/**
	 * Gets the list of available languages from all detectors
	 * @returns Array of unique language names
	 */
	getAvailableLanguages(): string[] {
		const allLanguages = new Set<string>();
		
		// Collect languages from all registered detectors
		for (const detector of this.registeredDetectors.values()) {
			const languages = detector.getAvailableLanguages();
			languages.forEach(lang => allLanguages.add(lang));
		}
		
		return Array.from(allLanguages).sort();
	}

	/**
	 * Updates the confidence threshold for all detectors
	 * @param threshold New confidence threshold (0-1)
	 */
	updateAllDetectorThresholds(threshold: number): void {
		// Update threshold for all registered detectors
		for (const detector of this.registeredDetectors.values()) {
			detector.setMinConfidence(threshold);
		}
	}

	/**
	 * Validates the registry state
	 * @returns True if the registry is in a valid state
	 */
	isValid(): boolean {
		return this.registeredDetectors.size > 0 && this.detectionOrder.length > 0;
	}

	/**
	 * Gets registry information for debugging/diagnostics
	 * @returns Registry information object
	 */
	getRegistryInfo(): {
		totalDetectors: number;
		enabledDetectors: number;
		detectorNames: string[];
		detectionOrder: string[];
		detectorInfo: Array<{
			name: string;
			displayName: string;
			description: string;
			isConfigurable: boolean;
		}>;
	} {
		return {
			totalDetectors: this.registeredDetectors.size,
			enabledDetectors: this.detectionOrder.length,
			detectorNames: this.getDetectorNames(),
			detectionOrder: this.getDetectionOrder(),
			detectorInfo: this.getAllDetectors().map(detector => ({
				name: detector.getName(),
				displayName: detector.getDisplayName(),
				description: detector.getDescription(),
				isConfigurable: detector.isConfigurable?.() ?? false
			}))
		};
	}
}
