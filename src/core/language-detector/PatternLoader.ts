import { LanguagePattern } from '../../types';
import bashPattern from '../../data/patterns/bash.json';
import cppPattern from '../../data/patterns/cpp.json';
import javaPattern from '../../data/patterns/java.json';
import javascriptPattern from '../../data/patterns/javascript.json';
import jsxPattern from '../../data/patterns/jsx.json';
import pythonPattern from '../../data/patterns/python.json';
import tsxPattern from '../../data/patterns/tsx.json';
import typescriptPattern from '../../data/patterns/typescript.json';
import vuePattern from '../../data/patterns/vue.json';

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
			const patterns: unknown[] = [
				bashPattern,
				cppPattern,
				javaPattern,
				javascriptPattern,
				jsxPattern,
				pythonPattern,
				tsxPattern,
				typescriptPattern,
				vuePattern,
			];

			patterns.forEach(pattern => {
				if (this.isValidPattern(pattern)) {
					this.patterns.set(pattern.name.toLowerCase(), pattern);
					console.debug(`Loaded pattern: ${pattern.name}`);
				} else {
					const name = typeof pattern === 'object' && pattern !== null && 'name' in pattern
						? String((pattern as { name: unknown }).name)
						: 'unknown';
					console.warn(`Invalid pattern structure for: ${name}`);
				}
			});

			console.debug(`PatternLoader: Successfully loaded ${this.patterns.size} language patterns`);
		} catch (error) {
			console.error('Error loading patterns:', error);
		}
	}

	/**
	 * Validates if a pattern object has the required structure
	 */
	private static isValidPattern(pattern: unknown): pattern is LanguagePattern {
		if (typeof pattern !== 'object' || pattern === null) {
			return false;
		}

		const p = pattern as Record<string, unknown>;
		const comments = p.comments as Record<string, unknown> | undefined;

		return (
			typeof p.name === 'string' &&
			Array.isArray(p.extensions) &&
			Array.isArray(p.keywords) &&
			Array.isArray(p.patterns) &&
			Array.isArray(p.imports) &&
			typeof comments === 'object' &&
			comments !== null &&
			Array.isArray(comments.line) &&
			Array.isArray(comments.block) &&
			Array.isArray(p.operators) &&
			Array.isArray(p.builtins)
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
