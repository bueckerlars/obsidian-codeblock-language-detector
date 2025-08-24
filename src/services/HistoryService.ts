import { HistoryEntry, IHistoryService } from '../types';

/**
 * Service for managing history of language detection and application operations
 */
export class HistoryService implements IHistoryService {
	private entries: Map<string, HistoryEntry> = new Map();
	private maxEntries: number;
	private listeners: Array<(entries: HistoryEntry[]) => void> = [];

	constructor(maxEntries: number = 100) {
		this.maxEntries = maxEntries;
	}

	/**
	 * Adds a new entry to the history
	 * @param entry The history entry data (without id and timestamp)
	 * @returns The ID of the created entry
	 */
	addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): string {
		const id = this.generateId();
		const timestamp = Date.now();

		const historyEntry: HistoryEntry = {
			...entry,
			id,
			timestamp,
		};

		this.entries.set(id, historyEntry);

		// Enforce max entries limit
		this.enforceMaxEntries();

		// Notify listeners
		this.notifyListeners();

		return id;
	}

	/**
	 * Gets all history entries sorted by timestamp (newest first)
	 * @returns Array of history entries
	 */
	getEntries(): HistoryEntry[] {
		return Array.from(this.entries.values())
			.sort((a, b) => b.timestamp - a.timestamp);
	}

	/**
	 * Gets entries filtered by file path
	 * @param filePath The file path to filter by
	 * @returns Array of history entries for the specified file
	 */
	getEntriesForFile(filePath: string): HistoryEntry[] {
		return this.getEntries().filter(entry => entry.filePath === filePath);
	}

	/**
	 * Gets entries filtered by detection method
	 * @param method The detection method to filter by
	 * @returns Array of history entries for the specified method
	 */
	getEntriesByMethod(method: string): HistoryEntry[] {
		return this.getEntries().filter(entry => entry.method === method);
	}

	/**
	 * Gets entries within a specific time range
	 * @param startTime Start timestamp
	 * @param endTime End timestamp
	 * @returns Array of history entries within the time range
	 */
	getEntriesInTimeRange(startTime: number, endTime: number): HistoryEntry[] {
		return this.getEntries().filter(entry => 
			entry.timestamp >= startTime && entry.timestamp <= endTime
		);
	}

	/**
	 * Removes a specific entry from history
	 * @param id The ID of the entry to remove
	 * @returns True if the entry was removed, false if not found
	 */
	removeEntry(id: string): boolean {
		const removed = this.entries.delete(id);
		
		if (removed) {
			this.notifyListeners();
		}
		
		return removed;
	}

	/**
	 * Removes all entries for a specific file
	 * @param filePath The file path to remove entries for
	 * @returns Number of entries removed
	 */
	removeEntriesForFile(filePath: string): number {
		let removedCount = 0;
		
		for (const [id, entry] of this.entries) {
			if (entry.filePath === filePath) {
				this.entries.delete(id);
				removedCount++;
			}
		}
		
		if (removedCount > 0) {
			this.notifyListeners();
		}
		
		return removedCount;
	}

	/**
	 * Clears all history entries
	 */
	clearHistory(): void {
		this.entries.clear();
		this.notifyListeners();
	}

	/**
	 * Undoes a specific entry by marking it as not applied
	 * @param id The ID of the entry to undo
	 * @returns True if the entry was found and undone, false otherwise
	 */
	undoEntry(id: string): boolean {
		const entry = this.entries.get(id);
		
		if (!entry) {
			return false;
		}

		// Mark as not applied
		entry.applied = false;
		this.notifyListeners();
		
		return true;
	}

	/**
	 * Reapplies a specific entry by marking it as applied
	 * @param id The ID of the entry to reapply
	 * @returns True if the entry was found and reapplied, false otherwise
	 */
	reapplyEntry(id: string): boolean {
		const entry = this.entries.get(id);
		
		if (!entry) {
			return false;
		}

		// Mark as applied
		entry.applied = true;
		this.notifyListeners();
		
		return true;
	}

	/**
	 * Gets a specific entry by ID
	 * @param id The ID of the entry to retrieve
	 * @returns The history entry or null if not found
	 */
	getEntryById(id: string): HistoryEntry | null {
		return this.entries.get(id) || null;
	}

	/**
	 * Updates an existing entry
	 * @param id The ID of the entry to update
	 * @param updates Partial updates to apply
	 * @returns True if the entry was updated, false if not found
	 */
	updateEntry(id: string, updates: Partial<Omit<HistoryEntry, 'id' | 'timestamp'>>): boolean {
		const entry = this.entries.get(id);
		
		if (!entry) {
			return false;
		}

		// Apply updates
		Object.assign(entry, updates);
		this.notifyListeners();
		
		return true;
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
		const entries = this.getEntries();
		const totalEntries = entries.length;
		const appliedEntries = entries.filter(e => e.applied).length;
		
		const methodCounts: Record<string, number> = {};
		const languageCounts: Record<string, number> = {};
		let totalConfidence = 0;

		entries.forEach(entry => {
			// Count methods
			methodCounts[entry.method] = (methodCounts[entry.method] || 0) + 1;
			
			// Count languages
			languageCounts[entry.detectedLanguage] = (languageCounts[entry.detectedLanguage] || 0) + 1;
			
			// Sum confidence
			totalConfidence += entry.confidence;
		});

		const avgConfidence = totalEntries > 0 ? totalConfidence / totalEntries : 0;

		return {
			totalEntries,
			appliedEntries,
			methodCounts,
			languageCounts,
			avgConfidence: Math.round(avgConfidence * 100) / 100,
		};
	}

	/**
	 * Exports history to JSON
	 * @returns JSON string representation of the history
	 */
	exportHistory(): string {
		const entries = this.getEntries();
		return JSON.stringify(entries, null, 2);
	}

	/**
	 * Imports history from JSON
	 * @param jsonData JSON string containing history data
	 * @param replace Whether to replace existing history or merge
	 * @returns Number of entries imported
	 */
	importHistory(jsonData: string, replace: boolean = false): number {
		try {
			const importedEntries: HistoryEntry[] = JSON.parse(jsonData);
			
			if (!Array.isArray(importedEntries)) {
				throw new Error('Invalid history data format');
			}

			if (replace) {
				this.clearHistory();
			}

			let importedCount = 0;
			
			for (const entry of importedEntries) {
				// Validate entry structure
				if (this.isValidHistoryEntry(entry)) {
					// Generate new ID to avoid conflicts
					const newId = this.generateId();
					this.entries.set(newId, { ...entry, id: newId });
					importedCount++;
				}
			}

			this.enforceMaxEntries();
			this.notifyListeners();
			
			return importedCount;
		} catch (error) {
			console.error('Error importing history:', error);
			throw new Error('Failed to import history data');
		}
	}

	/**
	 * Sets the maximum number of entries to keep
	 * @param maxEntries Maximum number of entries
	 */
	setMaxEntries(maxEntries: number): void {
		this.maxEntries = Math.max(1, maxEntries);
		this.enforceMaxEntries();
	}

	/**
	 * Gets the current maximum number of entries
	 * @returns Maximum number of entries
	 */
	getMaxEntries(): number {
		return this.maxEntries;
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
	 * Generates a unique ID for history entries
	 * @returns Unique ID string
	 */
	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Enforces the maximum entries limit by removing oldest entries
	 */
	private enforceMaxEntries(): void {
		if (this.entries.size <= this.maxEntries) {
			return;
		}

		const sortedEntries = this.getEntries();
		const entriesToRemove = sortedEntries.slice(this.maxEntries);
		
		entriesToRemove.forEach(entry => {
			this.entries.delete(entry.id);
		});
	}

	/**
	 * Notifies all listeners of history changes
	 */
	private notifyListeners(): void {
		const entries = this.getEntries();
		this.listeners.forEach(listener => {
			try {
				listener(entries);
			} catch (error) {
				console.error('Error in history listener:', error);
			}
		});
	}

	/**
	 * Validates if an object is a valid history entry
	 * @param entry The object to validate
	 * @returns True if the object is a valid history entry
	 */
	private isValidHistoryEntry(entry: any): entry is HistoryEntry {
		return (
			typeof entry === 'object' &&
			typeof entry.id === 'string' &&
			typeof entry.timestamp === 'number' &&
			typeof entry.fileName === 'string' &&
			typeof entry.filePath === 'string' &&
			typeof entry.codeBlock === 'object' &&
			typeof entry.detectedLanguage === 'string' &&
			typeof entry.confidence === 'number' &&
			typeof entry.method === 'string' &&
			typeof entry.applied === 'boolean'
		);
	}
}
