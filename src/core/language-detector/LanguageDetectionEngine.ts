import { DetectionMethod, DetectionResult, ILanguageDetector } from '../../types';
import { HighlightJsDetector } from './HighlightJsDetector';
import { PatternMatchingDetector } from './PatternMatchingDetector';

/**
 * Main language detection engine that coordinates multiple detection methods
 */
export class LanguageDetectionEngine implements ILanguageDetector {
	private readonly highlightJsDetector: HighlightJsDetector;
	private readonly patternMatchingDetector: PatternMatchingDetector;
	private detectionOrder: DetectionMethod[];
	private confidenceThreshold: number;

	constructor(
		detectionOrder: DetectionMethod[] = ['highlight-js', 'pattern-matching'],
		confidenceThreshold: number = 70
	) {
		this.detectionOrder = detectionOrder;
		this.confidenceThreshold = confidenceThreshold;
		
		// Initialize detectors with threshold converted to 0-1 scale
		const normalizedThreshold = confidenceThreshold / 100;
		this.highlightJsDetector = new HighlightJsDetector(normalizedThreshold);
		this.patternMatchingDetector = new PatternMatchingDetector(normalizedThreshold);
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

		for (const method of this.detectionOrder) {
			try {
				const result = await this.detectWithMethod(code, method);
				
				if (result && result.confidence >= this.confidenceThreshold) {
					return result;
				}
			} catch (error) {
				console.warn(`Error in ${method} detection:`, error);
				continue;
			}
		}

		return null;
	}

	/**
	 * Detects language using a specific method
	 * @param code The code to analyze
	 * @param method The detection method to use
	 * @returns Detection result or null
	 */
	private async detectWithMethod(code: string, method: DetectionMethod): Promise<DetectionResult | null> {
		switch (method) {
			case 'highlight-js':
				return this.highlightJsDetector.detectLanguage(code);
			case 'pattern-matching':
				return this.patternMatchingDetector.detectLanguage(code);
			default:
				console.warn(`Unknown detection method: ${method}`);
				return null;
		}
	}

	/**
	 * Attempts detection with all methods and returns all results
	 * @param code The code to analyze
	 * @returns Array of detection results from all methods
	 */
	async detectWithAllMethods(code: string): Promise<DetectionResult[]> {
		const results: DetectionResult[] = [];

		for (const method of ['highlight-js', 'pattern-matching'] as DetectionMethod[]) {
			try {
				const result = await this.detectWithMethod(code, method);
				if (result) {
					results.push(result);
				}
			} catch (error) {
				console.warn(`Error in ${method} detection:`, error);
			}
		}

		return results.sort((a, b) => b.confidence - a.confidence);
	}

	/**
	 * Gets the list of available languages from all detectors
	 * @returns Array of unique language names
	 */
	getAvailableLanguages(): string[] {
		const highlightJsLanguages = this.highlightJsDetector.getAvailableLanguages();
		const patternMatchingLanguages = this.patternMatchingDetector.getAvailableLanguages();
		
		// Combine and deduplicate
		const allLanguages = new Set([...highlightJsLanguages, ...patternMatchingLanguages]);
		return Array.from(allLanguages).sort();
	}

	/**
	 * Updates the detection method order
	 * @param order New detection method order
	 */
	setDetectionOrder(order: DetectionMethod[]): void {
		this.detectionOrder = [...order];
	}

	/**
	 * Gets the current detection method order
	 * @returns Current detection method order
	 */
	getDetectionOrder(): DetectionMethod[] {
		return [...this.detectionOrder];
	}

	/**
	 * Updates the confidence threshold for all detectors
	 * @param threshold New confidence threshold (0-100)
	 */
	setConfidenceThreshold(threshold: number): void {
		this.confidenceThreshold = Math.max(0, Math.min(100, threshold));
		const normalizedThreshold = this.confidenceThreshold / 100;
		
		this.highlightJsDetector.setMinConfidence(normalizedThreshold);
		this.patternMatchingDetector.setMinConfidence(normalizedThreshold);
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
	 * @param method The method to enable/disable
	 * @param enabled Whether the method should be enabled
	 */
	setMethodEnabled(method: DetectionMethod, enabled: boolean): void {
		if (enabled) {
			if (!this.detectionOrder.includes(method)) {
				this.detectionOrder.push(method);
			}
		} else {
			this.detectionOrder = this.detectionOrder.filter(m => m !== method);
		}
	}

	/**
	 * Checks if a specific detection method is enabled
	 * @param method The method to check
	 * @returns True if the method is enabled
	 */
	isMethodEnabled(method: DetectionMethod): boolean {
		return this.detectionOrder.includes(method);
	}

	/**
	 * Gets the highlight.js detector instance for direct access
	 * @returns HighlightJsDetector instance
	 */
	getHighlightJsDetector(): HighlightJsDetector {
		return this.highlightJsDetector;
	}

	/**
	 * Gets the pattern matching detector instance for direct access
	 * @returns PatternMatchingDetector instance
	 */
	getPatternMatchingDetector(): PatternMatchingDetector {
		return this.patternMatchingDetector;
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
}
