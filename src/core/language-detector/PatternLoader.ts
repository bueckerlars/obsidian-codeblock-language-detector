import { LanguagePattern } from '../../types';

/**
 * Static pattern loader that includes all patterns at build time
 * This approach works with bundlers like esbuild that bundle everything into a single file
 */
export class PatternLoader {
	private static readonly patterns = new Map<string, LanguagePattern>();

	/**
	 * Loads all patterns by importing them statically
	 * This ensures they are included in the bundle
	 */
	static loadPatterns(): Map<string, LanguagePattern> {
		if (this.patterns.size === 0) {
			this.initializePatterns();
		}
		return new Map(this.patterns);
	}

	/**
	 * Initialize patterns with static imports
	 */
	private static initializePatterns(): void {
		try {
			// Import all pattern files - this ensures they are bundled
			const patterns = [
				require('../../data/patterns/bash.json') as LanguagePattern,
				require('../../data/patterns/cpp.json') as LanguagePattern,
				require('../../data/patterns/java.json') as LanguagePattern,
				require('../../data/patterns/javascript.json') as LanguagePattern,
				require('../../data/patterns/jsx.json') as LanguagePattern,
				require('../../data/patterns/python.json') as LanguagePattern,
				require('../../data/patterns/tsx.json') as LanguagePattern,
				require('../../data/patterns/typescript.json') as LanguagePattern,
				require('../../data/patterns/vue.json') as LanguagePattern,
			];

			patterns.forEach(pattern => {
				if (this.isValidPattern(pattern)) {
					this.patterns.set(pattern.name.toLowerCase(), pattern);
					console.debug(`Loaded pattern: ${pattern.name}`);
				} else {
					console.warn(`Invalid pattern structure for: ${pattern?.name || 'unknown'}`);
				}
			});

			console.log(`📦 PatternLoader: Successfully loaded ${this.patterns.size} language patterns`);
		} catch (error) {
			console.error('Error loading patterns:', error);
		}
	}

	/**
	 * Validates if a pattern object has the required structure
	 */
	private static isValidPattern(pattern: any): boolean {
		return (
			pattern &&
			typeof pattern.name === 'string' &&
			Array.isArray(pattern.extensions) &&
			Array.isArray(pattern.keywords) &&
			Array.isArray(pattern.patterns) &&
			Array.isArray(pattern.imports) &&
			pattern.comments &&
			Array.isArray(pattern.comments.line) &&
			Array.isArray(pattern.comments.block) &&
			Array.isArray(pattern.operators) &&
			Array.isArray(pattern.builtins)
		);
	}

	/**
	 * Gets all available pattern names
	 */
	static getAvailableLanguages(): string[] {
		return Array.from(this.loadPatterns().keys());
	}

	/**
	 * Gets a specific pattern by name
	 */
	static getPattern(languageName: string): LanguagePattern | undefined {
		return this.loadPatterns().get(languageName.toLowerCase());
	}

	/**
	 * Checks if a language pattern exists
	 */
	static hasPattern(languageName: string): boolean {
		return this.loadPatterns().has(languageName.toLowerCase());
	}
}
