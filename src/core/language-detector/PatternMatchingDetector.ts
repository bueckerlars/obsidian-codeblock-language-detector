import { DetectionResult, ILanguageDetector, LanguagePattern } from '../../types';

// Import pattern data
const javascriptPattern = require('../../data/patterns/javascript.json');
const typescriptPattern = require('../../data/patterns/typescript.json');
const jsxPattern = require('../../data/patterns/jsx.json');
const tsxPattern = require('../../data/patterns/tsx.json');
const vuePattern = require('../../data/patterns/vue.json');
const pythonPattern = require('../../data/patterns/python.json');
const javaPattern = require('../../data/patterns/java.json');
const cppPattern = require('../../data/patterns/cpp.json');
const bashPattern = require('../../data/patterns/bash.json');

/**
 * Language detector using pattern matching and keyword analysis
 */
export class PatternMatchingDetector implements ILanguageDetector {
	private readonly patterns: Map<string, LanguagePattern>;
	private minConfidence: number;
	private enabledLanguages: string[];

	constructor(minConfidence: number = 0.6, enabledLanguages: string[] = []) {
		this.minConfidence = minConfidence;
		this.enabledLanguages = enabledLanguages;
		this.patterns = new Map();
		this.initializePatterns();
	}

	/**
	 * Initializes the language patterns
	 */
	private initializePatterns(): void {
		const patterns = [
			javascriptPattern as LanguagePattern,
			typescriptPattern as LanguagePattern,
			jsxPattern as LanguagePattern,
			tsxPattern as LanguagePattern,
			vuePattern as LanguagePattern,
			pythonPattern as LanguagePattern,
			javaPattern as LanguagePattern,
			cppPattern as LanguagePattern,
			bashPattern as LanguagePattern,
		];

		patterns.forEach(pattern => {
			this.patterns.set(pattern.name.toLowerCase(), pattern);
		});
	}

	/**
	 * Detects the programming language of the given code using pattern matching
	 * @param code The code to analyze
	 * @returns Detection result or null if confidence is too low
	 */
	async detectLanguage(code: string): Promise<DetectionResult | null> {
		if (!code || code.trim().length === 0) {
			return null;
		}

		const results: Array<{ language: string; confidence: number }> = [];

		// Analyze each language pattern (only for enabled languages)
		for (const [languageName, pattern] of this.patterns) {
			// Skip if language is not enabled for pattern matching
			if (!this.isLanguageEnabled(languageName)) {
				continue;
			}
			
			const confidence = this.calculateLanguageConfidence(code, pattern);
			if (confidence > 0) {
				results.push({ language: languageName, confidence });
			}
		}

		// Sort by confidence and return the best match
		results.sort((a, b) => b.confidence - a.confidence);

		if (results.length === 0 || results[0].confidence < this.minConfidence * 100) {
			return null;
		}

		return {
			language: results[0].language,
			confidence: Math.round(results[0].confidence),
			method: 'pattern-matching'
		};
	}

	/**
	 * Calculates confidence for a specific language pattern
	 * @param code The code to analyze
	 * @param pattern The language pattern to match against
	 * @returns Confidence percentage (0-100)
	 */
	private calculateLanguageConfidence(code: string, pattern: LanguagePattern): number {
		let totalScore = 0;
		let maxPossibleScore = 0;

		// Keyword matching (40% weight)
		const keywordScore = this.calculateKeywordScore(code, pattern.keywords);
		totalScore += keywordScore * 0.4;
		maxPossibleScore += 40;

		// Pattern matching (30% weight)
		const patternScore = this.calculatePatternScore(code, pattern.patterns);
		totalScore += patternScore * 0.3;
		maxPossibleScore += 30;

		// Import/declaration matching (15% weight)
		const importScore = this.calculateImportScore(code, pattern.imports);
		totalScore += importScore * 0.15;
		maxPossibleScore += 15;

		// Builtin functions matching (10% weight)
		const builtinScore = this.calculateBuiltinScore(code, pattern.builtins);
		totalScore += builtinScore * 0.1;
		maxPossibleScore += 10;

		// Comment style matching (5% weight)
		const commentScore = this.calculateCommentScore(code, pattern.comments);
		totalScore += commentScore * 0.05;
		maxPossibleScore += 5;

		// Calculate final confidence as percentage
		return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
	}

	/**
	 * Calculates score based on keyword matches
	 */
	private calculateKeywordScore(code: string, keywords: string[]): number {
		if (keywords.length === 0) return 0;

		const codeWords = this.extractWords(code);
		const matches = keywords.filter(keyword => codeWords.has(keyword)).length;
		
		return Math.min(100, (matches / Math.min(keywords.length, 10)) * 100);
	}

	/**
	 * Calculates score based on pattern matches
	 */
	private calculatePatternScore(code: string, patterns: string[]): number {
		if (patterns.length === 0) return 0;

		let matches = 0;
		const maxPatterns = Math.min(patterns.length, 8);

		for (const pattern of patterns.slice(0, maxPatterns)) {
			try {
				const regex = new RegExp(pattern, 'gi');
				if (regex.test(code)) {
					matches++;
				}
			} catch (error) {
				// Skip invalid regex patterns
				continue;
			}
		}

		return (matches / maxPatterns) * 100;
	}

	/**
	 * Calculates score based on import/declaration matches
	 */
	private calculateImportScore(code: string, imports: string[]): number {
		if (imports.length === 0) return 0;

		const codeWords = this.extractWords(code);
		const matches = imports.filter(imp => codeWords.has(imp)).length;
		
		return Math.min(100, (matches / imports.length) * 100);
	}

	/**
	 * Calculates score based on builtin function matches
	 */
	private calculateBuiltinScore(code: string, builtins: string[]): number {
		if (builtins.length === 0) return 0;

		const codeWords = this.extractWords(code);
		const matches = builtins.filter(builtin => codeWords.has(builtin)).length;
		
		return Math.min(100, (matches / Math.min(builtins.length, 15)) * 100);
	}

	/**
	 * Calculates score based on comment style matches
	 */
	private calculateCommentScore(code: string, comments: LanguagePattern['comments']): number {
		let score = 0;
		let checks = 0;

		// Check line comments
		if (comments.line.length > 0) {
			checks++;
			for (const lineComment of comments.line) {
				const regex = new RegExp(`^\\s*${this.escapeRegex(lineComment)}`, 'm');
				if (regex.test(code)) {
					score += 50;
					break;
				}
			}
		}

		// Check block comments
		if (comments.block.length > 0) {
			checks++;
			for (const blockComment of comments.block) {
				const startRegex = new RegExp(this.escapeRegex(blockComment.start));
				const endRegex = new RegExp(this.escapeRegex(blockComment.end));
				if (startRegex.test(code) && endRegex.test(code)) {
					score += 50;
					break;
				}
			}
		}

		return checks > 0 ? score / checks : 0;
	}

	/**
	 * Extracts words from code (alphanumeric sequences)
	 */
	private extractWords(code: string): Set<string> {
		const words = new Set<string>();
		const wordRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
		let match;

		while ((match = wordRegex.exec(code)) !== null) {
			words.add(match[0]);
		}

		return words;
	}

	/**
	 * Escapes special regex characters
	 */
	private escapeRegex(str: string): string {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	/**
	 * Gets the list of available languages
	 * @returns Array of language names
	 */
	getAvailableLanguages(): string[] {
		return Array.from(this.patterns.keys());
	}

	/**
	 * Sets the enabled languages for pattern matching
	 * @param enabledLanguages Array of language names to enable
	 */
	setEnabledLanguages(enabledLanguages: string[]): void {
		this.enabledLanguages = [...enabledLanguages];
	}

	/**
	 * Gets the currently enabled languages
	 * @returns Array of enabled language names
	 */
	getEnabledLanguages(): string[] {
		return [...this.enabledLanguages];
	}

	/**
	 * Checks if a language is enabled for pattern matching
	 * @param language The language to check
	 * @returns True if the language is enabled
	 */
	private isLanguageEnabled(language: string): boolean {
		// If no enabled languages are specified, allow all available pattern languages
		if (this.enabledLanguages.length === 0) {
			return true;
		}
		
		return this.enabledLanguages.includes(language);
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

	/**
	 * Adds a new language pattern
	 * @param pattern The language pattern to add
	 */
	addLanguagePattern(pattern: LanguagePattern): void {
		this.patterns.set(pattern.name.toLowerCase(), pattern);
	}

	/**
	 * Removes a language pattern
	 * @param languageName The name of the language to remove
	 */
	removeLanguagePattern(languageName: string): void {
		this.patterns.delete(languageName.toLowerCase());
	}

	/**
	 * Gets the unique name of this detector
	 * @returns Detector name
	 */
	getName(): string {
		return 'pattern-matching';
	}

	/**
	 * Gets the display name of this detector
	 * @returns User-friendly display name
	 */
	getDisplayName(): string {
		return 'Pattern Matching Detector';
	}

	/**
	 * Gets the description of this detector
	 * @returns Detector description
	 */
	getDescription(): string {
		return 'Language detection using keyword analysis, regex patterns, and syntax features with configurable language selection';
	}

	/**
	 * Checks if this detector supports extended configuration
	 * @returns True as pattern matching detector supports language selection
	 */
	isConfigurable(): boolean {
		return true;
	}

	/**
	 * Gets the current configuration
	 * @returns Configuration object with enabled languages
	 */
	getConfiguration(): Record<string, any> {
		return {
			enabledLanguages: this.getEnabledLanguages(),
			availableLanguages: this.getAvailableLanguages(),
			minConfidence: this.getMinConfidence()
		};
	}

	/**
	 * Sets the configuration
	 * @param config Configuration object
	 */
	setConfiguration(config: Record<string, any>): void {
		if (config.enabledLanguages && Array.isArray(config.enabledLanguages)) {
			this.setEnabledLanguages(config.enabledLanguages);
		}
		if (typeof config.minConfidence === 'number') {
			this.setMinConfidence(config.minConfidence);
		}
	}
}
