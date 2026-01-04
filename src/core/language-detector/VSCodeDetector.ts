import { ModelOperations } from '@vscode/vscode-languagedetection';
import { DetectionResult, ILanguageDetector } from '../../types';

/**
 * Language detector using Microsoft's VSCode Language Detection ML Model
 * Based on the @vscode/vscode-languagedetection package
 */
export class VSCodeDetector implements ILanguageDetector {
	private minConfidence: number;
	private modelOperations: ModelOperations | null = null;
	private isInitialized: boolean = false;
	private initializationPromise: Promise<void> | null = null;

	constructor(minConfidence: number = 0.5) {
		this.minConfidence = minConfidence;
	}

	/**
	 * Lazy initialization of the ModelOperations
	 */
	private async ensureInitialized(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		if (this.initializationPromise) {
			await this.initializationPromise;
			return;
		}

		this.initializationPromise = this.initializeModel();
		await this.initializationPromise;
	}

	/**
	 * Initializes the VSCode Language Detection model
	 */
	private initializeModel(): Promise<void> {
		try {
			this.modelOperations = new ModelOperations();
			this.isInitialized = true;
			return Promise.resolve();
		} catch (error) {
			console.error('Failed to initialize VSCode Language Detection model:', error);
			return Promise.reject(error);
		}
	}

	/**
	 * Detects the programming language of the given code using ML
	 * @param code The code to analyze
	 * @returns Detection result or null if confidence is too low
	 */
	async detectLanguage(code: string): Promise<DetectionResult | null> {
		if (!code || code.trim().length === 0) {
			return null;
		}

		try {
			await this.ensureInitialized();
			
			if (!this.modelOperations) {
				console.warn('VSCode Language Detection model not available');
				return null;
			}

			// Run the ML model
			const results = await this.modelOperations.runModel(code);
			
			if (!results || results.length === 0) {
				return null;
			}

			// Get the top result
			const topResult = results[0];
			
			// Convert confidence from 0-1 scale to 0-100 scale
			const confidence = Math.round(topResult.confidence * 100);

			if (confidence < this.minConfidence * 100) {
				return null;
			}

			// Map VSCode language IDs to common language names
			const language = this.mapLanguageId(topResult.languageId);

			return {
				language: language,
				confidence: confidence,
				method: 'vscode-ml'
			};
		} catch (error) {
			console.error('Error in VSCode Language Detection:', error);
			return null;
		}
	}

	/**
	 * Maps VSCode language IDs to standardized language names
	 * @param languageId The language ID from VSCode model
	 * @returns Standardized language name
	 */
	private mapLanguageId(languageId: string): string {
		const languageMapping: Record<string, string> = {
			'ts': 'typescript',
			'js': 'javascript',
			'py': 'python',
			'rs': 'rust',
			'cpp': 'cpp',
			'c': 'c',
			'cs': 'csharp',
			'java': 'java',
			'php': 'php',
			'rb': 'ruby',
			'go': 'go',
			'swift': 'swift',
			'kt': 'kotlin',
			'scala': 'scala',
			'r': 'r',
			'sql': 'sql',
			'html': 'html',
			'css': 'css',
			'json': 'json',
			'yaml': 'yaml',
			'yml': 'yaml',
			'xml': 'xml',
			'md': 'markdown',
			'sh': 'bash',
			'bash': 'bash',
			'ps1': 'powershell',
			'dockerfile': 'dockerfile',
			'makefile': 'makefile',
			'lua': 'lua',
			'perl': 'perl',
			'pl': 'perl',
			'hs': 'haskell',
			'erl': 'erlang',
			'coffee': 'coffeescript',
			'bat': 'batch',
			'tex': 'latex',
			'scss': 'scss',
			'sass': 'sass',
			'mm': 'objective-c',
			'ipynb': 'jupyter'
		};

		return languageMapping[languageId] || languageId;
	}

	/**
	 * Gets the list of available languages supported by the VSCode model
	 * Based on the languages supported by the underlying guesslang model
	 * @returns Array of language names
	 */
	getAvailableLanguages(): string[] {
		// These are the languages supported by the VSCode Language Detection model
		// based on the underlying guesslang model
		return [
			'typescript',
			'javascript',
			'python',
			'rust',
			'cpp',
			'c',
			'csharp',
			'java',
			'php',
			'ruby',
			'go',
			'swift',
			'kotlin',
			'scala',
			'r',
			'sql',
			'html',
			'css',
			'json',
			'yaml',
			'xml',
			'markdown',
			'bash',
			'powershell',
			'dockerfile',
			'makefile',
			'lua',
			'perl',
			'haskell',
			'erlang',
			'coffeescript',
			'batch',
			'latex',
			'scss',
			'sass',
			'objective-c',
			'jupyter',
			'matlab'
		];
	}

	/**
	 * Checks if a specific language is supported by the VSCode model
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

	/**
	 * Gets the unique name of this detector
	 * @returns Detector name
	 */
	getName(): string {
		return 'vscode-ml';
	}

	/**
	 * Gets the display name of this detector
	 * @returns User-friendly display name
	 */
	getDisplayName(): string {
		return 'VSCode ML Detector';
	}

	/**
	 * Gets the description of this detector
	 * @returns Detector description
	 */
	getDescription(): string {
		return 'Machine Learning-based language detection using Microsoft\'s VSCode Language Detection model (powered by guesslang)';
	}

	/**
	 * Checks if this detector supports extended configuration
	 * @returns True as this detector supports configuration
	 */
	isConfigurable(): boolean {
		return true;
	}

	/**
	 * Gets the current configuration of this detector
	 * @returns Configuration object
	 */
	getConfiguration(): Record<string, any> {
		return {
			minConfidence: this.minConfidence,
			isInitialized: this.isInitialized,
			modelAvailable: this.modelOperations !== null
		};
	}

	/**
	 * Sets the configuration for this detector
	 * @param config Configuration object
	 */
	setConfiguration(config: Record<string, any>): void {
		if (typeof config.minConfidence === 'number') {
			this.setMinConfidence(config.minConfidence);
		}
	}

	/**
	 * Gets the status of the detector initialization
	 * @returns True if the detector is initialized and ready
	 */
	isReady(): boolean {
		return this.isInitialized && this.modelOperations !== null;
	}

	/**
	 * Manually initializes the detector (useful for preloading)
	 */
	async initialize(): Promise<void> {
		await this.ensureInitialized();
	}

	/**
	 * Disposes of the detector resources
	 */
	dispose(): void {
		this.modelOperations = null;
		this.isInitialized = false;
		this.initializationPromise = null;
	}
}
