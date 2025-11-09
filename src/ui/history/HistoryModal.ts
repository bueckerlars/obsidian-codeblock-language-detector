import { App, Modal } from 'obsidian';
import { HistoryEntry } from '../../types';
import { HistoryService } from '../../services';
import AutoSyntaxHighlightPlugin from '../../../main';
import { HistoryFilters } from './HistoryFilters';
import { HistoryEntryRenderer } from './HistoryEntryRenderer';
import { HistoryActions } from './HistoryActions';

/**
 * Modal for viewing and managing language detection history
 * Refactored with modular components for better maintainability
 */
export class HistoryModal extends Modal {
	private plugin: AutoSyntaxHighlightPlugin;
	private historyService: HistoryService;
	private entries: HistoryEntry[] = [];
	private filteredEntries: HistoryEntry[] = [];

	// Components
	private filters: HistoryFilters;
	private renderer: HistoryEntryRenderer;
	private actions: HistoryActions;

	constructor(app: App, plugin: AutoSyntaxHighlightPlugin) {
		super(app);
		this.plugin = plugin;
		this.historyService = plugin.historyService;
		
		// Initialize components
		this.initializeComponents();
	}

	/**
	 * Initializes the modal components
	 */
	private initializeComponents(): void {
		this.filters = new HistoryFilters();
		
		this.renderer = new HistoryEntryRenderer(
			(entry) => this.handleToggleEntry(entry),
			(entry) => this.handleEditEntry(entry)
		);
		
		this.actions = new HistoryActions(this.app, this.plugin, this);
	}

	/**
	 * Called when the modal is opened
	 */
	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		
		// Add CSS class for wider modal
		this.modalEl.addClass('history-modal');

		// Load entries
		this.loadEntries();

		// Build the modal UI
		this.buildModalUI(contentEl);
	}

	/**
	 * Called when the modal is closed
	 */
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Builds the complete modal UI
	 * @param container The container element
	 */
	private buildModalUI(container: HTMLElement): void {
		// Modal title
		container.createEl('h2', { text: 'Language Detection History' });

		// Create filters and controls
		this.createFiltersSection(container);

		// Create entries list
		this.createEntriesSection(container);

		// Create action buttons
		this.createActionsSection(container);
	}

	/**
	 * Creates the filters section
	 * @param container The container element
	 */
	private createFiltersSection(container: HTMLElement): void {
		this.filters.createFilterControls(container, () => {
			this.applyFiltersAndRefresh();
		});
	}

	/**
	 * Creates the entries list section
	 * @param container The container element
	 */
	private createEntriesSection(container: HTMLElement): void {
		const listContainer = container.createDiv('aslh-history-entries-container');
		this.refreshEntriesList(listContainer);
	}

	/**
	 * Creates the actions section
	 * @param container The container element
	 */
	private createActionsSection(container: HTMLElement): void {
		this.actions.createActionButtons(container, () => {
			this.refreshModal();
		});
	}

	/**
	 * Loads entries from the history service
	 */
	private loadEntries(): void {
		this.entries = this.historyService.getEntries();
		this.applyFiltersAndRefresh();
	}

	/**
	 * Applies filters and refreshes the entries list
	 */
	private applyFiltersAndRefresh(): void {
		this.filteredEntries = this.filters.applyFiltersAndSort(this.entries);
		this.filters.updateResultsCount(this.filteredEntries.length, this.entries.length);
		
		// Refresh the entries list
		const container = this.contentEl.querySelector('.aslh-history-entries-container') as HTMLElement;
		if (container) {
			this.refreshEntriesList(container);
		}
	}

	/**
	 * Refreshes the entries list display
	 * @param container The entries container
	 */
	private refreshEntriesList(container: HTMLElement): void {
		this.renderer.renderEntries(container, this.filteredEntries);
	}

	/**
	 * Refreshes the entire modal
	 */
	private refreshModal(): void {
		this.loadEntries();
		
		// Update statistics display
		const statsElement = this.contentEl.querySelector('.aslh-stats');
		if (statsElement) {
			// Re-create the actions section to update statistics
			const actionsContainer = this.contentEl.querySelector('.aslh-modal-actions');
			if (actionsContainer) {
				actionsContainer.remove();
				this.createActionsSection(this.contentEl);
			}
		}
	}

	/**
	 * Handles toggling the status of an entry
	 * @param entry The entry to toggle
	 */
	private async handleToggleEntry(entry: HistoryEntry): Promise<void> {
		const success = await this.actions.toggleEntryStatus(entry);
		if (success) {
			this.refreshModal();
		}
	}

	/**
	 * Handles editing/navigating to an entry
	 * @param entry The entry to edit
	 */
	private async handleEditEntry(entry: HistoryEntry): Promise<void> {
		// Close the modal first to show the file
		this.close();
		
		// Navigate to the entry
		await this.actions.navigateToEntry(entry);
	}

	/**
	 * Gets current modal state for debugging/testing
	 * @returns Current modal state
	 */
	getModalState(): {
		totalEntries: number;
		filteredEntries: number;
		filters: ReturnType<HistoryFilters['getCurrentFilters']>;
		isOpen: boolean;
	} {
		return {
			totalEntries: this.entries.length,
			filteredEntries: this.filteredEntries.length,
			filters: this.filters.getCurrentFilters(),
			isOpen: this.modalEl.hasClass('is-visible')
		};
	}

	/**
	 * Sets filter state (useful for programmatic control)
	 * @param filter Filter type
	 * @param sort Sort type
	 * @param search Search term
	 */
	setFilters(filter: 'all' | 'applied' | 'unapplied', sort: 'newest' | 'oldest' | 'confidence', search: string): void {
		this.filters.setFilters(filter, sort, search);
		this.applyFiltersAndRefresh();
	}

	/**
	 * Resets all filters to defaults
	 */
	resetFilters(): void {
		this.filters.resetFilters();
		this.applyFiltersAndRefresh();
	}

	/**
	 * Gets filtering statistics for the current entries
	 * @returns Filtering statistics
	 */
	getFilteringStats() {
		return this.filters.getFilteringStats(this.entries);
	}

	/**
	 * Performs bulk operations on filtered entries
	 * @param operation The operation to perform
	 */
	async performBulkOperation(operation: 'apply' | 'undo' | 'delete'): Promise<void> {
		await this.actions.performBulkOperation(this.filteredEntries, operation, () => {
			this.refreshModal();
		});
	}

	/**
	 * Exports current filtered entries
	 * @returns JSON string of filtered entries
	 */
	exportFilteredEntries(): string {
		return JSON.stringify(this.filteredEntries, null, 2);
	}
}
