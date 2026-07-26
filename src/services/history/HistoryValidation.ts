import { CodeBlock, HistoryEntry } from '../../types';

/**
 * Provides validation utilities for history data
 */
export class HistoryValidation {
	/**
	 * Validates if an object is a valid history entry
	 * @param entry The object to validate
	 * @returns True if the object is a valid history entry
	 */
	static isValidHistoryEntry(entry: unknown): entry is HistoryEntry {
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

	/**
	 * Validates history entry data structure
	 * @param entry The entry to validate
	 * @returns Array of validation errors, empty if valid
	 */
	static validateHistoryEntry(entry: unknown): string[] {
		const errors: string[] = [];

		if (!entry || typeof entry !== 'object') {
			errors.push('Entry must be an object');
			return errors;
		}

		const e = entry as Record<string, unknown>;

		// Validate required fields
		if (typeof e.id !== 'string' || e.id.trim() === '') {
			errors.push('Invalid or missing id');
		}

		if (typeof e.timestamp !== 'number' || e.timestamp <= 0) {
			errors.push('Invalid or missing timestamp');
		}

		if (typeof e.fileName !== 'string' || e.fileName.trim() === '') {
			errors.push('Invalid or missing fileName');
		}

		if (typeof e.filePath !== 'string' || e.filePath.trim() === '') {
			errors.push('Invalid or missing filePath');
		}

		if (!e.codeBlock || typeof e.codeBlock !== 'object') {
			errors.push('Invalid or missing codeBlock');
		} else {
			// Validate codeBlock structure
			const codeBlockErrors = this.validateCodeBlock(e.codeBlock);
			errors.push(...codeBlockErrors);
		}

		if (typeof e.detectedLanguage !== 'string' || e.detectedLanguage.trim() === '') {
			errors.push('Invalid or missing detectedLanguage');
		}

		if (typeof e.confidence !== 'number' || e.confidence < 0 || e.confidence > 100) {
			errors.push('Invalid confidence (must be a number between 0 and 100)');
		}

		if (typeof e.method !== 'string' || e.method.trim() === '') {
			errors.push('Invalid or missing method');
		}

		if (typeof e.applied !== 'boolean') {
			errors.push('Invalid or missing applied flag');
		}

		return errors;
	}

	/**
	 * Validates code block structure
	 * @param codeBlock The code block to validate
	 * @returns Array of validation errors
	 */
	static validateCodeBlock(codeBlock: unknown): string[] {
		const errors: string[] = [];

		if (!codeBlock || typeof codeBlock !== 'object') {
			errors.push('CodeBlock must be an object');
			return errors;
		}

		const cb = codeBlock as Record<string, unknown>;

		if (typeof cb.content !== 'string') {
			errors.push('CodeBlock content must be a string');
		}

		if (typeof cb.startLine !== 'number' || cb.startLine < 1) {
			errors.push('CodeBlock startLine must be a positive number');
		}

		if (typeof cb.endLine !== 'number' || cb.endLine < 1) {
			errors.push('CodeBlock endLine must be a positive number');
		}

		if (typeof cb.hasLanguage !== 'boolean') {
			errors.push('CodeBlock hasLanguage must be a boolean');
		}

		if (typeof cb.startLine === 'number' && typeof cb.endLine === 'number') {
			if (cb.startLine > cb.endLine) {
				errors.push('CodeBlock startLine cannot be greater than endLine');
			}
		}

		// Optional field validation
		if (cb.originalLanguage !== undefined && typeof cb.originalLanguage !== 'string') {
			errors.push('CodeBlock originalLanguage must be a string when provided');
		}

		return errors;
	}

	/**
	 * Validates an array of history entries
	 * @param entries The entries to validate
	 * @returns Object containing valid entries and validation results
	 */
	static validateHistoryEntries(entries: unknown[]): {
		validEntries: HistoryEntry[];
		invalidEntries: Array<{ entry: unknown; errors: string[] }>;
		validCount: number;
		invalidCount: number;
	} {
		const validEntries: HistoryEntry[] = [];
		const invalidEntries: Array<{ entry: unknown; errors: string[] }> = [];

		if (!Array.isArray(entries)) {
			throw new Error('Entries must be an array');
		}

		entries.forEach((entry, index) => {
			const errors = this.validateHistoryEntry(entry);
			
			if (errors.length === 0 && this.isValidHistoryEntry(entry)) {
				validEntries.push(entry);
			} else {
				const invalidEntry: Record<string, unknown> = { _index: index };
				if (typeof entry === 'object' && entry !== null) {
					Object.assign(invalidEntry, entry);
				} else {
					invalidEntry.value = entry;
				}
				invalidEntries.push({
					entry: invalidEntry,
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
	static sanitizeHistoryEntry(entry: unknown): HistoryEntry | null {
		if (!entry || typeof entry !== 'object') {
			return null;
		}

		try {
			const e = entry as Record<string, unknown>;
			const codeBlockRaw = e.codeBlock && typeof e.codeBlock === 'object'
				? e.codeBlock as Record<string, unknown>
				: null;

			const codeBlock: CodeBlock = codeBlockRaw
				? {
					content: typeof codeBlockRaw.content === 'string' ? codeBlockRaw.content : '',
					startLine: typeof codeBlockRaw.startLine === 'number' && codeBlockRaw.startLine > 0 ? codeBlockRaw.startLine : 1,
					endLine: typeof codeBlockRaw.endLine === 'number' && codeBlockRaw.endLine > 0 ? codeBlockRaw.endLine : 1,
					hasLanguage: typeof codeBlockRaw.hasLanguage === 'boolean' ? codeBlockRaw.hasLanguage : false
				}
				: {
					content: '',
					startLine: 1,
					endLine: 1,
					hasLanguage: false
				};

			// Fix line number consistency
			if (codeBlock.startLine > codeBlock.endLine) {
				codeBlock.endLine = codeBlock.startLine;
			}

			// Add optional originalLanguage if present
			if (codeBlockRaw && typeof codeBlockRaw.originalLanguage === 'string') {
				codeBlock.originalLanguage = codeBlockRaw.originalLanguage;
			}

			const sanitized: HistoryEntry = {
				id: typeof e.id === 'string' ? e.id.trim() : `repair-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
				timestamp: typeof e.timestamp === 'number' && e.timestamp > 0 ? e.timestamp : Date.now(),
				fileName: typeof e.fileName === 'string' ? e.fileName.trim() : 'unknown.md',
				filePath: typeof e.filePath === 'string' ? e.filePath.trim() : 'unknown.md',
				detectedLanguage: typeof e.detectedLanguage === 'string' ? e.detectedLanguage.trim() : 'text',
				method: typeof e.method === 'string' ? e.method.trim() : 'unknown',
				applied: typeof e.applied === 'boolean' ? e.applied : false,
				confidence: typeof e.confidence === 'number' && e.confidence >= 0 && e.confidence <= 100
					? e.confidence
					: 50,
				codeBlock
			};

			// Final validation
			if (this.isValidHistoryEntry(sanitized)) {
				return sanitized;
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
