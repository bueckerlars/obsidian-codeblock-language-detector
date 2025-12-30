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
	 * @returns The number of detections applied
	 */
	async processFile(file: TFile | null): Promise<number> {
		if (!file || file.extension !== 'md') {
			return 0;
		}

		try {
			// Read file content to find code blocks and perform detection
			const content = await this.plugin.app.vault.read(file);
			const codeBlocks = this.plugin.codeAnalyzer.findCodeBlocksWithoutLanguage(content);
			
			if (codeBlocks.length === 0) {
				return 0; // No code blocks to process
			}

			const codeBlocksToProcess: Array<{ codeBlock: any; detectionResult: any }> = [];

			// Process each code block to detect languages
			for (const codeBlock of codeBlocks) {
				// Check if this code block should be ignored due to recent undo
				if (this.plugin.undoIgnoreService.shouldIgnoreDetection(file.path, codeBlock)) {
					console.log(`Skipping detection for code block at lines ${codeBlock.startLine}-${codeBlock.endLine} due to recent undo`);
					continue;
				}

				const detectionResult = await this.plugin.detectionEngine.detectLanguage(codeBlock.content);
				
				if (detectionResult) {
					codeBlocksToProcess.push({ codeBlock, detectionResult });
				}
			}

			// If no detections to apply, return early
			if (codeBlocksToProcess.length === 0) {
				return 0;
			}

			let detectionsApplied = 0;

			// Apply changes using vault.process with synchronous callback
			await this.plugin.app.vault.process(file, (data: string) => {
				// Check code blocks again in the callback to ensure we're working with current content
				const currentCodeBlocks = this.plugin.codeAnalyzer.findCodeBlocksWithoutLanguage(data);
				
				// If no code blocks found in current content, return original
				if (currentCodeBlocks.length === 0) {
					return data;
				}

				let updatedContent = data;
				
				// Apply language tags for detected code blocks
				// Match code blocks by content to handle potential file changes
				for (const { codeBlock, detectionResult } of codeBlocksToProcess) {
					// Find matching code block in current content
					const matchingBlock = currentCodeBlocks.find(
						cb => cb.content === codeBlock.content && 
						cb.startLine === codeBlock.startLine &&
						cb.endLine === codeBlock.endLine
					);
					
					if (!matchingBlock) {
						continue; // Skip if block no longer matches
					}

					try {
						// Apply the language tag
						updatedContent = this.plugin.syntaxApplier.applyLanguageTag(updatedContent, matchingBlock, detectionResult.language);
						
						// Add to history if enabled
						if (this.plugin.settings.enableHistory) {
							const historyEntry: Omit<HistoryEntry, 'id' | 'timestamp'> = {
								fileName: file.name,
								filePath: file.path,
								codeBlock: matchingBlock,
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
				
				return updatedContent;
			});
			
			if (detectionsApplied > 0 && this.plugin.settings.showNotifications) {
				new Notice(`Applied ${detectionsApplied} language tag(s) to ${file.name}`);
			}

			return detectionsApplied;
		} catch (error) {
			console.error('Error processing file:', error);
			new Notice(`Error processing ${file.name}: ${error.message}`);
			return 0;
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
				const detections = await this.processFile(file);
				if (detections > 0) {
					totalDetections += detections;
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

			// Add ignore entry BEFORE modifying the file to prevent re-detection
			this.plugin.undoIgnoreService.addIgnoreEntry(entry.filePath, entry.codeBlock);
			
			await this.plugin.app.vault.process(file, (data: string) => {
				return this.plugin.syntaxApplier.removeLanguageTag(data, entry.codeBlock);
			});
			
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

			await this.plugin.app.vault.process(file, (data: string) => {
				return this.plugin.syntaxApplier.applyLanguageTag(data, entry.codeBlock, entry.detectedLanguage);
			});
			
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
