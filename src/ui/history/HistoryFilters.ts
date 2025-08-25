import { HistoryEntry } from '../../types';

/**
 * Filter types for history entries
 */
export type FilterType = 'all' | 'applied' | 'unapplied';
export type SortType = 'newest' | 'oldest' | 'confidence';

/**
 * Manages filtering and sorting operations for history entries
 */
export class HistoryFilters {
	private currentFilter: FilterType = 'all';
	private currentSort: SortType = 'newest';
	private searchTerm: string = '';

	/**
	 * Creates the filter controls UI
	 * @param container The container element
	 * @param onFilterChange Callback when filters change
	 */
	createFilterControls(
		container: HTMLElement, 
		onFilterChange: () => void
	): void {
		const controlsContainer = container.createDiv('history-controls');

		// Create search input
		this.createSearchInput(controlsContainer, onFilterChange);

		// Create filter and sort controls
		this.createFilterAndSortControls(controlsContainer, onFilterChange);

		// Create results count display
		const resultsCount = controlsContainer.createSpan('results-count');
		this.resultsCountElement = resultsCount;
	}

	/**
	 * Creates the search input
	 * @param container The container element
	 * @param onFilterChange Callback when search changes
	 */
	private createSearchInput(container: HTMLElement, onFilterChange: () => void): void {
		const searchContainer = container.createDiv('search-container');
		
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'Search by filename or language...',
		});
		
		searchInput.addEventListener('input', (e) => {
			this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
			onFilterChange();
		});
	}

	/**
	 * Creates the filter and sort dropdowns
	 * @param container The container element
	 * @param onFilterChange Callback when filters change
	 */
	private createFilterAndSortControls(container: HTMLElement, onFilterChange: () => void): void {
		const filtersContainer = container.createDiv('filters-container');

		// Filter dropdown
		const filterSelect = filtersContainer.createEl('select');
		
		filterSelect.createEl('option', { value: 'all', text: 'All entries' });
		filterSelect.createEl('option', { value: 'applied', text: 'Applied only' });
		filterSelect.createEl('option', { value: 'unapplied', text: 'Unapplied only' });
		
		filterSelect.value = this.currentFilter;
		
		filterSelect.addEventListener('change', (e) => {
			this.currentFilter = (e.target as HTMLSelectElement).value as FilterType;
			onFilterChange();
		});

		// Sort dropdown
		const sortSelect = filtersContainer.createEl('select');
		
		sortSelect.createEl('option', { value: 'newest', text: 'Newest first' });
		sortSelect.createEl('option', { value: 'oldest', text: 'Oldest first' });
		sortSelect.createEl('option', { value: 'confidence', text: 'By confidence' });
		
		sortSelect.value = this.currentSort;
		
		sortSelect.addEventListener('change', (e) => {
			this.currentSort = (e.target as HTMLSelectElement).value as SortType;
			onFilterChange();
		});
	}

	/**
	 * Applies filters and sorting to entries
	 * @param entries The entries to filter
	 * @returns Filtered and sorted entries
	 */
	applyFiltersAndSort(entries: HistoryEntry[]): HistoryEntry[] {
		let filtered = [...entries];

		// Apply status filter
		filtered = this.applyStatusFilter(filtered);

		// Apply search filter
		filtered = this.applySearchFilter(filtered);

		// Apply sort
		filtered = this.applySorting(filtered);

		return filtered;
	}

	/**
	 * Applies status filter to entries
	 * @param entries The entries to filter
	 * @returns Filtered entries
	 */
	private applyStatusFilter(entries: HistoryEntry[]): HistoryEntry[] {
		if (this.currentFilter === 'applied') {
			return entries.filter(entry => entry.applied);
		} else if (this.currentFilter === 'unapplied') {
			return entries.filter(entry => !entry.applied);
		}
		return entries;
	}

	/**
	 * Applies search filter to entries
	 * @param entries The entries to filter
	 * @returns Filtered entries
	 */
	private applySearchFilter(entries: HistoryEntry[]): HistoryEntry[] {
		if (!this.searchTerm) {
			return entries;
		}

		return entries.filter(entry =>
			entry.fileName.toLowerCase().includes(this.searchTerm) ||
			entry.detectedLanguage.toLowerCase().includes(this.searchTerm) ||
			entry.filePath.toLowerCase().includes(this.searchTerm) ||
			entry.method.toLowerCase().includes(this.searchTerm) ||
			entry.codeBlock.content.toLowerCase().includes(this.searchTerm)
		);
	}

	/**
	 * Applies sorting to entries
	 * @param entries The entries to sort
	 * @returns Sorted entries
	 */
	private applySorting(entries: HistoryEntry[]): HistoryEntry[] {
		const sorted = [...entries];

		switch (this.currentSort) {
			case 'newest':
				return sorted.sort((a, b) => b.timestamp - a.timestamp);
			case 'oldest':
				return sorted.sort((a, b) => a.timestamp - b.timestamp);
			case 'confidence':
				return sorted.sort((a, b) => b.confidence - a.confidence);
			default:
				return sorted;
		}
	}

	/**
	 * Updates the results count display
	 * @param filteredCount Number of filtered entries
	 * @param totalCount Total number of entries
	 */
	updateResultsCount(filteredCount: number, totalCount: number): void {
		if (this.resultsCountElement) {
			this.resultsCountElement.textContent = `${filteredCount} of ${totalCount} entries`;
		}
	}

	/**
	 * Gets current filter settings
	 * @returns Current filter settings
	 */
	getCurrentFilters(): {
		filter: FilterType;
		sort: SortType;
		search: string;
	} {
		return {
			filter: this.currentFilter,
			sort: this.currentSort,
			search: this.searchTerm
		};
	}

	/**
	 * Sets filter settings
	 * @param filter Filter type
	 * @param sort Sort type
	 * @param search Search term
	 */
	setFilters(filter: FilterType, sort: SortType, search: string): void {
		this.currentFilter = filter;
		this.currentSort = sort;
		this.searchTerm = search;
	}

	/**
	 * Resets filters to defaults
	 */
	resetFilters(): void {
		this.currentFilter = 'all';
		this.currentSort = 'newest';
		this.searchTerm = '';
	}

	/**
	 * Gets advanced filtering options
	 * @param entries The entries to analyze
	 * @returns Advanced filtering statistics
	 */
	getFilteringStats(entries: HistoryEntry[]): {
		totalEntries: number;
		appliedEntries: number;
		unappliedEntries: number;
		uniqueLanguages: string[];
		uniqueMethods: string[];
		dateRange: { earliest: Date; latest: Date } | null;
	} {
		if (entries.length === 0) {
			return {
				totalEntries: 0,
				appliedEntries: 0,
				unappliedEntries: 0,
				uniqueLanguages: [],
				uniqueMethods: [],
				dateRange: null
			};
		}

		const appliedEntries = entries.filter(e => e.applied).length;
		const uniqueLanguages = [...new Set(entries.map(e => e.detectedLanguage))];
		const uniqueMethods = [...new Set(entries.map(e => e.method))];
		
		const timestamps = entries.map(e => e.timestamp);
		const earliest = new Date(Math.min(...timestamps));
		const latest = new Date(Math.max(...timestamps));

		return {
			totalEntries: entries.length,
			appliedEntries,
			unappliedEntries: entries.length - appliedEntries,
			uniqueLanguages: uniqueLanguages.sort(),
			uniqueMethods: uniqueMethods.sort(),
			dateRange: { earliest, latest }
		};
	}

	private resultsCountElement: Element | null = null;
}
