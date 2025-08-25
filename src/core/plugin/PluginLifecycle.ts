import AutoSyntaxHighlightPlugin from '../../../main';
import { CodeAnalyzer } from '../code-analyzer';
import { LanguageDetectionEngine } from '../language-detector';
import { SyntaxApplier } from '../syntax-applier';
import { HistoryService, UndoIgnoreService } from '../../services';
import { DynamicAutoSyntaxHighlightSettingsTab } from '../../ui';
import { EventHandlers } from './EventHandlers';
import { CommandManager } from './CommandManager';
import { FileProcessor } from './FileProcessor';

/**
 * Manages plugin lifecycle operations
 */
export class PluginLifecycle {
	private plugin: AutoSyntaxHighlightPlugin;
	private eventHandlers: EventHandlers;
	private commandManager: CommandManager;
	private fileProcessor: FileProcessor;

	constructor(plugin: AutoSyntaxHighlightPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Initialize the plugin on load
	 */
	async onload(): Promise<void> {
		await this.plugin.loadSettings();

		// Initialize services
		this.initializeServices();

		// Load history data into history service
		this.loadHistoryData();

		// Initialize managers
		this.initializeManagers();

		// Register event handlers
		this.eventHandlers.registerEventHandlers();

		// Add commands
		this.commandManager.registerCommands();

		// Add settings tab
		this.plugin.addSettingTab(new DynamicAutoSyntaxHighlightSettingsTab(this.plugin.app, this.plugin));

		// Add ribbon icon
		this.plugin.addRibbonIcon('code', 'CodeBlock Language Detector', () => {
			this.fileProcessor.processBasedOnScope();
		});

		console.log('CodeBlock Language Detector plugin loaded');
	}

	/**
	 * Cleanup on plugin unload
	 */
	onunload(): void {
		// Unregister event handlers
		if (this.eventHandlers) {
			this.eventHandlers.unregisterEventHandlers();
		}

		console.log('CodeBlock Language Detector plugin unloaded');
	}

	/**
	 * Initialize all core services
	 */
	private initializeServices(): void {
		this.plugin.codeAnalyzer = new CodeAnalyzer();
		
		// Get detection order from detector configurations
		const detectionOrder = this.getDetectionOrderFromConfigurations();
		
		this.plugin.detectionEngine = new LanguageDetectionEngine(
			detectionOrder,
			this.plugin.settings.confidenceThreshold,
			this.plugin.settings.enabledPatternLanguages
		);
		
		this.plugin.syntaxApplier = new SyntaxApplier();
		
		this.plugin.historyService = new HistoryService(this.plugin.settings.maxHistoryEntries);
		
		// Initialize undo ignore service
		this.plugin.undoIgnoreService = new UndoIgnoreService();
		
		// Set up save callback for persistent history storage
		this.plugin.historyService.setSaveCallback(async () => {
			await this.saveHistoryData();
		});
		
		// Apply current settings to detection engine
		this.plugin.updateDetectionEngineSettings();
	}

	/**
	 * Initialize managers
	 */
	private initializeManagers(): void {
		this.eventHandlers = new EventHandlers(this.plugin);
		this.commandManager = new CommandManager(this.plugin);
		this.fileProcessor = new FileProcessor(this.plugin);

		// Expose file processor methods to main plugin
		this.plugin.processBasedOnScope = this.fileProcessor.processBasedOnScope.bind(this.fileProcessor);
		this.plugin.processFile = this.fileProcessor.processFile.bind(this.fileProcessor);
		this.plugin.processAllMarkdownFiles = this.fileProcessor.processAllMarkdownFiles.bind(this.fileProcessor);
		this.plugin.undoLanguageApplication = this.fileProcessor.undoLanguageApplication.bind(this.fileProcessor);
		this.plugin.reapplyLanguageDetection = this.fileProcessor.reapplyLanguageDetection.bind(this.fileProcessor);
	}

	/**
	 * Loads history data into the history service
	 */
	private loadHistoryData(): void {
		if (this.plugin.settings.enableHistory && this.plugin.settings.historyData) {
			this.plugin.historyService.loadHistory(this.plugin.settings.historyData);
		}
	}

	/**
	 * Saves current history data to settings
	 */
	private async saveHistoryData(): Promise<void> {
		if (this.plugin.settings.enableHistory) {
			this.plugin.settings.historyData = this.plugin.historyService.getHistoryData();
			await this.plugin.saveData(this.plugin.settings);
		}
	}

	/**
	 * Get detection order from detector configurations
	 */
	private getDetectionOrderFromConfigurations(): string[] {
		const configs = this.plugin.settings.detectorConfigurations || {};
		
		// If no configurations exist, use default order
		if (Object.keys(configs).length === 0) {
			return ['vscode-ml', 'highlight-js', 'pattern-matching'];
		}
		
		// Get enabled detectors sorted by order
		return Object.entries(configs)
			.filter(([_, config]) => config.enabled)
			.sort((a, b) => a[1].order - b[1].order)
			.map(([name, _]) => name);
	}
}
