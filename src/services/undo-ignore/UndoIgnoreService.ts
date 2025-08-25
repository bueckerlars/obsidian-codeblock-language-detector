import { IUndoIgnoreService, UndoIgnoreEntry, CodeBlock } from '../../types';

/**
 * Service für das Verwalten von Undo-Ignore-Einträgen
 * Verhindert, dass nach einem Undo sofort eine neue Detection ausgelöst wird
 */
export class UndoIgnoreService implements IUndoIgnoreService {
	private ignoreEntries: Map<string, UndoIgnoreEntry> = new Map();
	// Standard-Ignore-Zeit: 10 Sekunden
	private readonly DEFAULT_IGNORE_DURATION = 10000;

	/**
	 * Fügt einen Ignore-Eintrag hinzu für einen Code-Block nach einem Undo
	 * @param filePath Pfad zur Datei
	 * @param codeBlock Code-Block der ignoriert werden soll
	 */
	addIgnoreEntry(filePath: string, codeBlock: CodeBlock): void {
		const id = this.generateIgnoreId(filePath, codeBlock);
		const now = Date.now();
		
		const ignoreEntry: UndoIgnoreEntry = {
			id,
			filePath,
			codeBlockContent: codeBlock.content,
			codeBlockStartLine: codeBlock.startLine,
			codeBlockEndLine: codeBlock.endLine,
			timestamp: now,
			expiryTime: now + this.DEFAULT_IGNORE_DURATION
		};

		this.ignoreEntries.set(id, ignoreEntry);
		
		// Bereinige abgelaufene Einträge
		this.cleanupExpiredEntries();
		
		console.log(`Undo ignore entry added for ${filePath} at lines ${codeBlock.startLine}-${codeBlock.endLine}`);
	}

	/**
	 * Prüft ob eine Detection für einen Code-Block ignoriert werden soll
	 * @param filePath Pfad zur Datei
	 * @param codeBlock Code-Block der geprüft werden soll
	 * @returns true wenn die Detection ignoriert werden soll, false sonst
	 */
	shouldIgnoreDetection(filePath: string, codeBlock: CodeBlock): boolean {
		const id = this.generateIgnoreId(filePath, codeBlock);
		const ignoreEntry = this.ignoreEntries.get(id);
		
		if (!ignoreEntry) {
			return false;
		}

		// Prüfe ob der Eintrag abgelaufen ist
		const now = Date.now();
		if (now > ignoreEntry.expiryTime) {
			this.ignoreEntries.delete(id);
			return false;
		}

		// Prüfe ob der Code-Block-Inhalt noch übereinstimmt
		if (ignoreEntry.codeBlockContent !== codeBlock.content) {
			// Code-Block hat sich geändert, ignore-Eintrag ist nicht mehr gültig
			this.ignoreEntries.delete(id);
			return false;
		}

		console.log(`Detection ignored for ${filePath} at lines ${codeBlock.startLine}-${codeBlock.endLine} due to recent undo`);
		return true;
	}

	/**
	 * Bereinigt abgelaufene Ignore-Einträge
	 */
	cleanupExpiredEntries(): void {
		const now = Date.now();
		const expiredIds: string[] = [];

		this.ignoreEntries.forEach((entry, id) => {
			if (now > entry.expiryTime) {
				expiredIds.push(id);
			}
		});

		expiredIds.forEach(id => {
			this.ignoreEntries.delete(id);
		});

		if (expiredIds.length > 0) {
			console.log(`Cleaned up ${expiredIds.length} expired undo ignore entries`);
		}
	}

	/**
	 * Löscht alle Ignore-Einträge
	 */
	clearAllIgnoreEntries(): void {
		const count = this.ignoreEntries.size;
		this.ignoreEntries.clear();
		console.log(`Cleared ${count} undo ignore entries`);
	}

	/**
	 * Gibt alle aktiven Ignore-Einträge zurück
	 * @returns Array der aktiven Ignore-Einträge
	 */
	getActiveIgnoreEntries(): UndoIgnoreEntry[] {
		this.cleanupExpiredEntries();
		return Array.from(this.ignoreEntries.values());
	}

	/**
	 * Generiert eine eindeutige ID für einen Ignore-Eintrag
	 * @param filePath Pfad zur Datei
	 * @param codeBlock Code-Block
	 * @returns Eindeutige ID
	 */
	private generateIgnoreId(filePath: string, codeBlock: CodeBlock): string {
		// Verwende eine Kombination aus Datei-Pfad und Zeilen-Nummern
		// Da sich die Zeilen-Nummern durch Undo-Aktionen nicht ändern sollten
		return `${filePath}:${codeBlock.startLine}-${codeBlock.endLine}`;
	}

	/**
	 * Setzt eine benutzerdefinierte Ignore-Dauer (für Tests oder spezielle Fälle)
	 * @param filePath Pfad zur Datei
	 * @param codeBlock Code-Block
	 * @param durationMs Dauer in Millisekunden
	 */
	addIgnoreEntryWithDuration(filePath: string, codeBlock: CodeBlock, durationMs: number): void {
		const id = this.generateIgnoreId(filePath, codeBlock);
		const now = Date.now();
		
		const ignoreEntry: UndoIgnoreEntry = {
			id,
			filePath,
			codeBlockContent: codeBlock.content,
			codeBlockStartLine: codeBlock.startLine,
			codeBlockEndLine: codeBlock.endLine,
			timestamp: now,
			expiryTime: now + durationMs
		};

		this.ignoreEntries.set(id, ignoreEntry);
		this.cleanupExpiredEntries();
	}
}
