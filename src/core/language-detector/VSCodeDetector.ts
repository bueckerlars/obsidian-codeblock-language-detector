import { ModelOperations } from '@vscode/vscode-languagedetection';
import modelJson from '@vscode/vscode-languagedetection/model/model.json';
import modelWeights from '@vscode/vscode-languagedetection/model/group1-shard1of1.bin';
import { DetectionResult, ILanguageDetector, VSCodeDetectorConfig } from '../../types';

function getModelWeightsBuffer(): ArrayBuffer {
	return modelWeights.buffer.slice(
		modelWeights.byteOffset,
		modelWeights.byteOffset + modelWeights.byteLength
	);
}

/** Matches VS Code's languageDetectionWebWorker confidence corrections. */
const POSITIVE_CONFIDENCE_BUCKET1 = 0.05;
const POSITIVE_CONFIDENCE_BUCKET2 = 0.025;
const NEGATIVE_CONFIDENCE_CORRECTION = 0.5;

/**
 * Language detector using Microsoft's VSCode Language Detection ML Model
 * Based on the @vscode/vscode-languagedetection package
 */
export class VSCodeDetector implements ILanguageDetector {
	private minConfidence: number;
	private modelOperations: ModelOperations | null = null;
	private isInitialized: boolean = false;
	private initializationPromise: Promise<void> | null = null;

	constructor(minConfidence: number = 0.1) {
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
			this.modelOperations = new ModelOperations({
				modelJsonLoaderFunc: async () => modelJson,
				weightsLoaderFunc: async () => getModelWeightsBuffer(),
			});
			this.isInitialized = true;
			return Promise.resolve();
		} catch (error) {
			console.error('Failed to initialize VSCode Language Detection model:', error);
			return Promise.reject(error instanceof Error ? error : new Error(String(error)));
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

			// Adjust and re-sort like VS Code so common languages aren't
			// unfairly rejected due to soft softmax probabilities.
			const adjusted = results
				.map(result => this.adjustLanguageConfidence(result))
				.sort((a, b) => b.confidence - a.confidence);

			const topResult = adjusted[0];
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
	 * Adjusts raw model confidence the same way VS Code does for known
	 * high-traffic and problematic languages.
	 */
	private adjustLanguageConfidence(modelResult: { languageId: string; confidence: number }): {
		languageId: string;
		confidence: number;
	} {
		const languageId = modelResult.languageId;
		let confidence = modelResult.confidence;

		switch (languageId) {
			case 'js':
			case 'ts':
			case 'html':
			case 'py':
			case 'xml':
			case 'php':
				confidence += POSITIVE_CONFIDENCE_BUCKET1;
				break;
			case 'cpp':
			case 'sh':
			case 'java':
			case 'cs':
			case 'c':
				confidence += POSITIVE_CONFIDENCE_BUCKET2;
				break;
			case 'bat':
			case 'ini':
			case 'makefile':
			case 'sql':
			case 'csv':
			case 'toml':
				confidence -= NEGATIVE_CONFIDENCE_CORRECTION;
				break;
		}

		return { languageId, confidence };
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
	getConfiguration(): VSCodeDetectorConfig {
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
	setConfiguration(config: VSCodeDetectorConfig): void {
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
