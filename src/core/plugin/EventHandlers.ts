import { Editor, MarkdownView, TFile } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../../main';

/**
 * Manages event handlers for the plugin
 */
export class EventHandlers {
	private plugin: AutoSyntaxHighlightPlugin;

	// Event handlers
	private editorChangeHandler: (editor: Editor, view: MarkdownView) => void;
	private fileOpenHandler: (file: TFile) => void;
	private fileSaveHandler: (file: TFile) => void;

	// Debounce timers
	private debounceTimer: number | null = null;
	private debounceAllFilesTimer: number | null = null;
	
	// Cleanup timer for undo ignore entries
	private cleanupTimer: number | null = null;

	constructor(plugin: AutoSyntaxHighlightPlugin) {
		this.plugin = plugin;
		this.initializeHandlers();
	}

	/**
	 * Initialize event handlers
	 */
	private initializeHandlers(): void {
		// Editor change handler (for auto-on-edit)
		this.editorChangeHandler = (editor: Editor, view: MarkdownView) => {
			if (this.plugin.settings.triggerBehavior === 'auto-on-edit') {
				if (this.plugin.settings.processingScope === 'current-note') {
					this.debounceProcessFile(view.file);
				} else {
					this.debounceProcessAllFiles();
				}
			}
		};

		// File open handler (for auto-on-open)
		this.fileOpenHandler = (file: TFile) => {
			if (this.plugin.settings.triggerBehavior === 'auto-on-open' && file.extension === 'md') {
				if (this.plugin.settings.processingScope === 'current-note') {
					window.setTimeout(() => this.plugin.processFile(file), 500); // Small delay to ensure file is loaded
				} else {
					window.setTimeout(() => this.plugin.processAllMarkdownFiles(), 500);
				}
			}
		};

		// File save handler (for auto-on-save)
		this.fileSaveHandler = (file: TFile) => {
			if (this.plugin.settings.triggerBehavior === 'auto-on-save' && file.extension === 'md') {
				if (this.plugin.settings.processingScope === 'current-note') {
					this.plugin.processFile(file);
				} else {
					this.plugin.processAllMarkdownFiles();
				}
			}
		};
	}

	/**
	 * Register all event handlers
	 */
	registerEventHandlers(): void {
		const editorChangeRef = this.plugin.app.workspace.on('editor-change', this.editorChangeHandler);
		const fileOpenRef = this.plugin.app.workspace.on('file-open', this.fileOpenHandler);
		const fileSaveRef = this.plugin.app.vault.on('modify', this.fileSaveHandler);
		
		this.plugin.registerEvent(editorChangeRef);
		this.plugin.registerEvent(fileOpenRef);
		this.plugin.registerEvent(fileSaveRef);
		
		// Start periodic cleanup of expired undo ignore entries
		this.startCleanupTimer();
	}

	/**
	 * Unregister all event handlers
	 */
	unregisterEventHandlers(): void {
		// Clear any pending timers
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		if (this.debounceAllFilesTimer) {
			window.clearTimeout(this.debounceAllFilesTimer);
			this.debounceAllFilesTimer = null;
		}
		if (this.cleanupTimer) {
			window.clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}
	}

	/**
	 * Debounced file processing for editor changes
	 */
	private debounceProcessFile(file: TFile | null): void {
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
		}
		
		this.debounceTimer = window.setTimeout(() => {
			this.plugin.processFile(file);
		}, 2000); // 2 second delay
	}

	/**
	 * Debounced processing for all files
	 */
	private debounceProcessAllFiles(): void {
		if (this.debounceAllFilesTimer) {
			window.clearTimeout(this.debounceAllFilesTimer);
		}
		
		this.debounceAllFilesTimer = window.setTimeout(() => {
			this.plugin.processAllMarkdownFiles();
		}, 5000); // 5 second delay for all files (longer to avoid too frequent processing)
	}

	/**
	 * Starts periodic cleanup of expired undo ignore entries
	 */
	private startCleanupTimer(): void {
		// Run cleanup every 30 seconds
		this.cleanupTimer = window.setInterval(() => {
			this.plugin.undoIgnoreService.cleanupExpiredEntries();
		}, 30000);
		
		// Register the interval with the plugin for proper cleanup
		this.plugin.registerInterval(this.cleanupTimer);
	}
}
