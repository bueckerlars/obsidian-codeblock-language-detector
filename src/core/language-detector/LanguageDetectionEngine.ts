import { DetectionMethod, DetectionResult, ILanguageDetector } from '../../types';
import { HighlightJsDetector } from './HighlightJsDetector';
import { PatternMatchingDetector } from './PatternMatchingDetector';

/**
 * Main language detection engine that coordinates multiple detection methods
 * Now supports dynamic registration of detection methods
 */
export class LanguageDetectionEngine implements ILanguageDetector {
	private readonly registeredDetectors: Map<string, ILanguageDetector>;
	private detectionOrder: string[];
	private confidenceThreshold: number;
	private enabledPatternLanguages: string[];

	constructor(
		detectionOrder: string[] = ['highlight-js', 'pattern-matching'],
		confidenceThreshold: number = 70,
		enabledPatternLanguages: string[] = []
	) {
		this.registeredDetectors = new Map();
		this.detectionOrder = detectionOrder;
		this.confidenceThreshold = confidenceThreshold;
		this.enabledPatternLanguages = enabledPatternLanguages;
		
		// Register default detectors
		this.registerDefaultDetectors();
	}

	/**
	 * Registers the default detection methods
	 */
	private registerDefaultDetectors(): void {
		const normalizedThreshold = this.confidenceThreshold / 100;
		
		// Register highlight.js detector
		const highlightJsDetector = new HighlightJsDetector(normalizedThreshold);
		this.registerDetector(highlightJsDetector);
		
		// Register pattern matching detector
		const patternMatchingDetector = new PatternMatchingDetector(normalizedThreshold, this.enabledPatternLanguages);
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
	getRegisteredDetectors(): ILanguageDetector[] {
		return Array.from(this.registeredDetectors.values());
	}

	/**
	 * Gets the names of all registered detectors
	 * @returns Array of detector names
	 */
	getRegisteredDetectorNames(): string[] {
		return Array.from(this.registeredDetectors.keys());
	}

	/**
	 * Detects the programming language using the configured detection methods in order
	 * @param code The code to analyze
	 * @returns Detection result or null if no method succeeds
	 */
	async detectLanguage(code: string): Promise<DetectionResult | null> {
		if (!code || code.trim().length === 0) {
			return null;
		}

		for (const detectorName of this.detectionOrder) {
			try {
				const detector = this.registeredDetectors.get(detectorName);
				if (!detector) {
					console.warn(`Detector '${detectorName}' not found in registry`);
					continue;
				}

				const result = await detector.detectLanguage(code);
				
				if (result && 
					result.confidence >= this.confidenceThreshold && 
					this.isLanguageEnabledForMethod(result.language, detectorName)) {
					return result;
				}
			} catch (error) {
				console.warn(`Error in ${detectorName} detection:`, error);
				continue;
			}
		}

		return null;
	}

	/**
	 * Detects language using a specific detector
	 * @param code The code to analyze
	 * @param detectorName The name of the detector to use
	 * @returns Detection result or null
	 */
	async detectWithDetector(code: string, detectorName: string): Promise<DetectionResult | null> {
		const detector = this.registeredDetectors.get(detectorName);
		if (!detector) {
			console.warn(`Detector '${detectorName}' not found in registry`);
			return null;
		}

		try {
			return await detector.detectLanguage(code);
		} catch (error) {
			console.warn(`Error in ${detectorName} detection:`, error);
			return null;
		}
	}

	/**
	 * Attempts detection with all registered methods and returns all results
	 * @param code The code to analyze
	 * @returns Array of detection results from all methods
	 */
	async detectWithAllMethods(code: string): Promise<DetectionResult[]> {
		const results: DetectionResult[] = [];

		for (const [detectorName, detector] of this.registeredDetectors) {
			try {
				const result = await detector.detectLanguage(code);
				if (result) {
					results.push(result);
				}
			} catch (error) {
				console.warn(`Error in ${detectorName} detection:`, error);
			}
		}

		return results.sort((a, b) => b.confidence - a.confidence);
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
	 * Updates the confidence threshold for all detectors
	 * @param threshold New confidence threshold (0-100)
	 */
	setConfidenceThreshold(threshold: number): void {
		this.confidenceThreshold = Math.max(0, Math.min(100, threshold));
		const normalizedThreshold = this.confidenceThreshold / 100;
		
		// Update threshold for all registered detectors
		for (const detector of this.registeredDetectors.values()) {
			detector.setMinConfidence(normalizedThreshold);
		}
	}

	/**
	 * Gets the current confidence threshold
	 * @returns Current confidence threshold (0-100)
	 */
	getConfidenceThreshold(): number {
		return this.confidenceThreshold;
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
	 * Gets the highlight.js detector instance for direct access
	 * @returns HighlightJsDetector instance or undefined if not registered
	 */
	getHighlightJsDetector(): HighlightJsDetector | undefined {
		return this.registeredDetectors.get('highlight-js') as HighlightJsDetector;
	}

	/**
	 * Gets the pattern matching detector instance for direct access
	 * @returns PatternMatchingDetector instance or undefined if not registered
	 */
	getPatternMatchingDetector(): PatternMatchingDetector | undefined {
		return this.registeredDetectors.get('pattern-matching') as PatternMatchingDetector;
	}

	/**
	 * Updates the list of enabled languages for pattern matching
	 * @param enabledPatternLanguages Array of language names that should be used for pattern matching
	 */
	setEnabledPatternLanguages(enabledPatternLanguages: string[]): void {
		this.enabledPatternLanguages = [...enabledPatternLanguages];
		// Also update the pattern matching detector if it exists
		const patternDetector = this.getPatternMatchingDetector();
		if (patternDetector) {
			patternDetector.setEnabledLanguages(enabledPatternLanguages);
		}
	}

	/**
	 * Gets the current enabled pattern languages
	 * @returns Array of currently enabled pattern language names
	 */
	getEnabledPatternLanguages(): string[] {
		return [...this.enabledPatternLanguages];
	}

	/**
	 * Checks if a language is enabled for a specific detection method
	 * @param language The language to check
	 * @param detectorName The name of the detector
	 * @returns True if the language is enabled for the method, false otherwise
	 */
	private isLanguageEnabledForMethod(language: string, detectorName: string): boolean {
		// For pattern matching detector, check enabled languages
		if (detectorName === 'pattern-matching') {
			// Pattern matching respects the enabled pattern languages setting
			if (this.enabledPatternLanguages.length === 0) {
				return true; // If no specific languages are enabled, allow all
			}
			return this.enabledPatternLanguages.includes(language);
		}
		
		// For other detectors, always enabled by default
		// Individual detectors can implement their own language filtering
		return true;
	}

	/**
	 * Validates the detection configuration
	 * @returns True if the configuration is valid
	 */
	isConfigurationValid(): boolean {
		return this.detectionOrder.length > 0 && 
			   this.confidenceThreshold >= 0 && 
			   this.confidenceThreshold <= 100;
	}

	// Implement ILanguageDetector interface methods for the engine itself
	
	/**
	 * Gets the unique name of this detection engine
	 * @returns Engine name
	 */
	getName(): string {
		return 'detection-engine';
	}

	/**
	 * Gets the display name of this detection engine
	 * @returns User-friendly display name
	 */
	getDisplayName(): string {
		return 'Language Detection Engine';
	}

	/**
	 * Gets the description of this detection engine
	 * @returns Engine description
	 */
	getDescription(): string {
		return 'Coordinated language detection using multiple registered detection methods';
	}

	/**
	 * Sets the minimum confidence threshold for the engine
	 * @param threshold New minimum confidence (0-1)
	 */
	setMinConfidence(threshold: number): void {
		// Convert to 0-100 scale and update
		this.setConfidenceThreshold(threshold * 100);
	}

	/**
	 * Gets the current minimum confidence threshold for the engine
	 * @returns Current minimum confidence (0-1)
	 */
	getMinConfidence(): number {
		return this.confidenceThreshold / 100;
	}

	/**
	 * Checks if the engine supports extended configuration
	 * @returns True as the engine supports detector management
	 */
	isConfigurable(): boolean {
		return true;
	}

	/**
	 * Gets the current engine configuration
	 * @returns Configuration object
	 */
	getConfiguration(): Record<string, any> {
		return {
			detectionOrder: this.getDetectionOrder(),
			confidenceThreshold: this.getConfidenceThreshold(),
			enabledPatternLanguages: this.getEnabledPatternLanguages(),
			registeredDetectors: this.getRegisteredDetectorNames(),
			registeredDetectorInfo: this.getRegisteredDetectors().map(detector => ({
				name: detector.getName(),
				displayName: detector.getDisplayName(),
				description: detector.getDescription(),
				isConfigurable: detector.isConfigurable?.() ?? false
			}))
		};
	}

	/**
	 * Sets the engine configuration
	 * @param config Configuration object
	 */
	setConfiguration(config: Record<string, any>): void {
		if (config.detectionOrder && Array.isArray(config.detectionOrder)) {
			this.setDetectionOrder(config.detectionOrder);
		}
		if (typeof config.confidenceThreshold === 'number') {
			this.setConfidenceThreshold(config.confidenceThreshold);
		}
		if (config.enabledPatternLanguages && Array.isArray(config.enabledPatternLanguages)) {
			this.setEnabledPatternLanguages(config.enabledPatternLanguages);
		}
	}
}
