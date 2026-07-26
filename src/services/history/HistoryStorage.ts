import { HistoryEntry } from '../../types';

/**
 * Handles persistent storage operations for history data
 */
export class HistoryStorage {
	private saveCallback: (() => Promise<void>) | null = null;

	/**
	 * Sets the callback function to save history data persistently
	 * @param saveCallback Function that saves the history data
	 */
	setSaveCallback(saveCallback: () => Promise<void>): void {
		this.saveCallback = saveCallback;
	}

	/**
	 * Saves the current history to persistent storage
	 */
	async saveHistory(): Promise<void> {
		if (this.saveCallback) {
			try {
				await this.saveCallback();
			} catch (error) {
				console.error('Error saving history:', error);
			}
		}
	}

	/**
	 * Exports history to JSON
	 * @param entries The history entries to export
	 * @returns JSON string representation of the history
	 */
	exportHistory(entries: HistoryEntry[]): string {
		return JSON.stringify(entries, null, 2);
	}

	/**
	 * Imports history from JSON
	 * @param jsonData JSON string containing history data
	 * @returns Array of valid history entries
	 */
	importHistory(jsonData: string): HistoryEntry[] {
		try {
			const parsed: unknown = JSON.parse(jsonData);
			
			if (!Array.isArray(parsed)) {
				throw new Error('Invalid history data format');
			}

			// Filter out invalid entries
			return parsed.filter((entry): entry is HistoryEntry => this.isValidHistoryEntry(entry));
		} catch (error) {
			console.error('Error importing history:', error);
			throw new Error('Failed to import history data');
		}
	}

	/**
	 * Validates history data format
	 * @param historyData The history data to validate
	 * @returns Array of valid history entries
	 */
	validateAndFilterHistoryData(historyData: HistoryEntry[]): HistoryEntry[] {
		if (!Array.isArray(historyData)) {
			return [];
		}

		return historyData.filter(entry => this.isValidHistoryEntry(entry));
	}

	/**
	 * Validates if an object is a valid history entry
	 * @param entry The object to validate
	 * @returns True if the object is a valid history entry
	 */
	private isValidHistoryEntry(entry: unknown): entry is HistoryEntry {
		if (typeof entry !== 'object' || entry === null) {
			return false;
		}

		const e = entry as Record<string, unknown>;
		return (
			typeof e.id === 'string' &&
			typeof e.timestamp === 'number' &&
			typeof e.fileName === 'string' &&
			typeof e.filePath === 'string' &&
			typeof e.codeBlock === 'object' &&
			e.codeBlock !== null &&
			typeof e.detectedLanguage === 'string' &&
			typeof e.confidence === 'number' &&
			typeof e.method === 'string' &&
			typeof e.applied === 'boolean'
		);
	}
}
