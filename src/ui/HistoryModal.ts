import { App, Modal, Setting, ButtonComponent, Notice, TFile, MarkdownView } from 'obsidian';
import { HistoryEntry } from '../types';
import { HistoryService } from '../services';
import AutoSyntaxHighlightPlugin from '../../main';

/**
 * Modal for viewing and managing language detection history
 */
export class HistoryModal extends Modal {
	private plugin: AutoSyntaxHighlightPlugin;
	private historyService: HistoryService;
	private entries: HistoryEntry[] = [];
	private filteredEntries: HistoryEntry[] = [];
	private currentFilter: 'all' | 'applied' | 'unapplied' = 'all';
	private currentSort: 'newest' | 'oldest' | 'confidence' = 'newest';
	private searchTerm: string = '';

	constructor(app: App, plugin: AutoSyntaxHighlightPlugin) {
		super(app);
		this.plugin = plugin;
		this.historyService = plugin.historyService;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		
		// Add CSS class for wider modal
		this.modalEl.addClass('history-modal');

		// Load entries
		this.loadEntries();

		// Modal title
		contentEl.createEl('h2', { text: 'Language Detection History' });

		// Create filters and controls
		this.createControls(contentEl);

		// Create entries list
		this.createEntriesList(contentEl);

		// Create action buttons
		this.createActionButtons(contentEl);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	private loadEntries(): void {
		this.entries = this.historyService.getEntries();
		this.applyFilters();
	}

	private createControls(containerEl: HTMLElement): void {
		const controlsContainer = containerEl.createDiv('history-controls');

		// Search input
		const searchContainer = controlsContainer.createDiv('search-container');
		
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'Search by filename or language...',
		});
		
		searchInput.addEventListener('input', (e) => {
			this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
			this.applyFilters();
			this.refreshEntriesList();
		});

		// Filter and sort controls
		const filtersContainer = controlsContainer.createDiv('filters-container');

		// Filter dropdown
		const filterSelect = filtersContainer.createEl('select');
		
		// Create filter options without innerHTML
		const allOption = filterSelect.createEl('option', { value: 'all', text: 'All entries' });
		const appliedOption = filterSelect.createEl('option', { value: 'applied', text: 'Applied only' });
		const unappliedOption = filterSelect.createEl('option', { value: 'unapplied', text: 'Unapplied only' });
		
		filterSelect.value = this.currentFilter;
		
		filterSelect.addEventListener('change', (e) => {
			this.currentFilter = (e.target as HTMLSelectElement).value as typeof this.currentFilter;
			this.applyFilters();
			this.refreshEntriesList();
		});

		// Sort dropdown
		const sortSelect = filtersContainer.createEl('select');
		
		// Create sort options without innerHTML
		const newestOption = sortSelect.createEl('option', { value: 'newest', text: 'Newest first' });
		const oldestOption = sortSelect.createEl('option', { value: 'oldest', text: 'Oldest first' });
		const confidenceOption = sortSelect.createEl('option', { value: 'confidence', text: 'By confidence' });
		
		sortSelect.value = this.currentSort;
		
		sortSelect.addEventListener('change', (e) => {
			this.currentSort = (e.target as HTMLSelectElement).value as typeof this.currentSort;
			this.applyFilters();
			this.refreshEntriesList();
		});

		// Results count
		const resultsCount = filtersContainer.createSpan('results-count');
		
		this.updateResultsCount(resultsCount);
	}

	private createEntriesList(containerEl: HTMLElement): void {
		const listContainer = containerEl.createDiv('history-entries-container');

		this.refreshEntriesList();
	}

	private refreshEntriesList(): void {
		const container = this.contentEl.querySelector('.history-entries-container') as HTMLElement;
		if (!container) return;

		container.empty();

		if (this.filteredEntries.length === 0) {
			this.createEmptyStateEntry(container);
			return;
		}

		this.filteredEntries.forEach((entry, index) => {
			this.createEntryElement(container, entry, index);
		});

		// Update results count
		const resultsCount = this.contentEl.querySelector('.results-count');
		if (resultsCount) {
			this.updateResultsCount(resultsCount);
		}
	}

	private createEntryElement(container: HTMLElement, entry: HistoryEntry, index: number): void {
		const entryEl = container.createDiv(`history-entry ${entry.applied ? 'applied' : 'unapplied'}`);

		// Entry header
		const headerEl = entryEl.createDiv('entry-header');

		// File info
		const fileInfoEl = headerEl.createDiv('file-info');
		const fileNameEl = fileInfoEl.createSpan('file-name');
		fileNameEl.textContent = entry.fileName;

		const filePathEl = fileInfoEl.createDiv('file-path');
		filePathEl.textContent = entry.filePath;

		// Status and timestamp
		const statusEl = headerEl.createDiv('entry-status');

		const statusBadge = statusEl.createSpan(`status-badge ${entry.applied ? 'applied' : 'unapplied'}`);
		statusBadge.textContent = entry.applied ? 'Applied' : 'Unapplied';

		const timestampEl = statusEl.createDiv('timestamp');
		timestampEl.textContent = new Date(entry.timestamp).toLocaleString();

		// Detection details - Use DOM API instead of innerHTML
		const detailsEl = entryEl.createDiv('entry-details');

		const languageEl = detailsEl.createSpan('detected-language');
		const languageLabel = languageEl.createEl('strong');
		languageLabel.textContent = 'Language:';
		languageEl.appendText(` ${entry.detectedLanguage}`);

		const confidenceEl = detailsEl.createSpan('confidence');
		const confidenceLabel = confidenceEl.createEl('strong');
		confidenceLabel.textContent = 'Confidence:';
		confidenceEl.appendText(` ${entry.confidence}%`);

		const methodEl = detailsEl.createSpan('method');
		const methodLabel = methodEl.createEl('strong');
		methodLabel.textContent = 'Method:';
		methodEl.appendText(` ${entry.method}`);

		// Code preview
		const codePreviewEl = entryEl.createDiv('code-preview');

		const truncatedCode = entry.codeBlock.content.length > 200 
			? entry.codeBlock.content.substring(0, 200) + '...'
			: entry.codeBlock.content;
		codePreviewEl.textContent = truncatedCode;

		// Action buttons
		const actionsEl = entryEl.createDiv('entry-actions');

		// Undo/Redo button
		const toggleButton = new ButtonComponent(actionsEl);
		toggleButton.setButtonText(entry.applied ? 'Undo' : 'Reapply');
		toggleButton.setClass(entry.applied ? 'mod-warning' : 'mod-cta');
		toggleButton.onClick(async () => {
			await this.toggleEntryStatus(entry);
		});

		// Edit language button
		const editButton = new ButtonComponent(actionsEl);
		editButton.setButtonText('Edit');
		editButton.onClick(() => {
			this.editEntry(entry);
		});

		// Delete button removed as requested
	}

	private createEmptyStateEntry(container: HTMLElement): void {
		const emptyMessageEl = container.createDiv('empty-state-message');

		const messageText = emptyMessageEl.createDiv('message-text');
		messageText.textContent = 'No entries yet';

		const subText = emptyMessageEl.createDiv('sub-text');
		subText.textContent = 'No language detection operations have been performed yet.';
	}

	private createActionButtons(containerEl: HTMLElement): void {
		const actionsContainer = containerEl.createDiv('modal-actions');

		// Statistics - Use DOM API instead of innerHTML
		const stats = this.historyService.getStatistics();
		const statsEl = actionsContainer.createDiv('stats');
		const statsDiv = statsEl.createDiv();
		statsDiv.textContent = `Total: ${stats.totalEntries} | Applied: ${stats.appliedEntries} | Avg Confidence: ${stats.avgConfidence}%`;

		// Action buttons
		const buttonsContainer = actionsContainer.createDiv('buttons-container');

		// Export history button
		const exportButton = new ButtonComponent(buttonsContainer);
		exportButton.setButtonText('Export History');
		exportButton.onClick(() => {
			this.exportHistory();
		});

		// Clear all button
		const clearButton = new ButtonComponent(buttonsContainer);
		clearButton.setButtonText('Clear All');
		clearButton.setClass('mod-warning');
		clearButton.onClick(() => {
			this.clearAllHistory();
		});

		// Close button
		const closeButton = new ButtonComponent(buttonsContainer);
		closeButton.setButtonText('Close');
		closeButton.setClass('mod-cta');
		closeButton.onClick(() => {
			this.close();
		});
	}

	private applyFilters(): void {
		let filtered = [...this.entries];

		// Apply status filter
		if (this.currentFilter === 'applied') {
			filtered = filtered.filter(entry => entry.applied);
		} else if (this.currentFilter === 'unapplied') {
			filtered = filtered.filter(entry => !entry.applied);
		}

		// Apply search filter
		if (this.searchTerm) {
			filtered = filtered.filter(entry =>
				entry.fileName.toLowerCase().includes(this.searchTerm) ||
				entry.detectedLanguage.toLowerCase().includes(this.searchTerm) ||
				entry.filePath.toLowerCase().includes(this.searchTerm)
			);
		}

		// Apply sort
		if (this.currentSort === 'newest') {
			filtered.sort((a, b) => b.timestamp - a.timestamp);
		} else if (this.currentSort === 'oldest') {
			filtered.sort((a, b) => a.timestamp - b.timestamp);
		} else if (this.currentSort === 'confidence') {
			filtered.sort((a, b) => b.confidence - a.confidence);
		}

		this.filteredEntries = filtered;
	}

	private updateResultsCount(element: Element): void {
		element.textContent = `${this.filteredEntries.length} of ${this.entries.length} entries`;
	}

	private async toggleEntryStatus(entry: HistoryEntry): Promise<void> {
		if (entry.applied) {
			// Undo the entry
			const success = await this.plugin.undoLanguageApplication(entry);
			if (success) {
				this.historyService.undoEntry(entry.id);
			}
		} else {
			// Reapply the entry
			const success = await this.plugin.reapplyLanguageDetection(entry);
			if (success) {
				this.historyService.reapplyEntry(entry.id);
			}
		}
		
		this.loadEntries();
		this.refreshEntriesList();
	}

	private async editEntry(entry: HistoryEntry): Promise<void> {
		// Close the modal first
		this.close();
		
		// Try to navigate to the file and codeblock
		try {
			// Get the file from the vault
			const file = this.app.vault.getAbstractFileByPath(entry.filePath);
			
			if (!file || !(file instanceof TFile)) {
				// If file not found, show a notice
				new Notice(`Datei nicht gefunden: ${entry.filePath}`);
				return;
			}
			
			// Open the file
			const leaf = this.app.workspace.getLeaf();
			await leaf.openFile(file);
			
			// Wait a bit for the file to load
			setTimeout(() => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view && view.editor) {
					const editor = view.editor;
					const content = editor.getValue();
					
					// Find the codeblock in the content
					const codeBlockStart = content.indexOf(entry.codeBlock.content);
					if (codeBlockStart !== -1) {
						// Calculate line number
						const beforeCodeBlock = content.substring(0, codeBlockStart);
						const lineNumber = beforeCodeBlock.split('\n').length - 1;
						
						// Jump to the line
						editor.setCursor(lineNumber, 0);
						editor.scrollIntoView({ from: { line: lineNumber, ch: 0 }, to: { line: lineNumber, ch: 0 } }, true);
						
						// Focus the editor
						editor.focus();
						
						new Notice(`Zu Codeblock in ${entry.fileName} gesprungen`);
					} else {
						new Notice(`Codeblock in ${entry.fileName} nicht gefunden`);
					}
				} else {
					new Notice(`Editor für ${entry.fileName} nicht verfügbar`);
				}
			}, 100);
			
		} catch (error) {
			console.error('Error navigating to code block:', error);
			new Notice(`Fehler beim Öffnen der Datei: ${entry.fileName}`);
		}
	}

	private deleteEntry(entry: HistoryEntry): void {
		if (confirm(`Delete history entry for ${entry.fileName}?`)) {
			this.historyService.removeEntry(entry.id);
			this.loadEntries();
			this.refreshEntriesList();
		}
	}

	private exportHistory(): void {
		const historyJson = this.historyService.exportHistory();
		navigator.clipboard.writeText(historyJson).then(() => {
			// You might want to show a toast notification here
			console.log('History exported to clipboard');
		});
	}

	private clearAllHistory(): void {
		if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
			this.historyService.clearHistory();
			this.loadEntries();
			this.refreshEntriesList();
		}
	}
}
