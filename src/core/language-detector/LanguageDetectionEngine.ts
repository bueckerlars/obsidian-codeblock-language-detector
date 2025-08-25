import { DetectionResult, ILanguageDetector } from '../../types';
import { HighlightJsDetector } from './HighlightJsDetector';
import { PatternMatchingDetector } from './PatternMatchingDetector';
import { VSCodeDetector } from './VSCodeDetector';
import { DetectorRegistry, DetectionOrchestrator, ConfigurationManager } from './engine';

/**
 * Main language detection engine that coordinates multiple detection methods
 * Now supports dynamic registration of detection methods with improved architecture
 */
export class LanguageDetectionEngine implements ILanguageDetector {
	private registry: DetectorRegistry;
	private orchestrator: DetectionOrchestrator;
	private configManager: ConfigurationManager;

	constructor(
		detectionOrder: string[] = ['vscode-ml', 'highlight-js', 'pattern-matching'],
		confidenceThreshold: number = 70,
		enabledPatternLanguages: string[] = []
	) {
		// Initialize components
		this.registry = new DetectorRegistry(detectionOrder);
		this.orchestrator = new DetectionOrchestrator(this.registry, confidenceThreshold, enabledPatternLanguages);
		this.configManager = new ConfigurationManager(this.registry, this.orchestrator);
		
		// Register default detectors
		this.registerDefaultDetectors(confidenceThreshold, enabledPatternLanguages);
	}

	/**
	 * Registers the default detection methods
	 */
	private registerDefaultDetectors(confidenceThreshold: number, enabledPatternLanguages: string[]): void {
		const normalizedThreshold = confidenceThreshold / 100;
		this.registry.registerDefaultDetectors(normalizedThreshold, enabledPatternLanguages);
	}

	// ===========================================
	// Main Detection Interface (ILanguageDetector)
	// ===========================================

	/**
	 * Detects the programming language using the configured detection methods in order
	 * @param code The code to analyze
	 * @returns Detection result or null if no method succeeds
	 */
	async detectLanguage(code: string): Promise<DetectionResult | null> {
		return this.orchestrator.detectLanguage(code);
	}

	/**
	 * Gets the list of available languages from all detectors
	 * @returns Array of unique language names
	 */
	getAvailableLanguages(): string[] {
		return this.registry.getAvailableLanguages();
	}

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
		this.configManager.setConfidenceThreshold(threshold * 100);
	}

	/**
	 * Gets the current minimum confidence threshold for the engine
	 * @returns Current minimum confidence (0-1)
	 */
	getMinConfidence(): number {
		return this.configManager.getConfidenceThreshold() / 100;
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
		return this.configManager.getConfiguration();
	}

	/**
	 * Sets the engine configuration
	 * @param config Configuration object
	 */
	setConfiguration(config: Record<string, any>): void {
		this.configManager.setConfiguration(config);
	}

	// ===========================================
	// Registry Management
	// ===========================================

	/**
	 * Registers a new detection method
	 * @param detector The detector to register
	 */
	registerDetector(detector: ILanguageDetector): void {
		this.registry.registerDetector(detector);
	}

	/**
	 * Unregisters a detection method
	 * @param detectorName The name of the detector to unregister
	 */
	unregisterDetector(detectorName: string): void {
		this.registry.unregisterDetector(detectorName);
	}

	/**
	 * Gets a registered detector by name
	 * @param detectorName The name of the detector
	 * @returns The detector instance or undefined if not found
	 */
	getDetector(detectorName: string): ILanguageDetector | undefined {
		return this.registry.getDetector(detectorName);
	}

	/**
	 * Gets all registered detectors
	 * @returns Array of registered detector instances
	 */
	getRegisteredDetectors(): ILanguageDetector[] {
		return this.registry.getAllDetectors();
	}

	/**
	 * Gets the names of all registered detectors
	 * @returns Array of detector names
	 */
	getRegisteredDetectorNames(): string[] {
		return this.registry.getDetectorNames();
	}

	// ===========================================
	// Detection Operations
	// ===========================================

	/**
	 * Detects language using a specific detector
	 * @param code The code to analyze
	 * @param detectorName The name of the detector to use
	 * @returns Detection result or null
	 */
	async detectWithDetector(code: string, detectorName: string): Promise<DetectionResult | null> {
		return this.orchestrator.detectWithDetector(code, detectorName);
	}

	/**
	 * Attempts detection with all registered methods and returns all results
	 * @param code The code to analyze
	 * @returns Array of detection results from all methods
	 */
	async detectWithAllMethods(code: string): Promise<DetectionResult[]> {
		return this.orchestrator.detectWithAllMethods(code);
	}

	/**
	 * Detects language with detailed analysis including fallback options
	 * @param code The code to analyze
	 * @param options Detection options
	 * @returns Detailed detection result
	 */
	async detectWithAnalysis(code: string, options?: {
		includeAllResults?: boolean;
		includeFallbacks?: boolean;
		minConfidence?: number;
	}) {
		return this.orchestrator.detectWithAnalysis(code, options);
	}

	// ===========================================
	// Configuration Management
	// ===========================================

	/**
	 * Updates the detection method order
	 * @param order New detection method order (detector names)
	 */
	setDetectionOrder(order: string[]): void {
		this.configManager.setDetectionOrder(order);
	}

	/**
	 * Gets the current detection method order
	 * @returns Current detection method order (detector names)
	 */
	getDetectionOrder(): string[] {
		return this.configManager.getDetectionOrder();
	}

	/**
	 * Updates the confidence threshold for all detectors
	 * @param threshold New confidence threshold (0-100)
	 */
	setConfidenceThreshold(threshold: number): void {
		this.configManager.setConfidenceThreshold(threshold);
	}

	/**
	 * Gets the current confidence threshold
	 * @returns Current confidence threshold (0-100)
	 */
	getConfidenceThreshold(): number {
		return this.configManager.getConfidenceThreshold();
	}

	/**
	 * Enables or disables a specific detection method
	 * @param detectorName The name of the detector to enable/disable
	 * @param enabled Whether the method should be enabled
	 */
	setDetectorEnabled(detectorName: string, enabled: boolean): void {
		this.configManager.setDetectorEnabled(detectorName, enabled);
	}

	/**
	 * Checks if a specific detection method is enabled
	 * @param detectorName The name of the detector to check
	 * @returns True if the method is enabled
	 */
	isDetectorEnabled(detectorName: string): boolean {
		return this.configManager.isDetectorEnabled(detectorName);
	}

	/**
	 * Updates the list of enabled languages for pattern matching
	 * @param enabledPatternLanguages Array of language names that should be used for pattern matching
	 */
	setEnabledPatternLanguages(enabledPatternLanguages: string[]): void {
		this.configManager.setEnabledPatternLanguages(enabledPatternLanguages);
	}

	/**
	 * Gets the current enabled pattern languages
	 * @returns Array of currently enabled pattern language names
	 */
	getEnabledPatternLanguages(): string[] {
		return this.configManager.getEnabledPatternLanguages();
	}

	// ===========================================
	// Backward Compatibility Methods
	// ===========================================

	/**
	 * Gets the highlight.js detector instance for direct access
	 * @returns HighlightJsDetector instance or undefined if not registered
	 */
	getHighlightJsDetector(): HighlightJsDetector | undefined {
		return this.registry.getHighlightJsDetector();
	}

	/**
	 * Gets the pattern matching detector instance for direct access
	 * @returns PatternMatchingDetector instance or undefined if not registered
	 */
	getPatternMatchingDetector(): PatternMatchingDetector | undefined {
		return this.registry.getPatternMatchingDetector();
	}

	/**
	 * Gets the VSCode ML detector instance for direct access
	 * @returns VSCodeDetector instance or undefined if not registered
	 */
	getVSCodeDetector(): VSCodeDetector | undefined {
		return this.registry.getVSCodeDetector();
	}

	// ===========================================
	// Validation and Diagnostics
	// ===========================================

	/**
	 * Validates the detection configuration
	 * @returns True if the configuration is valid
	 */
	isConfigurationValid(): boolean {
		return this.configManager.validateConfiguration().isValid;
	}

	/**
	 * Gets detailed validation results
	 * @returns Validation result with details
	 */
	validateConfiguration() {
		return this.configManager.validateConfiguration();
	}

	/**
	 * Gets performance metrics
	 * @returns Performance metrics
	 */
	getPerformanceMetrics() {
		return this.orchestrator.getPerformanceMetrics();
	}

	/**
	 * Gets configuration summary
	 * @returns Configuration summary
	 */
	getConfigurationSummary() {
		return this.configManager.getConfigurationSummary();
	}

	/**
	 * Validates code before detection
	 * @param code The code to validate
	 * @returns Validation result
	 */
	validateCode(code: string) {
		return this.orchestrator.validateCode(code);
	}
}