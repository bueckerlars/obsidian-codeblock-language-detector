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
import { HistoryService, UndoIgnoreService } from './src/services';
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
	undoIgnoreService: UndoIgnoreService;

	// Plugin lifecycle manager
	private pluginLifecycle: PluginLifecycle;

	// File processing methods (injected by PluginLifecycle)
	processBasedOnScope: () => Promise<void>;
	processFile: (file: TFile | null) => Promise<number>;
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
		// Ensure detectorConfigurations exists
		if (!this.settings.detectorConfigurations) {
			this.settings.detectorConfigurations = {};
		}
		
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
		
		// Update pattern languages for pattern-matching detector
		this.detectionEngine.setEnabledPatternLanguages(this.settings.enabledPatternLanguages);
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
		const loadedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
		
		// Ensure uiState is initialized for backward compatibility
		if (!this.settings.uiState) {
			this.settings.uiState = {
				expandedDetectorCards: {}
			};
		}
		
		// Perform migration if needed
		await this.migrateSettingsIfNeeded(loadedData);
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
	 * Migrate settings from older versions if needed
	 * @param loadedData The raw loaded settings data
	 */
	private async migrateSettingsIfNeeded(loadedData: any): Promise<void> {
		if (!loadedData || typeof loadedData !== 'object') {
			return;
		}
		
		const currentVersion = loadedData.version || 0;
		const targetVersion = DEFAULT_SETTINGS.version;
		
		if (currentVersion >= targetVersion) {
			return; // No migration needed
		}
		
		console.log(`Migrating settings from version ${currentVersion} to ${targetVersion}`);
		
		// Migrate from version 0 (legacy) to version 1
		if (currentVersion === 0) {
			await this.migrateFromLegacySettings(loadedData);
		}
		
		// Set the new version
		this.settings.version = targetVersion;
		await this.saveSettings();
		
		console.log('Settings migration completed');
	}

	/**
	 * Migrate from legacy settings format (version 0) to new format
	 * @param legacyData The legacy settings data
	 */
	private async migrateFromLegacySettings(legacyData: any): Promise<void> {
		// Only migrate if legacy settings exist and new format doesn't
		if (!this.settings.detectorConfigurations || Object.keys(this.settings.detectorConfigurations).length === 0) {
			this.settings.detectorConfigurations = {};
			
			// Migrate legacy enable flags and detection order
			const legacyOrder = legacyData.detectionMethodOrder || ['vscode-ml', 'highlight-js', 'pattern-matching'];
			
			// Migrate vscode-ml
			if (legacyData.hasOwnProperty('enableVSCodeML')) {
				this.settings.detectorConfigurations['vscode-ml'] = {
					enabled: legacyData.enableVSCodeML !== false,
					confidenceThreshold: legacyData.confidenceThreshold || 70,
					order: legacyOrder.indexOf('vscode-ml') !== -1 ? legacyOrder.indexOf('vscode-ml') : 0,
					config: {}
				};
			}
			
			// Migrate highlight-js
			if (legacyData.hasOwnProperty('enableHighlightJs')) {
				this.settings.detectorConfigurations['highlight-js'] = {
					enabled: legacyData.enableHighlightJs !== false,
					confidenceThreshold: legacyData.confidenceThreshold || 70,
					order: legacyOrder.indexOf('highlight-js') !== -1 ? legacyOrder.indexOf('highlight-js') : 1,
					config: {}
				};
			}
			
			// Migrate pattern-matching
			if (legacyData.hasOwnProperty('enablePatternMatching')) {
				this.settings.detectorConfigurations['pattern-matching'] = {
					enabled: legacyData.enablePatternMatching !== false,
					confidenceThreshold: legacyData.confidenceThreshold || 70,
					order: legacyOrder.indexOf('pattern-matching') !== -1 ? legacyOrder.indexOf('pattern-matching') : 2,
					config: {
						enabledLanguages: legacyData.enabledPatternLanguages || ['javascript', 'typescript', 'python', 'java', 'cpp', 'bash']
					}
				};
			}
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