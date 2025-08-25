import { DetectionResult, ILanguageDetector } from '../../../types';
import { DetectorRegistry } from './DetectorRegistry';

/**
 * Orchestrates the language detection workflow across multiple detectors
 */
export class DetectionOrchestrator {
	private registry: DetectorRegistry;
	private confidenceThreshold: number;
	private enabledPatternLanguages: string[];

	constructor(registry: DetectorRegistry, confidenceThreshold: number = 70, enabledPatternLanguages: string[] = []) {
		this.registry = registry;
		this.confidenceThreshold = confidenceThreshold;
		this.enabledPatternLanguages = enabledPatternLanguages;
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

		const detectors = this.registry.getDetectorsInOrder();

		for (const detector of detectors) {
			try {
				const detectorName = detector.getName();
				const result = await detector.detectLanguage(code);
				
				if (result && 
					result.confidence >= this.confidenceThreshold && 
					this.isLanguageEnabledForMethod(result.language, detectorName)) {
					return result;
				}
			} catch (error) {
				console.warn(`Error in ${detector.getName()} detection:`, error);
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
		const detector = this.registry.getDetector(detectorName);
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
		const allDetectors = this.registry.getAllDetectors();

		// Use Promise.allSettled for parallel execution
		const detectionPromises = allDetectors.map(async (detector) => {
			try {
				const result = await detector.detectLanguage(code);
				return { detector: detector.getName(), result };
			} catch (error) {
				console.warn(`Error in ${detector.getName()} detection:`, error);
				return { detector: detector.getName(), result: null };
			}
		});

		const settledResults = await Promise.allSettled(detectionPromises);

		settledResults.forEach((settledResult) => {
			if (settledResult.status === 'fulfilled' && settledResult.value.result) {
				results.push(settledResult.value.result);
			}
		});

		return results.sort((a, b) => b.confidence - a.confidence);
	}

	/**
	 * Detects language with detailed analysis including fallback options
	 * @param code The code to analyze
	 * @param options Detection options
	 * @returns Detailed detection result
	 */
	async detectWithAnalysis(code: string, options: {
		includeAllResults?: boolean;
		includeFallbacks?: boolean;
		minConfidence?: number;
	} = {}): Promise<{
		primary: DetectionResult | null;
		alternatives: DetectionResult[];
		fallbacks: DetectionResult[];
		analysis: {
			totalDetectors: number;
			successfulDetectors: number;
			averageConfidence: number;
			consensusLanguage: string | null;
		};
	}> {
		const {
			includeAllResults = true,
			includeFallbacks = false,
			minConfidence = this.confidenceThreshold
		} = options;

		const allResults = await this.detectWithAllMethods(code);
		const validResults = allResults.filter(r => r.confidence >= minConfidence);
		const fallbackResults = includeFallbacks ? allResults.filter(r => r.confidence < minConfidence) : [];

		// Find primary result using standard detection logic
		const primary = await this.detectLanguage(code);

		// Remove primary from alternatives if it exists
		const alternatives = validResults.filter(r => r !== primary);

		// Calculate consensus
		const languageCounts: Record<string, number> = {};
		validResults.forEach(result => {
			languageCounts[result.language] = (languageCounts[result.language] || 0) + 1;
		});

		const consensusLanguage = Object.entries(languageCounts)
			.sort(([,a], [,b]) => b - a)[0]?.[0] || null;

		const avgConfidence = validResults.length > 0
			? validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length
			: 0;

		return {
			primary,
			alternatives: includeAllResults ? alternatives : [],
			fallbacks: fallbackResults,
			analysis: {
				totalDetectors: this.registry.getAllDetectors().length,
				successfulDetectors: validResults.length,
				averageConfidence: Math.round(avgConfidence * 100) / 100,
				consensusLanguage
			}
		};
	}

	/**
	 * Validates code before detection
	 * @param code The code to validate
	 * @returns Validation result
	 */
	validateCode(code: string): {
		isValid: boolean;
		issues: string[];
		recommendations: string[];
	} {
		const issues: string[] = [];
		const recommendations: string[] = [];

		if (!code || typeof code !== 'string') {
			issues.push('Code must be a non-empty string');
			return { isValid: false, issues, recommendations };
		}

		const trimmed = code.trim();
		if (trimmed.length === 0) {
			issues.push('Code cannot be empty or only whitespace');
			return { isValid: false, issues, recommendations };
		}

		// Check for minimum content length
		if (trimmed.length < 10) {
			recommendations.push('Code snippets with more content typically yield better detection results');
		}

		// Check for common issues
		if (trimmed.includes('\t') && trimmed.includes('    ')) {
			recommendations.push('Mixed indentation detected - consider consistent indentation for better analysis');
		}

		if (!/\n/.test(trimmed) && trimmed.length > 100) {
			recommendations.push('Long single-line code - line breaks may improve detection accuracy');
		}

		return {
			isValid: true,
			issues,
			recommendations
		};
	}

	/**
	 * Gets detection performance metrics
	 * @returns Performance metrics
	 */
	getPerformanceMetrics(): {
		availableDetectors: number;
		enabledDetectors: number;
		confidenceThreshold: number;
		enabledLanguages: number;
		totalAvailableLanguages: number;
	} {
		return {
			availableDetectors: this.registry.getAllDetectors().length,
			enabledDetectors: this.registry.getDetectionOrder().length,
			confidenceThreshold: this.confidenceThreshold,
			enabledLanguages: this.enabledPatternLanguages.length,
			totalAvailableLanguages: this.registry.getAvailableLanguages().length
		};
	}

	/**
	 * Updates the confidence threshold
	 * @param threshold New confidence threshold (0-100)
	 */
	setConfidenceThreshold(threshold: number): void {
		this.confidenceThreshold = Math.max(0, Math.min(100, threshold));
	}

	/**
	 * Gets the current confidence threshold
	 * @returns Current confidence threshold (0-100)
	 */
	getConfidenceThreshold(): number {
		return this.confidenceThreshold;
	}

	/**
	 * Updates the enabled pattern languages
	 * @param enabledPatternLanguages Array of language names
	 */
	setEnabledPatternLanguages(enabledPatternLanguages: string[]): void {
		this.enabledPatternLanguages = [...enabledPatternLanguages];
		
		// Also update the pattern matching detector if it exists
		const patternDetector = this.registry.getPatternMatchingDetector();
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
	 * Validates the orchestrator configuration
	 * @returns True if the configuration is valid
	 */
	isConfigurationValid(): boolean {
		return this.registry.isValid() && 
			   this.confidenceThreshold >= 0 && 
			   this.confidenceThreshold <= 100;
	}
}
