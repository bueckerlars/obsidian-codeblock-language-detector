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
		controlsContainer.style.marginBottom = '16px';
		controlsContainer.style.padding = '12px';
		controlsContainer.style.backgroundColor = 'var(--background-secondary)';
		controlsContainer.style.borderRadius = '8px';

		// Search input
		const searchContainer = controlsContainer.createDiv();
		searchContainer.style.marginBottom = '12px';
		
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'Search by filename or language...',
		});
		searchInput.style.width = '100%';
		searchInput.style.padding = '8px';
		searchInput.style.border = '1px solid var(--background-modifier-border)';
		searchInput.style.borderRadius = '4px';
		searchInput.style.backgroundColor = 'var(--background-primary)';
		
		searchInput.addEventListener('input', (e) => {
			this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
			this.applyFilters();
			this.refreshEntriesList();
		});

		// Filter and sort controls
		const filtersContainer = controlsContainer.createDiv();
		filtersContainer.style.display = 'flex';
		filtersContainer.style.gap = '12px';
		filtersContainer.style.alignItems = 'center';

		// Filter dropdown
		const filterSelect = filtersContainer.createEl('select');
		filterSelect.style.padding = '6px';
		filterSelect.style.border = '1px solid var(--background-modifier-border)';
		filterSelect.style.borderRadius = '4px';
		filterSelect.style.backgroundColor = 'var(--background-primary)';
		
		filterSelect.innerHTML = `
			<option value="all">All entries</option>
			<option value="applied">Applied only</option>
			<option value="unapplied">Unapplied only</option>
		`;
		filterSelect.value = this.currentFilter;
		
		filterSelect.addEventListener('change', (e) => {
			this.currentFilter = (e.target as HTMLSelectElement).value as typeof this.currentFilter;
			this.applyFilters();
			this.refreshEntriesList();
		});

		// Sort dropdown
		const sortSelect = filtersContainer.createEl('select');
		sortSelect.style.padding = '6px';
		sortSelect.style.border = '1px solid var(--background-modifier-border)';
		sortSelect.style.borderRadius = '4px';
		sortSelect.style.backgroundColor = 'var(--background-primary)';
		
		sortSelect.innerHTML = `
			<option value="newest">Newest first</option>
			<option value="oldest">Oldest first</option>
			<option value="confidence">By confidence</option>
		`;
		sortSelect.value = this.currentSort;
		
		sortSelect.addEventListener('change', (e) => {
			this.currentSort = (e.target as HTMLSelectElement).value as typeof this.currentSort;
			this.applyFilters();
			this.refreshEntriesList();
		});

		// Results count
		const resultsCount = filtersContainer.createSpan();
		resultsCount.className = 'results-count';
		resultsCount.style.marginLeft = 'auto';
		resultsCount.style.color = 'var(--text-muted)';
		resultsCount.style.fontSize = '0.9em';
		
		this.updateResultsCount(resultsCount);
	}

	private createEntriesList(containerEl: HTMLElement): void {
		const listContainer = containerEl.createDiv('history-entries');
		listContainer.className = 'history-entries-container';
		listContainer.style.maxHeight = '400px';
		listContainer.style.overflowY = 'auto';
		listContainer.style.border = '1px solid var(--background-modifier-border)';
		listContainer.style.borderRadius = '8px';
		listContainer.style.marginBottom = '16px';

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
		const entryEl = container.createDiv('history-entry');
		entryEl.className = `history-entry ${entry.applied ? 'applied' : 'unapplied'}`;
		entryEl.style.padding = '12px';
		entryEl.style.borderBottom = '1px solid var(--background-modifier-border)';
		entryEl.style.backgroundColor = index % 2 === 0 ? 'var(--background-primary)' : 'var(--background-secondary)';

		// Entry header
		const headerEl = entryEl.createDiv('entry-header');
		headerEl.style.display = 'flex';
		headerEl.style.justifyContent = 'space-between';
		headerEl.style.alignItems = 'center';
		headerEl.style.marginBottom = '8px';

		// File info
		const fileInfoEl = headerEl.createDiv('file-info');
		const fileNameEl = fileInfoEl.createSpan('file-name');
		fileNameEl.textContent = entry.fileName;
		fileNameEl.style.fontWeight = 'bold';
		fileNameEl.style.fontSize = '1.1em';

		const filePathEl = fileInfoEl.createDiv('file-path');
		filePathEl.textContent = entry.filePath;
		filePathEl.style.fontSize = '0.8em';
		filePathEl.style.color = 'var(--text-muted)';

		// Status and timestamp
		const statusEl = headerEl.createDiv('entry-status');
		statusEl.style.textAlign = 'right';

		const statusBadge = statusEl.createSpan('status-badge');
		statusBadge.textContent = entry.applied ? 'Applied' : 'Unapplied';
		statusBadge.style.padding = '2px 8px';
		statusBadge.style.borderRadius = '4px';
		statusBadge.style.fontSize = '0.8em';
		statusBadge.style.fontWeight = 'bold';
		statusBadge.style.backgroundColor = entry.applied ? 'var(--color-green)' : 'var(--color-orange)';
		statusBadge.style.color = 'white';

		const timestampEl = statusEl.createDiv('timestamp');
		timestampEl.textContent = new Date(entry.timestamp).toLocaleString();
		timestampEl.style.fontSize = '0.8em';
		timestampEl.style.color = 'var(--text-muted)';
		timestampEl.style.marginTop = '4px';

		// Detection details
		const detailsEl = entryEl.createDiv('entry-details');
		detailsEl.style.display = 'flex';
		detailsEl.style.gap = '16px';
		detailsEl.style.marginBottom = '8px';
		detailsEl.style.fontSize = '0.9em';

		const languageEl = detailsEl.createSpan('detected-language');
		languageEl.innerHTML = `<strong>Language:</strong> ${entry.detectedLanguage}`;

		const confidenceEl = detailsEl.createSpan('confidence');
		confidenceEl.innerHTML = `<strong>Confidence:</strong> ${entry.confidence}%`;

		const methodEl = detailsEl.createSpan('method');
		methodEl.innerHTML = `<strong>Method:</strong> ${entry.method}`;

		// Code preview
		const codePreviewEl = entryEl.createDiv('code-preview');
		codePreviewEl.style.backgroundColor = 'var(--background-primary-alt)';
		codePreviewEl.style.border = '1px solid var(--background-modifier-border)';
		codePreviewEl.style.borderRadius = '4px';
		codePreviewEl.style.padding = '8px';
		codePreviewEl.style.fontSize = '0.85em';
		codePreviewEl.style.fontFamily = 'var(--font-monospace)';
		codePreviewEl.style.maxHeight = '100px';
		codePreviewEl.style.overflowY = 'auto';
		codePreviewEl.style.marginBottom = '8px';

		const truncatedCode = entry.codeBlock.content.length > 200 
			? entry.codeBlock.content.substring(0, 200) + '...'
			: entry.codeBlock.content;
		codePreviewEl.textContent = truncatedCode;

		// Action buttons
		const actionsEl = entryEl.createDiv('entry-actions');
		actionsEl.style.display = 'flex';
		actionsEl.style.gap = '8px';
		actionsEl.style.justifyContent = 'flex-end';

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
		const entryEl = container.createDiv('history-entry empty-entry');
		entryEl.style.padding = '12px';
		entryEl.style.borderBottom = '1px solid var(--background-modifier-border)';
		entryEl.style.backgroundColor = 'var(--background-primary)';
		entryEl.style.opacity = '0.7';

		// Entry header
		const headerEl = entryEl.createDiv('entry-header');
		headerEl.style.display = 'flex';
		headerEl.style.justifyContent = 'space-between';
		headerEl.style.alignItems = 'center';
		headerEl.style.marginBottom = '8px';

		// File info
		const fileInfoEl = headerEl.createDiv('file-info');
		const fileNameEl = fileInfoEl.createSpan('file-name');
		fileNameEl.textContent = 'Keine Einträge gefunden';
		fileNameEl.style.fontWeight = 'bold';
		fileNameEl.style.fontSize = '1.1em';
		fileNameEl.style.color = 'var(--text-muted)';

		const filePathEl = fileInfoEl.createDiv('file-path');
		filePathEl.textContent = 'Es wurden noch keine Spracherkennung-Operationen durchgeführt';
		filePathEl.style.fontSize = '0.8em';
		filePathEl.style.color = 'var(--text-muted)';

		// Status placeholder
		const statusEl = headerEl.createDiv('entry-status');
		statusEl.style.textAlign = 'right';

		const statusBadge = statusEl.createSpan('status-badge');
		statusBadge.textContent = '-';
		statusBadge.style.padding = '2px 8px';
		statusBadge.style.borderRadius = '4px';
		statusBadge.style.fontSize = '0.8em';
		statusBadge.style.fontWeight = 'bold';
		statusBadge.style.backgroundColor = 'var(--background-modifier-border)';
		statusBadge.style.color = 'var(--text-muted)';

		// Detection details
		const detailsEl = entryEl.createDiv('entry-details');
		detailsEl.style.display = 'flex';
		detailsEl.style.flexDirection = 'column';
		detailsEl.style.gap = '4px';
		detailsEl.style.marginBottom = '8px';
		detailsEl.style.fontSize = '0.9em';

		const languageEl = detailsEl.createSpan('detected-language');
		languageEl.innerHTML = `<strong>Language:</strong> -`;
		languageEl.style.color = 'var(--text-muted)';

		const confidenceEl = detailsEl.createSpan('confidence');
		confidenceEl.innerHTML = `<strong>Confidence:</strong> -`;
		confidenceEl.style.color = 'var(--text-muted)';

		const methodEl = detailsEl.createSpan('method');
		methodEl.innerHTML = `<strong>Method:</strong> -`;
		methodEl.style.color = 'var(--text-muted)';

		// Code preview
		const codePreviewEl = entryEl.createDiv('code-preview');
		codePreviewEl.style.backgroundColor = 'var(--background-primary-alt)';
		codePreviewEl.style.border = '1px solid var(--background-modifier-border)';
		codePreviewEl.style.borderRadius = '4px';
		codePreviewEl.style.padding = '8px';
		codePreviewEl.style.fontSize = '0.85em';
		codePreviewEl.style.fontFamily = 'var(--font-monospace)';
		codePreviewEl.style.maxHeight = '100px';
		codePreviewEl.style.overflowY = 'auto';
		codePreviewEl.style.marginBottom = '8px';
		codePreviewEl.style.color = 'var(--text-muted)';
		codePreviewEl.textContent = '// Hier wird eine Vorschau des erkannten Codes angezeigt';

		// Action buttons placeholder
		const actionsEl = entryEl.createDiv('entry-actions');
		actionsEl.style.display = 'flex';
		actionsEl.style.flexDirection = 'column';
		actionsEl.style.gap = '8px';
		actionsEl.style.justifyContent = 'flex-end';
		actionsEl.style.alignItems = 'flex-end';
		actionsEl.style.width = '100px';

		// Disabled placeholder buttons
		const undoButton = new ButtonComponent(actionsEl);
		undoButton.setButtonText('-');
		undoButton.setDisabled(true);

		const editButton = new ButtonComponent(actionsEl);
		editButton.setButtonText('-');
		editButton.setDisabled(true);
	}

	private createActionButtons(containerEl: HTMLElement): void {
		const actionsContainer = containerEl.createDiv('modal-actions');
		actionsContainer.style.display = 'flex';
		actionsContainer.style.justifyContent = 'space-between';
		actionsContainer.style.alignItems = 'center';
		actionsContainer.style.paddingTop = '16px';
		actionsContainer.style.borderTop = '1px solid var(--background-modifier-border)';

		// Statistics
		const stats = this.historyService.getStatistics();
		const statsEl = actionsContainer.createDiv('stats');
		statsEl.style.fontSize = '0.9em';
		statsEl.style.color = 'var(--text-muted)';
		statsEl.innerHTML = `
			<div>Total: ${stats.totalEntries} | Applied: ${stats.appliedEntries} | Avg Confidence: ${stats.avgConfidence}%</div>
		`;

		// Action buttons
		const buttonsContainer = actionsContainer.createDiv();
		buttonsContainer.style.display = 'flex';
		buttonsContainer.style.gap = '8px';

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
