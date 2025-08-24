import { App, Editor, MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf } from 'obsidian';

// Import our types and services
import { 
	AutoSyntaxHighlightSettings, 
	DEFAULT_SETTINGS, 
	CodeBlock, 
	HistoryEntry,
	DetectionResult,
	DetectionMethod
} from './src/types';

import { CodeAnalyzer } from './src/core/code-analyzer';
import { LanguageDetectionEngine } from './src/core/language-detector';
import { SyntaxApplier } from './src/core/syntax-applier';
import { HistoryService } from './src/services';
import { AutoSyntaxHighlightSettingsTab, HistoryModal } from './src/ui';

/**
 * Main plugin class for Auto Syntax Highlight
 */
export default class AutoSyntaxHighlightPlugin extends Plugin {
	settings: AutoSyntaxHighlightSettings;
	
	// Core services
	codeAnalyzer: CodeAnalyzer;
	languageDetectionEngine: LanguageDetectionEngine;
	syntaxApplier: SyntaxApplier;
	historyService: HistoryService;

	// Event handlers
	private editorChangeHandler: (editor: Editor, view: MarkdownView) => void;
	private fileOpenHandler: (file: TFile) => void;
	private fileSaveHandler: (file: TFile) => void;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Initialize services
		this.initializeServices();

		// Load history data into history service
		this.loadHistoryData();

		// Register event handlers
		this.registerEventHandlers();

		// Add commands
		this.addCommands();

		// Add settings tab
		this.addSettingTab(new AutoSyntaxHighlightSettingsTab(this.app, this));

		// Add ribbon icon
		this.addRibbonIcon('code', 'Auto Syntax Highlight', () => {
			this.processCurrentFile();
		});

		console.log('Auto Syntax Highlight plugin loaded');
	}

	onunload(): void {
		console.log('Auto Syntax Highlight plugin unloaded');
	}

	/**
	 * Initialize all core services
	 */
	private initializeServices(): void {
		this.codeAnalyzer = new CodeAnalyzer();
		
		this.languageDetectionEngine = new LanguageDetectionEngine(
			this.settings.detectionMethodOrder,
			this.settings.confidenceThreshold
		);
		
		this.syntaxApplier = new SyntaxApplier();
		
		this.historyService = new HistoryService(this.settings.maxHistoryEntries);
		
		// Set up save callback for persistent history storage
		this.historyService.setSaveCallback(async () => {
			await this.saveHistoryData();
		});
		
		// Apply current settings to detection engine
		this.updateDetectionEngineSettings();
	}

	/**
	 * Register event handlers based on trigger behavior settings
	 */
	private registerEventHandlers(): void {
		// Editor change handler (for auto-on-edit)
		this.editorChangeHandler = (editor: Editor, view: MarkdownView) => {
			if (this.settings.triggerBehavior === 'auto-on-edit') {
				this.debounceProcessFile(view.file);
			}
		};

		// File open handler (for auto-on-open)
		this.fileOpenHandler = (file: TFile) => {
			if (this.settings.triggerBehavior === 'auto-on-open' && file.extension === 'md') {
				setTimeout(() => this.processFile(file), 500); // Small delay to ensure file is loaded
			}
		};

		// File save handler (for auto-on-save)
		this.fileSaveHandler = (file: TFile) => {
			if (this.settings.triggerBehavior === 'auto-on-save' && file.extension === 'md') {
				this.processFile(file);
			}
		};

		// Register the handlers
		this.registerEvent(this.app.workspace.on('editor-change', this.editorChangeHandler));
		this.registerEvent(this.app.workspace.on('file-open', this.fileOpenHandler));
		this.registerEvent(this.app.vault.on('modify', this.fileSaveHandler));
	}

	/**
	 * Add plugin commands
	 */
	private addCommands(): void {
		// Manual detection command
		this.addCommand({
			id: 'detect-languages-manual',
			name: 'Detect and apply language tags',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.processCurrentFile();
			}
		});

		// Process current file command
		this.addCommand({
			id: 'process-current-file',
			name: 'Process current file only',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.processFile(markdownView.file);
					}
					return true;
				}
				return false;
			}
		});

		// Open history modal command
		this.addCommand({
			id: 'open-history-modal',
			name: 'Open detection history',
			callback: () => {
				new HistoryModal(this.app, this).open();
			}
		});

		// Process all markdown files command
		this.addCommand({
			id: 'process-all-files',
			name: 'Process all markdown files',
			callback: () => {
				this.processAllMarkdownFiles();
			}
		});

		// Clear history command
		this.addCommand({
			id: 'clear-history',
			name: 'Clear detection history',
			callback: () => {
				if (confirm('Are you sure you want to clear all detection history?')) {
					this.historyService.clearHistory();
					new Notice('Detection history cleared');
				}
			}
		});
	}

	/**
	 * Process the currently active file
	 */
	async processCurrentFile(): Promise<void> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('No active markdown file');
			return;
		}

		await this.processFile(activeView.file);
	}

	/**
	 * Process a specific file for language detection
	 */
	async processFile(file: TFile | null): Promise<void> {
		if (!file || file.extension !== 'md') {
			return;
		}

		try {
			// Read file content
			const content = await this.app.vault.read(file);
			
			// Find code blocks without language tags
			const codeBlocks = this.codeAnalyzer.findCodeBlocksWithoutLanguage(content);
			
			if (codeBlocks.length === 0) {
				return; // No code blocks to process
			}

			let updatedContent = content;
			let detectionsApplied = 0;

			// Process each code block
			for (const codeBlock of codeBlocks) {
				const detectionResult = await this.languageDetectionEngine.detectLanguage(codeBlock.content);
				
				if (detectionResult) {
					try {
						// Apply the language tag
						updatedContent = this.syntaxApplier.applyLanguageTag(updatedContent, codeBlock, detectionResult.language);
						
						// Add to history if enabled
						if (this.settings.enableHistory) {
							const historyEntry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
								fileName: file.name,
								filePath: file.path,
								codeBlock,
								detectedLanguage: detectionResult.language,
								confidence: detectionResult.confidence,
								method: detectionResult.method,
								applied: true
							};
							
							this.historyService.addEntry(historyEntry);
						}
						
						detectionsApplied++;
					} catch (error) {
						console.error('Error applying language tag:', error);
					}
				}
			}

			// Write updated content back to file if changes were made
			if (detectionsApplied > 0) {
				await this.app.vault.modify(file, updatedContent);
				
				if (this.settings.showNotifications) {
					new Notice(`Applied ${detectionsApplied} language tag(s) to ${file.name}`);
				}
			}

		} catch (error) {
			console.error('Error processing file:', error);
			new Notice(`Error processing ${file.name}: ${error.message}`);
		}
	}

	/**
	 * Process all markdown files in the vault
	 */
	async processAllMarkdownFiles(): Promise<void> {
		const markdownFiles = this.app.vault.getMarkdownFiles();
		let totalDetections = 0;
		let filesProcessed = 0;

		const notice = new Notice('Processing all markdown files...', 0);

		try {
			for (const file of markdownFiles) {
				const content = await this.app.vault.read(file);
				const codeBlocks = this.codeAnalyzer.findCodeBlocksWithoutLanguage(content);
				
				if (codeBlocks.length > 0) {
					await this.processFile(file);
					filesProcessed++;
				}
			}

			notice.hide();
			new Notice(`Processed ${filesProcessed} files with ${totalDetections} detections`);
		} catch (error) {
			notice.hide();
			console.error('Error processing all files:', error);
			new Notice(`Error processing files: ${error.message}`);
		}
	}

	/**
	 * Debounced file processing for editor changes
	 */
	private debounceTimer: NodeJS.Timeout | null = null;
	private debounceProcessFile(file: TFile | null): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		
		this.debounceTimer = setTimeout(() => {
			this.processFile(file);
		}, 2000); // 2 second delay
	}

	/**
	 * Undo a language application from history
	 */
	async undoLanguageApplication(entry: HistoryEntry): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(entry.filePath);
			if (!(file instanceof TFile)) {
				return false;
			}

			const content = await this.app.vault.read(file);
			const updatedContent = this.syntaxApplier.removeLanguageTag(content, entry.codeBlock);
			
			await this.app.vault.modify(file, updatedContent);
			
			if (this.settings.showNotifications) {
				new Notice(`Removed language tag from ${entry.fileName}`);
			}
			
			return true;
		} catch (error) {
			console.error('Error undoing language application:', error);
			new Notice(`Error undoing change: ${error.message}`);
			return false;
		}
	}

	/**
	 * Reapply a language detection from history
	 */
	async reapplyLanguageDetection(entry: HistoryEntry): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(entry.filePath);
			if (!(file instanceof TFile)) {
				return false;
			}

			const content = await this.app.vault.read(file);
			const updatedContent = this.syntaxApplier.applyLanguageTag(content, entry.codeBlock, entry.detectedLanguage);
			
			await this.app.vault.modify(file, updatedContent);
			
			if (this.settings.showNotifications) {
				new Notice(`Reapplied language tag to ${entry.fileName}`);
			}
			
			return true;
		} catch (error) {
			console.error('Error reapplying language detection:', error);
			new Notice(`Error reapplying change: ${error.message}`);
			return false;
		}
	}

	/**
	 * Update detection engine settings
	 */
	updateDetectionEngineSettings(): void {
		// Set confidence threshold first
		this.languageDetectionEngine.setConfidenceThreshold(this.settings.confidenceThreshold);
		
		// Build the detection order based on enabled methods and user preference
		const enabledMethods: DetectionMethod[] = [];
		
		// Add methods in the order specified by user settings, but only if they're enabled
		for (const method of this.settings.detectionMethodOrder) {
			if (method === 'highlight-js' && this.settings.enableHighlightJs) {
				enabledMethods.push(method);
			} else if (method === 'pattern-matching' && this.settings.enablePatternMatching) {
				enabledMethods.push(method);
			}
		}
		
		// Set the final detection order (this respects the user's chosen order)
		this.languageDetectionEngine.setDetectionOrder(enabledMethods);
	}

	/**
	 * Loads history data into the history service
	 */
	private loadHistoryData(): void {
		if (this.settings.enableHistory && this.settings.historyData) {
			this.historyService.loadHistory(this.settings.historyData);
		}
	}

	/**
	 * Saves current history data to settings
	 */
	private async saveHistoryData(): Promise<void> {
		if (this.settings.enableHistory) {
			this.settings.historyData = this.historyService.getHistoryData();
			await this.saveData(this.settings);
		}
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
		if (this.languageDetectionEngine) {
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
