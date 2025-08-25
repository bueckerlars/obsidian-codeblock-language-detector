import { HistoryEntry, IHistoryService } from '../../types';
import { HistoryStorage } from './HistoryStorage';
import { HistoryEntryManager } from './HistoryEntryManager';
import { HistoryStatistics } from './HistoryStatistics';
import { HistoryValidation } from './HistoryValidation';

/**
 * Main service for managing history of language detection and application operations
 * Coordinates between different history management components
 */
export class HistoryService implements IHistoryService {
	private storage: HistoryStorage;
	private entryManager: HistoryEntryManager;
	private statistics: HistoryStatistics;
	private listeners: Array<(entries: HistoryEntry[]) => void> = [];

	constructor(maxEntries: number = 100) {
		this.storage = new HistoryStorage();
		this.entryManager = new HistoryEntryManager(maxEntries);
		this.statistics = new HistoryStatistics();
	}

	/**
	 * Sets the callback function to save history data persistently
	 * @param saveCallback Function that saves the history data
	 */
	setSaveCallback(saveCallback: () => Promise<void>): void {
		this.storage.setSaveCallback(saveCallback);
	}

	/**
	 * Loads history entries from persistent storage
	 * @param historyData The history data to load
	 */
	loadHistory(historyData: HistoryEntry[]): void {
		const validatedData = this.storage.validateAndFilterHistoryData(historyData);
		this.entryManager.loadEntries(validatedData);
		this.notifyListeners();
	}

	/**
	 * Gets history data for persistent storage
	 * @returns Array of history entries
	 */
	getHistoryData(): HistoryEntry[] {
		return this.entryManager.getAllEntries();
	}

	/**
	 * Adds a new entry to the history
	 * @param entry The history entry data (without id and timestamp)
	 * @returns The ID of the created entry
	 */
	addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): string {
		const historyEntry = this.entryManager.addEntry(entry);
		
		// Notify listeners
		this.notifyListeners();
		
		// Save to persistent storage
		this.saveHistory();

		return historyEntry.id;
	}

	/**
	 * Gets all history entries sorted by timestamp (newest first)
	 * @returns Array of history entries
	 */
	getEntries(): HistoryEntry[] {
		return this.entryManager.getAllEntries();
	}

	/**
	 * Gets entries filtered by file path
	 * @param filePath The file path to filter by
	 * @returns Array of history entries for the specified file
	 */
	getEntriesForFile(filePath: string): HistoryEntry[] {
		return this.entryManager.getEntriesForFile(filePath);
	}

	/**
	 * Gets entries filtered by detection method
	 * @param method The detection method to filter by
	 * @returns Array of history entries for the specified method
	 */
	getEntriesByMethod(method: string): HistoryEntry[] {
		return this.entryManager.getEntriesByMethod(method);
	}

	/**
	 * Gets entries within a specific time range
	 * @param startTime Start timestamp
	 * @param endTime End timestamp
	 * @returns Array of history entries within the time range
	 */
	getEntriesInTimeRange(startTime: number, endTime: number): HistoryEntry[] {
		return this.entryManager.getEntriesInTimeRange(startTime, endTime);
	}

	/**
	 * Removes a specific entry from history
	 * @param id The ID of the entry to remove
	 * @returns True if the entry was removed, false if not found
	 */
	removeEntry(id: string): boolean {
		const removed = this.entryManager.removeEntry(id);
		
		if (removed) {
			this.notifyListeners();
			this.saveHistory();
		}
		
		return removed;
	}

	/**
	 * Removes all entries for a specific file
	 * @param filePath The file path to remove entries for
	 * @returns Number of entries removed
	 */
	removeEntriesForFile(filePath: string): number {
		const removedCount = this.entryManager.removeEntriesForFile(filePath);
		
		if (removedCount > 0) {
			this.notifyListeners();
			this.saveHistory();
		}
		
		return removedCount;
	}

	/**
	 * Clears all history entries
	 */
	clearHistory(): void {
		this.entryManager.clearAllEntries();
		this.notifyListeners();
		this.saveHistory();
	}

	/**
	 * Undoes a specific entry by marking it as not applied
	 * @param id The ID of the entry to undo
	 * @returns True if the entry was found and undone, false otherwise
	 */
	undoEntry(id: string): boolean {
		const success = this.entryManager.undoEntry(id);
		
		if (success) {
			this.notifyListeners();
			this.saveHistory();
		}
		
		return success;
	}

	/**
	 * Reapplies a specific entry by marking it as applied
	 * @param id The ID of the entry to reapply
	 * @returns True if the entry was found and reapplied, false otherwise
	 */
	reapplyEntry(id: string): boolean {
		const success = this.entryManager.reapplyEntry(id);
		
		if (success) {
			this.notifyListeners();
			this.saveHistory();
		}
		
		return success;
	}

	/**
	 * Gets a specific entry by ID
	 * @param id The ID of the entry to retrieve
	 * @returns The history entry or null if not found
	 */
	getEntryById(id: string): HistoryEntry | null {
		return this.entryManager.getEntryById(id);
	}

	/**
	 * Updates an existing entry
	 * @param id The ID of the entry to update
	 * @param updates Partial updates to apply
	 * @returns True if the entry was updated, false if not found
	 */
	updateEntry(id: string, updates: Partial<Omit<HistoryEntry, 'id' | 'timestamp'>>): boolean {
		const success = this.entryManager.updateEntry(id, updates);
		
		if (success) {
			this.notifyListeners();
			this.saveHistory();
		}
		
		return success;
	}

	/**
	 * Gets statistics about the history
	 * @returns Object containing various statistics
	 */
	getStatistics(): {
		totalEntries: number;
		appliedEntries: number;
		methodCounts: Record<string, number>;
		languageCounts: Record<string, number>;
		avgConfidence: number;
	} {
		const entries = this.entryManager.getAllEntries();
		return this.statistics.getStatistics(entries);
	}

	/**
	 * Gets detailed statistics with advanced analytics
	 * @returns Extended statistics object
	 */
	getDetailedStatistics(): {
		basic: ReturnType<HistoryStatistics['getStatistics']>;
		methods: ReturnType<HistoryStatistics['getMethodStatistics']>;
		languages: ReturnType<HistoryStatistics['getLanguageStatistics']>;
		confidenceDistribution: ReturnType<HistoryStatistics['getConfidenceDistribution']>;
		trends: ReturnType<HistoryStatistics['getPerformanceTrends']>;
	} {
		const entries = this.entryManager.getAllEntries();
		
		return {
			basic: this.statistics.getStatistics(entries),
			methods: this.statistics.getMethodStatistics(entries),
			languages: this.statistics.getLanguageStatistics(entries),
			confidenceDistribution: this.statistics.getConfidenceDistribution(entries),
			trends: this.statistics.getPerformanceTrends(entries)
		};
	}

	/**
	 * Exports history to JSON
	 * @returns JSON string representation of the history
	 */
	exportHistory(): string {
		const entries = this.entryManager.getAllEntries();
		return this.storage.exportHistory(entries);
	}

	/**
	 * Imports history from JSON
	 * @param jsonData JSON string containing history data
	 * @param replace Whether to replace existing history or merge
	 * @returns Number of entries imported
	 */
	importHistory(jsonData: string, replace: boolean = false): number {
		const importedEntries = this.storage.importHistory(jsonData);
		
		if (replace) {
			this.entryManager.clearAllEntries();
		}

		const importedCount = this.entryManager.importEntries(importedEntries);
		
		this.notifyListeners();
		this.saveHistory();
		
		return importedCount;
	}

	/**
	 * Sets the maximum number of entries to keep
	 * @param maxEntries Maximum number of entries
	 */
	setMaxEntries(maxEntries: number): void {
		this.entryManager.setMaxEntries(maxEntries);
		this.saveHistory();
	}

	/**
	 * Gets the current maximum number of entries
	 * @returns Maximum number of entries
	 */
	getMaxEntries(): number {
		return this.entryManager.getMaxEntries();
	}

	/**
	 * Adds a listener for history changes
	 * @param listener Function to call when history changes
	 */
	addListener(listener: (entries: HistoryEntry[]) => void): void {
		this.listeners.push(listener);
	}

	/**
	 * Removes a listener
	 * @param listener The listener function to remove
	 */
	removeListener(listener: (entries: HistoryEntry[]) => void): void {
		const index = this.listeners.indexOf(listener);
		if (index > -1) {
			this.listeners.splice(index, 1);
		}
	}

	/**
	 * Validates and repairs the history
	 * @returns Summary of validation and repair operations
	 */
	validateAndRepairHistory(): {
		totalEntries: number;
		validEntries: number;
		repairedEntries: number;
		removedEntries: number;
		duplicatesRemoved: number;
	} {
		const entries = this.entryManager.getAllEntries();
		const validation = HistoryValidation.validateHistoryEntries(entries);
		
		// Attempt to repair invalid entries
		let repairedCount = 0;
		const repairedEntries: HistoryEntry[] = [];
		
		validation.invalidEntries.forEach(({ entry }) => {
			const repaired = HistoryValidation.sanitizeHistoryEntry(entry);
			if (repaired) {
				repairedEntries.push(repaired);
				repairedCount++;
			}
		});

		// Find and remove duplicates
		const allValidEntries = [...validation.validEntries, ...repairedEntries];
		const duplicateGroups = HistoryValidation.findDuplicateEntries(allValidEntries);
		
		// Keep only the first entry from each duplicate group
		const duplicatesRemoved = duplicateGroups.reduce((total, group) => total + group.length - 1, 0);
		const uniqueEntries = allValidEntries.filter(entry => {
			const duplicateGroup = duplicateGroups.find(group => group.some(e => e.id === entry.id));
			return !duplicateGroup || duplicateGroup[0].id === entry.id;
		});

		// Replace history with validated and repaired entries
		this.entryManager.clearAllEntries();
		this.entryManager.loadEntries(uniqueEntries);
		
		this.notifyListeners();
		this.saveHistory();

		return {
			totalEntries: entries.length,
			validEntries: validation.validCount,
			repairedEntries: repairedCount,
			removedEntries: validation.invalidCount - repairedCount,
			duplicatesRemoved
		};
	}

	/**
	 * Saves the current history to persistent storage
	 */
	private async saveHistory(): Promise<void> {
		await this.storage.saveHistory();
	}

	/**
	 * Notifies all listeners of history changes
	 */
	private notifyListeners(): void {
		const entries = this.entryManager.getAllEntries();
		this.listeners.forEach(listener => {
			try {
				listener(entries);
			} catch (error) {
				console.error('Error in history listener:', error);
			}
		});
	}
}
