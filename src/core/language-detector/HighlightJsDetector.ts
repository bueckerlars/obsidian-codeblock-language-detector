import hljs from 'highlight.js';
import { DetectionResult, ILanguageDetector } from '../../types';

/**
 * Language detector using highlight.js library
 */
export class HighlightJsDetector implements ILanguageDetector {
	private minConfidence: number;

	constructor(minConfidence: number = 0.5) {
		this.minConfidence = minConfidence;
	}

	/**
	 * Detects the programming language of the given code
	 * @param code The code to analyze
	 * @returns Detection result or null if confidence is too low
	 */
	async detectLanguage(code: string): Promise<DetectionResult | null> {
		if (!code || code.trim().length === 0) {
			return null;
		}

		try {
			// Use highlight.js auto-detection
			const result = hljs.highlightAuto(code);
			
			if (!result.language) {
				return null;
			}

			// Calculate confidence as a percentage (highlight.js returns relevance score)
			// The relevance score is typically between 0 and some positive number
			// We'll normalize it to a 0-100 scale with some heuristics
			const confidence = this.calculateConfidence(result.relevance, code.length);

			if (confidence < this.minConfidence * 100) {
				return null;
			}

			return {
				language: result.language,
				confidence: Math.round(confidence),
				method: 'highlight-js'
			};
		} catch (error) {
			console.error('Error in highlight.js detection:', error);
			return null;
		}
	}

	/**
	 * Gets the list of available languages supported by highlight.js
	 * @returns Array of language names
	 */
	getAvailableLanguages(): string[] {
		return hljs.listLanguages();
	}

	/**
	 * Calculates confidence percentage from highlight.js relevance score
	 * @param relevance The relevance score from highlight.js
	 * @param codeLength The length of the code being analyzed
	 * @returns Confidence percentage (0-100)
	 */
	private calculateConfidence(relevance: number, codeLength: number): number {
		if (relevance <= 0) return 0;

		// Base confidence calculation
		// Higher relevance scores generally indicate better matches
		// We'll use a logarithmic scale to convert relevance to percentage
		let confidence = Math.min(100, (relevance / 10) * 100);

		// Adjust confidence based on code length
		// Shorter code snippets are inherently less reliable
		if (codeLength < 50) {
			confidence *= 0.7; // Reduce confidence for very short code
		} else if (codeLength < 100) {
			confidence *= 0.85; // Slightly reduce confidence for short code
		} else if (codeLength > 500) {
			confidence *= 1.1; // Boost confidence for longer code (up to 100%)
		}

		// Ensure confidence stays within bounds
		return Math.min(100, Math.max(0, confidence));
	}

	/**
	 * Checks if a specific language is supported by highlight.js
	 * @param language The language to check
	 * @returns True if the language is supported
	 */
	isLanguageSupported(language: string): boolean {
		return this.getAvailableLanguages().includes(language.toLowerCase());
	}

	/**
	 * Updates the minimum confidence threshold
	 * @param minConfidence New minimum confidence (0-1)
	 */
	setMinConfidence(minConfidence: number): void {
		this.minConfidence = Math.max(0, Math.min(1, minConfidence));
	}

	/**
	 * Gets the current minimum confidence threshold
	 * @returns Current minimum confidence (0-1)
	 */
	getMinConfidence(): number {
		return this.minConfidence;
	}
}
