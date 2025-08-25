import { Plugin, TFile } from 'obsidian';

// Import our types and services
import { 
	AutoSyntaxHighlightSettings, 
	DEFAULT_SETTINGS, 
	HistoryEntry,
	DetectorConfiguration
} from './src/types';

import { CodeAnalyzer } from './src/core/code-analyzer';
import { LanguageDetectionEngine } from './src/core/language-detector';
import { SyntaxApplier } from './src/core/syntax-applier';
import { HistoryService } from './src/services';
import { PluginLifecycle } from './src/core/plugin';

/**
 * Main plugin class for CodeBlock Language Detector
 */
export default class AutoSyntaxHighlightPlugin extends Plugin {
	settings: AutoSyntaxHighlightSettings;
	
	// Core services
	codeAnalyzer: CodeAnalyzer;
	detectionEngine: LanguageDetectionEngine;
	syntaxApplier: SyntaxApplier;
	historyService: HistoryService;

	// Plugin lifecycle manager
	private pluginLifecycle: PluginLifecycle;

	// File processing methods (injected by PluginLifecycle)
	processBasedOnScope: () => Promise<void>;
	processFile: (file: TFile | null) => Promise<void>;
	processAllMarkdownFiles: () => Promise<void>;
	undoLanguageApplication: (entry: HistoryEntry) => Promise<boolean>;
	reapplyLanguageDetection: (entry: HistoryEntry) => Promise<boolean>;

	async onload(): Promise<void> {
		// Initialize plugin lifecycle manager
		this.pluginLifecycle = new PluginLifecycle(this);
		
		// Delegate to lifecycle manager
		await this.pluginLifecycle.onload();
	}

	onunload(): void {
		// Delegate to lifecycle manager
		if (this.pluginLifecycle) {
			this.pluginLifecycle.onunload();
		}
	}

	/**
	 * Update detection engine settings
	 */
	updateDetectionEngineSettings(): void {
		// Ensure detectorConfigurations exists, migrate from legacy settings if needed
		this.migrateToDetectorConfigurations();
		
		// Apply configurations to each registered detector
		const registeredDetectors = this.detectionEngine.getRegisteredDetectors();
		
		for (const detector of registeredDetectors) {
			const detectorName = detector.getName();
			const config = this.getDetectorConfig(detectorName);
			
			// Set confidence threshold for this detector
			detector.setMinConfidence(config.confidenceThreshold / 100);
			
			// Apply detector-specific configuration
			if (detector.isConfigurable && detector.isConfigurable() && detector.setConfiguration) {
				detector.setConfiguration(config.config);
			}
			
			// Enable/disable detector in the detection order
			this.detectionEngine.setDetectorEnabled(detectorName, config.enabled);
		}
		
		// Set the detection order based on enabled detectors and their order values
		const enabledDetectors = Object.entries(this.settings.detectorConfigurations)
			.filter(([_, config]) => config.enabled)
			.sort((a, b) => a[1].order - b[1].order)
			.map(([name, _]) => name);
		
		this.detectionEngine.setDetectionOrder(enabledDetectors);
		
		// Set global confidence threshold as fallback
		this.detectionEngine.setConfidenceThreshold(this.settings.confidenceThreshold);
		
		// Backward compatibility: still update pattern languages for legacy support
		this.detectionEngine.setEnabledPatternLanguages(this.settings.enabledPatternLanguages);
	}
	
	/**
	 * Migrate legacy settings to new detector configurations format
	 */
	private migrateToDetectorConfigurations(): void {
		if (!this.settings.detectorConfigurations) {
			this.settings.detectorConfigurations = {};
		}
		
		// Migrate highlight-js settings
		if (!this.settings.detectorConfigurations['highlight-js']) {
			this.settings.detectorConfigurations['highlight-js'] = {
				enabled: this.settings.enableHighlightJs,
				confidenceThreshold: this.settings.confidenceThreshold,
				order: this.settings.detectionMethodOrder.indexOf('highlight-js'),
				config: {}
			};
		}
		
		// Migrate pattern-matching settings
		if (!this.settings.detectorConfigurations['pattern-matching']) {
			this.settings.detectorConfigurations['pattern-matching'] = {
				enabled: this.settings.enablePatternMatching,
				confidenceThreshold: this.settings.confidenceThreshold,
				order: this.settings.detectionMethodOrder.indexOf('pattern-matching'),
				config: {
					enabledLanguages: this.settings.enabledPatternLanguages
				}
			};
		}
	}
	
	/**
	 * Get detector configuration with fallback to defaults
	 */
	private getDetectorConfig(detectorName: string): DetectorConfiguration {
		const configs = this.settings.detectorConfigurations || {};
		return configs[detectorName] || {
			enabled: true,
			confidenceThreshold: this.settings.confidenceThreshold,
			order: 0,
			config: {}
		};
	}

	/**
	 * Load plugin settings
	 */
	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * Save plugin settings
	 */
	async saveSettings(): Promise<void> {
		// Update history data before saving settings
		if (this.settings.enableHistory && this.historyService) {
			this.settings.historyData = this.historyService.getHistoryData();
		}
		
		await this.saveData(this.settings);
		
		// Update detection engine settings when settings change
		if (this.detectionEngine) {
			this.updateDetectionEngineSettings();
		}
		
		// Update history service max entries
		if (this.historyService) {
			this.historyService.setMaxEntries(this.settings.maxHistoryEntries);
		}
	}

	/**
	 * Reset settings to defaults
	 */
	async resetSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
		await this.saveSettings();
	}
}