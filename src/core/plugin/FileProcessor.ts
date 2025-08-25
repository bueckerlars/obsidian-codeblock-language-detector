import { TFile, Notice, MarkdownView } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../../main';
import { HistoryEntry } from '../../types';

/**
 * Handles file processing operations
 */
export class FileProcessor {
	private plugin: AutoSyntaxHighlightPlugin;

	constructor(plugin: AutoSyntaxHighlightPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Process based on the configured scope setting
	 */
	async processBasedOnScope(): Promise<void> {
		if (this.plugin.settings.processingScope === 'current-note') {
			await this.processCurrentFile();
		} else {
			await this.processAllMarkdownFiles();
		}
	}

	/**
	 * Process the currently active file
	 */
	async processCurrentFile(): Promise<void> {
		const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
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
			const content = await this.plugin.app.vault.read(file);
			
			// Find code blocks without language tags
			const codeBlocks = this.plugin.codeAnalyzer.findCodeBlocksWithoutLanguage(content);
			
			if (codeBlocks.length === 0) {
				return; // No code blocks to process
			}

			let updatedContent = content;
			let detectionsApplied = 0;

			// Process each code block
			for (const codeBlock of codeBlocks) {
				// Check if this code block should be ignored due to recent undo
				if (this.plugin.undoIgnoreService.shouldIgnoreDetection(file.path, codeBlock)) {
					console.log(`Skipping detection for code block at lines ${codeBlock.startLine}-${codeBlock.endLine} due to recent undo`);
					continue;
				}

				const detectionResult = await this.plugin.detectionEngine.detectLanguage(codeBlock.content);
				
				if (detectionResult) {
					try {
						// Apply the language tag
						updatedContent = this.plugin.syntaxApplier.applyLanguageTag(updatedContent, codeBlock, detectionResult.language);
						
						// Add to history if enabled
						if (this.plugin.settings.enableHistory) {
							const historyEntry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
								fileName: file.name,
								filePath: file.path,
								codeBlock,
								detectedLanguage: detectionResult.language,
								confidence: detectionResult.confidence,
								method: detectionResult.method,
								applied: true
							};
							
							this.plugin.historyService.addEntry(historyEntry);
						}
						
						detectionsApplied++;
					} catch (error) {
						console.error('Error applying language tag:', error);
					}
				}
			}

			// Write updated content back to file if changes were made
			if (detectionsApplied > 0) {
				await this.plugin.app.vault.modify(file, updatedContent);
				
				if (this.plugin.settings.showNotifications) {
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
		const markdownFiles = this.plugin.app.vault.getMarkdownFiles();
		let totalDetections = 0;
		let filesProcessed = 0;

		const notice = new Notice('Processing all markdown files...', 0);

		try {
			for (const file of markdownFiles) {
				const content = await this.plugin.app.vault.read(file);
				const codeBlocks = this.plugin.codeAnalyzer.findCodeBlocksWithoutLanguage(content);
				
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
	 * Undo a language application from history
	 */
	async undoLanguageApplication(entry: HistoryEntry): Promise<boolean> {
		try {
			const file = this.plugin.app.vault.getAbstractFileByPath(entry.filePath);
			if (!(file instanceof TFile)) {
				return false;
			}

			const content = await this.plugin.app.vault.read(file);
			const updatedContent = this.plugin.syntaxApplier.removeLanguageTag(content, entry.codeBlock);
			
			// Add ignore entry BEFORE modifying the file to prevent re-detection
			this.plugin.undoIgnoreService.addIgnoreEntry(entry.filePath, entry.codeBlock);
			
			await this.plugin.app.vault.modify(file, updatedContent);
			
			if (this.plugin.settings.showNotifications) {
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
			const file = this.plugin.app.vault.getAbstractFileByPath(entry.filePath);
			if (!(file instanceof TFile)) {
				return false;
			}

			const content = await this.plugin.app.vault.read(file);
			const updatedContent = this.plugin.syntaxApplier.applyLanguageTag(content, entry.codeBlock, entry.detectedLanguage);
			
			await this.plugin.app.vault.modify(file, updatedContent);
			
			if (this.plugin.settings.showNotifications) {
				new Notice(`Reapplied language tag to ${entry.fileName}`);
			}
			
			return true;
		} catch (error) {
			console.error('Error reapplying language detection:', error);
			new Notice(`Error reapplying change: ${error.message}`);
			return false;
		}
	}
}
