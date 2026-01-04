import { HistoryEntry } from '../../types';

/**
 * Manages individual history entries and their operations
 */
export class HistoryEntryManager {
	private entries: Map<string, HistoryEntry> = new Map();
	private maxEntries: number;

	constructor(maxEntries: number = 100) {
		this.maxEntries = maxEntries;
	}

	/**
	 * Loads history entries from persistent storage
	 * @param historyData The history data to load
	 */
	loadEntries(historyData: HistoryEntry[]): void {
		this.entries.clear();
		
		for (const entry of historyData) {
			this.entries.set(entry.id, entry);
		}
		
		this.enforceMaxEntries();
	}

	/**
	 * Gets all history entries sorted by timestamp (newest first)
	 * @returns Array of history entries
	 */
	getAllEntries(): HistoryEntry[] {
		return Array.from(this.entries.values())
			.sort((a, b) => b.timestamp - a.timestamp);
	}

	/**
	 * Adds a new entry to the history
	 * @param entry The history entry data (without id and timestamp)
	 * @returns The complete history entry with generated id and timestamp
	 */
	addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
		const id = this.generateId();
		const timestamp = Date.now();

		const historyEntry: HistoryEntry = {
			...entry,
			id,
			timestamp,
		};

		this.entries.set(id, historyEntry);
		this.enforceMaxEntries();

		return historyEntry;
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
		return true;
	}

	/**
	 * Removes a specific entry from history
	 * @param id The ID of the entry to remove
	 * @returns True if the entry was removed, false if not found
	 */
	removeEntry(id: string): boolean {
		return this.entries.delete(id);
	}

	/**
	 * Removes all entries for a specific file
	 * @param filePath The file path to remove entries for
	 * @returns Number of entries removed
	 */
	removeEntriesForFile(filePath: string): number {
		let removedCount = 0;
		
		this.entries.forEach((entry, id) => {
			if (entry.filePath === filePath) {
				this.entries.delete(id);
				removedCount++;
			}
		});
		
		return removedCount;
	}

	/**
	 * Clears all history entries
	 */
	clearAllEntries(): void {
		this.entries.clear();
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

		entry.applied = false;
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

		entry.applied = true;
		return true;
	}

	/**
	 * Gets entries filtered by file path
	 * @param filePath The file path to filter by
	 * @returns Array of history entries for the specified file
	 */
	getEntriesForFile(filePath: string): HistoryEntry[] {
		return this.getAllEntries().filter(entry => entry.filePath === filePath);
	}

	/**
	 * Gets entries filtered by detection method
	 * @param method The detection method to filter by
	 * @returns Array of history entries for the specified method
	 */
	getEntriesByMethod(method: string): HistoryEntry[] {
		return this.getAllEntries().filter(entry => entry.method === method);
	}

	/**
	 * Gets entries within a specific time range
	 * @param startTime Start timestamp
	 * @param endTime End timestamp
	 * @returns Array of history entries within the time range
	 */
	getEntriesInTimeRange(startTime: number, endTime: number): HistoryEntry[] {
		return this.getAllEntries().filter(entry => 
			entry.timestamp >= startTime && entry.timestamp <= endTime
		);
	}

	/**
	 * Adds imported entries to the history
	 * @param importedEntries The entries to import
	 * @returns Number of entries successfully imported
	 */
	importEntries(importedEntries: HistoryEntry[]): number {
		let importedCount = 0;
		
		for (const entry of importedEntries) {
			// Generate new ID to avoid conflicts
			const newId = this.generateId();
			this.entries.set(newId, { ...entry, id: newId });
			importedCount++;
		}

		this.enforceMaxEntries();
		return importedCount;
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
	 * Gets the current number of entries
	 * @returns Current number of entries
	 */
	getEntryCount(): number {
		return this.entries.size;
	}

	/**
	 * Generates a unique ID for history entries
	 * @returns Unique ID string
	 */
	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

	/**
	 * Enforces the maximum entries limit by removing oldest entries
	 */
	private enforceMaxEntries(): void {
		if (this.entries.size <= this.maxEntries) {
			return;
		}

		const sortedEntries = this.getAllEntries();
		const entriesToRemove = sortedEntries.slice(this.maxEntries);
		
		entriesToRemove.forEach(entry => {
			this.entries.delete(entry.id);
		});
	}
}
