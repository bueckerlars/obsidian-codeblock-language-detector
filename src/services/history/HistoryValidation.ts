import { HistoryEntry } from '../../types';

/**
 * Provides validation utilities for history data
 */
export class HistoryValidation {
	/**
	 * Validates if an object is a valid history entry
	 * @param entry The object to validate
	 * @returns True if the object is a valid history entry
	 */
	static isValidHistoryEntry(entry: any): entry is HistoryEntry {
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

	/**
	 * Validates history entry data structure
	 * @param entry The entry to validate
	 * @returns Array of validation errors, empty if valid
	 */
	static validateHistoryEntry(entry: any): string[] {
		const errors: string[] = [];

		if (!entry || typeof entry !== 'object') {
			errors.push('Entry must be an object');
			return errors;
		}

		// Validate required fields
		if (typeof entry.id !== 'string' || entry.id.trim() === '') {
			errors.push('Invalid or missing id');
		}

		if (typeof entry.timestamp !== 'number' || entry.timestamp <= 0) {
			errors.push('Invalid or missing timestamp');
		}

		if (typeof entry.fileName !== 'string' || entry.fileName.trim() === '') {
			errors.push('Invalid or missing fileName');
		}

		if (typeof entry.filePath !== 'string' || entry.filePath.trim() === '') {
			errors.push('Invalid or missing filePath');
		}

		if (!entry.codeBlock || typeof entry.codeBlock !== 'object') {
			errors.push('Invalid or missing codeBlock');
		} else {
			// Validate codeBlock structure
			const codeBlockErrors = this.validateCodeBlock(entry.codeBlock);
			errors.push(...codeBlockErrors);
		}

		if (typeof entry.detectedLanguage !== 'string' || entry.detectedLanguage.trim() === '') {
			errors.push('Invalid or missing detectedLanguage');
		}

		if (typeof entry.confidence !== 'number' || entry.confidence < 0 || entry.confidence > 100) {
			errors.push('Invalid confidence (must be a number between 0 and 100)');
		}

		if (typeof entry.method !== 'string' || entry.method.trim() === '') {
			errors.push('Invalid or missing method');
		}

		if (typeof entry.applied !== 'boolean') {
			errors.push('Invalid or missing applied flag');
		}

		return errors;
	}

	/**
	 * Validates code block structure
	 * @param codeBlock The code block to validate
	 * @returns Array of validation errors
	 */
	static validateCodeBlock(codeBlock: any): string[] {
		const errors: string[] = [];

		if (!codeBlock || typeof codeBlock !== 'object') {
			errors.push('CodeBlock must be an object');
			return errors;
		}

		if (typeof codeBlock.content !== 'string') {
			errors.push('CodeBlock content must be a string');
		}

		if (typeof codeBlock.startLine !== 'number' || codeBlock.startLine < 1) {
			errors.push('CodeBlock startLine must be a positive number');
		}

		if (typeof codeBlock.endLine !== 'number' || codeBlock.endLine < 1) {
			errors.push('CodeBlock endLine must be a positive number');
		}

		if (typeof codeBlock.hasLanguage !== 'boolean') {
			errors.push('CodeBlock hasLanguage must be a boolean');
		}

		if (typeof codeBlock.startLine === 'number' && typeof codeBlock.endLine === 'number') {
			if (codeBlock.startLine > codeBlock.endLine) {
				errors.push('CodeBlock startLine cannot be greater than endLine');
			}
		}

		// Optional field validation
		if (codeBlock.originalLanguage !== undefined && typeof codeBlock.originalLanguage !== 'string') {
			errors.push('CodeBlock originalLanguage must be a string when provided');
		}

		return errors;
	}

	/**
	 * Validates an array of history entries
	 * @param entries The entries to validate
	 * @returns Object containing valid entries and validation results
	 */
	static validateHistoryEntries(entries: any[]): {
		validEntries: HistoryEntry[];
		invalidEntries: Array<{ entry: any; errors: string[] }>;
		validCount: number;
		invalidCount: number;
	} {
		const validEntries: HistoryEntry[] = [];
		const invalidEntries: Array<{ entry: any; errors: string[] }> = [];

		if (!Array.isArray(entries)) {
			throw new Error('Entries must be an array');
		}

		entries.forEach((entry, index) => {
			const errors = this.validateHistoryEntry(entry);
			
			if (errors.length === 0) {
				validEntries.push(entry as HistoryEntry);
			} else {
				invalidEntries.push({
					entry: { ...entry, _index: index },
					errors
				});
			}
		});

		return {
			validEntries,
			invalidEntries,
			validCount: validEntries.length,
			invalidCount: invalidEntries.length
		};
	}

	/**
	 * Validates history configuration parameters
	 * @param config Configuration to validate
	 * @returns Array of validation errors
	 */
	static validateHistoryConfig(config: {
		maxEntries?: number;
		enableHistory?: boolean;
	}): string[] {
		const errors: string[] = [];

		if (config.maxEntries !== undefined) {
			if (typeof config.maxEntries !== 'number' || config.maxEntries < 1 || config.maxEntries > 10000) {
				errors.push('maxEntries must be a number between 1 and 10000');
			}
		}

		if (config.enableHistory !== undefined) {
			if (typeof config.enableHistory !== 'boolean') {
				errors.push('enableHistory must be a boolean');
			}
		}

		return errors;
	}

	/**
	 * Sanitizes and repairs a history entry to make it valid
	 * @param entry The entry to sanitize
	 * @returns Sanitized entry or null if irreparable
	 */
	static sanitizeHistoryEntry(entry: any): HistoryEntry | null {
		if (!entry || typeof entry !== 'object') {
			return null;
		}

		try {
			// Attempt to repair the entry
			const sanitized: any = {};

			// Sanitize basic fields
			sanitized.id = typeof entry.id === 'string' ? entry.id.trim() : `repair-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
			sanitized.timestamp = typeof entry.timestamp === 'number' && entry.timestamp > 0 ? entry.timestamp : Date.now();
			sanitized.fileName = typeof entry.fileName === 'string' ? entry.fileName.trim() : 'unknown.md';
			sanitized.filePath = typeof entry.filePath === 'string' ? entry.filePath.trim() : 'unknown.md';
			sanitized.detectedLanguage = typeof entry.detectedLanguage === 'string' ? entry.detectedLanguage.trim() : 'text';
			sanitized.method = typeof entry.method === 'string' ? entry.method.trim() : 'unknown';
			sanitized.applied = typeof entry.applied === 'boolean' ? entry.applied : false;

			// Sanitize confidence
			if (typeof entry.confidence === 'number' && entry.confidence >= 0 && entry.confidence <= 100) {
				sanitized.confidence = entry.confidence;
			} else {
				sanitized.confidence = 50; // Default confidence
			}

			// Sanitize code block
			if (entry.codeBlock && typeof entry.codeBlock === 'object') {
				sanitized.codeBlock = {
					content: typeof entry.codeBlock.content === 'string' ? entry.codeBlock.content : '',
					startLine: typeof entry.codeBlock.startLine === 'number' && entry.codeBlock.startLine > 0 ? entry.codeBlock.startLine : 1,
					endLine: typeof entry.codeBlock.endLine === 'number' && entry.codeBlock.endLine > 0 ? entry.codeBlock.endLine : 1,
					hasLanguage: typeof entry.codeBlock.hasLanguage === 'boolean' ? entry.codeBlock.hasLanguage : false
				};

				// Fix line number consistency
				if (sanitized.codeBlock.startLine > sanitized.codeBlock.endLine) {
					sanitized.codeBlock.endLine = sanitized.codeBlock.startLine;
				}

				// Add optional originalLanguage if present
				if (typeof entry.codeBlock.originalLanguage === 'string') {
					sanitized.codeBlock.originalLanguage = entry.codeBlock.originalLanguage;
				}
			} else {
				sanitized.codeBlock = {
					content: '',
					startLine: 1,
					endLine: 1,
					hasLanguage: false
				};
			}

			// Final validation
			if (this.isValidHistoryEntry(sanitized)) {
				return sanitized as HistoryEntry;
			}

			return null;
		} catch (error) {
			console.error('Error sanitizing history entry:', error);
			return null;
		}
	}

	/**
	 * Checks for duplicate entries
	 * @param entries Array of entries to check
	 * @returns Array of duplicate entry groups
	 */
	static findDuplicateEntries(entries: HistoryEntry[]): HistoryEntry[][] {
		const duplicateGroups: HistoryEntry[][] = [];
		const processed = new Set<string>();

		entries.forEach((entry, index) => {
			if (processed.has(entry.id)) {
				return;
			}

			const duplicates = entries.filter((other, otherIndex) => 
				otherIndex !== index &&
				other.filePath === entry.filePath &&
				other.detectedLanguage === entry.detectedLanguage &&
				other.method === entry.method &&
				Math.abs(other.timestamp - entry.timestamp) < 60000 && // Within 1 minute
				other.codeBlock.content === entry.codeBlock.content
			);

			if (duplicates.length > 0) {
				const group = [entry, ...duplicates];
				duplicateGroups.push(group);
				
				// Mark all as processed
				group.forEach(e => processed.add(e.id));
			}
		});

		return duplicateGroups;
	}
}
