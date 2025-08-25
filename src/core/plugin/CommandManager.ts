import { Editor, MarkdownView, Notice } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../../main';
import { HistoryModal, StatisticsModal } from '../../ui';

/**
 * Manages plugin commands
 */
export class CommandManager {
	private plugin: AutoSyntaxHighlightPlugin;

	constructor(plugin: AutoSyntaxHighlightPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Register all plugin commands
	 */
	registerCommands(): void {
		// Manual detection command
		this.plugin.addCommand({
			id: 'detect-languages-manual',
			name: 'Detect and apply language tags',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.plugin.processBasedOnScope();
			}
		});

		// Process current file command
		this.plugin.addCommand({
			id: 'process-current-file',
			name: 'Process current file only',
			checkCallback: (checking: boolean) => {
				const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.plugin.processFile(markdownView.file);
					}
					return true;
				}
				return false;
			}
		});

		// Open history modal command
		this.plugin.addCommand({
			id: 'open-history-modal',
			name: 'Open detection history',
			callback: () => {
				new HistoryModal(this.plugin.app, this.plugin).open();
			}
		});

		// Process all markdown files command
		this.plugin.addCommand({
			id: 'process-all-files',
			name: 'Process all markdown files',
			callback: () => {
				this.plugin.processAllMarkdownFiles();
			}
		});

		// Clear history command
		this.plugin.addCommand({
			id: 'clear-history',
			name: 'Clear detection history',
			callback: () => {
				if (confirm('Are you sure you want to clear all detection history?')) {
					this.plugin.historyService.clearHistory();
					new Notice('Detection history cleared');
				}
			}
		});

		// Open statistics modal command
		this.plugin.addCommand({
			id: 'open-statistics-modal',
			name: 'Show detection statistics',
			callback: () => {
				new StatisticsModal(this.plugin.app, this.plugin).open();
			}
		});
	}
}
