import { Editor, MarkdownView, TFile, EventRef } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../../main';

/**
 * Manages event handlers for the plugin
 */
export class EventHandlers {
	private plugin: AutoSyntaxHighlightPlugin;
	private eventRefs: EventRef[] = [];

	// Event handlers
	private editorChangeHandler: (editor: Editor, view: MarkdownView) => void;
	private fileOpenHandler: (file: TFile) => void;
	private fileSaveHandler: (file: TFile) => void;

	// Debounce timers
	private debounceTimer: NodeJS.Timeout | null = null;
	private debounceAllFilesTimer: NodeJS.Timeout | null = null;

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
					setTimeout(() => this.plugin.processFile(file), 500); // Small delay to ensure file is loaded
				} else {
					setTimeout(() => this.plugin.processAllMarkdownFiles(), 500);
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
		
		this.eventRefs.push(editorChangeRef);
		this.eventRefs.push(fileOpenRef);
		this.eventRefs.push(fileSaveRef);
		
		this.plugin.registerEvent(editorChangeRef);
		this.plugin.registerEvent(fileOpenRef);
		this.plugin.registerEvent(fileSaveRef);
	}

	/**
	 * Unregister all event handlers
	 */
	unregisterEventHandlers(): void {
		this.eventRefs.forEach(ref => {
			this.plugin.app.workspace.offref(ref);
		});
		this.eventRefs = [];

		// Clear any pending timers
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		if (this.debounceAllFilesTimer) {
			clearTimeout(this.debounceAllFilesTimer);
			this.debounceAllFilesTimer = null;
		}
	}

	/**
	 * Debounced file processing for editor changes
	 */
	private debounceProcessFile(file: TFile | null): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		
		this.debounceTimer = setTimeout(() => {
			this.plugin.processFile(file);
		}, 2000); // 2 second delay
	}

	/**
	 * Debounced processing for all files
	 */
	private debounceProcessAllFiles(): void {
		if (this.debounceAllFilesTimer) {
			clearTimeout(this.debounceAllFilesTimer);
		}
		
		this.debounceAllFilesTimer = setTimeout(() => {
			this.plugin.processAllMarkdownFiles();
		}, 5000); // 5 second delay for all files (longer to avoid too frequent processing)
	}
}
