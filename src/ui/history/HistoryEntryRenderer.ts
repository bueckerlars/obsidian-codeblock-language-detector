import { ButtonComponent } from 'obsidian';
import { HistoryEntry } from '../../types';

/**
 * Renders individual history entries and manages entry display
 */
export class HistoryEntryRenderer {
	private onToggleEntry: (entry: HistoryEntry) => Promise<void>;
	private onEditEntry: (entry: HistoryEntry) => Promise<void>;

	constructor(
		onToggleEntry: (entry: HistoryEntry) => Promise<void>,
		onEditEntry: (entry: HistoryEntry) => Promise<void>
	) {
		this.onToggleEntry = onToggleEntry;
		this.onEditEntry = onEditEntry;
	}

	/**
	 * Renders a list of history entries
	 * @param container The container element
	 * @param entries The entries to render
	 */
	renderEntries(container: HTMLElement, entries: HistoryEntry[]): void {
		container.empty();

		if (entries.length === 0) {
			this.renderEmptyState(container);
			return;
		}

		entries.forEach((entry, index) => {
			this.renderSingleEntry(container, entry, index);
		});
	}

	/**
	 * Renders a single history entry
	 * @param container The container element
	 * @param entry The entry to render
	 * @param index The entry index
	 */
	private renderSingleEntry(container: HTMLElement, entry: HistoryEntry, index: number): void {
		const entryEl = container.createDiv(`history-entry ${entry.applied ? 'applied' : 'unapplied'}`);

		// Entry header
		this.renderEntryHeader(entryEl, entry);

		// Detection details
		this.renderDetectionDetails(entryEl, entry);

		// Code preview
		this.renderCodePreview(entryEl, entry);

		// Action buttons
		this.renderActionButtons(entryEl, entry);
	}

	/**
	 * Renders the entry header with file info and status
	 * @param entryEl The entry element
	 * @param entry The history entry
	 */
	private renderEntryHeader(entryEl: HTMLElement, entry: HistoryEntry): void {
		const headerEl = entryEl.createDiv('entry-header');

		// File info
		const fileInfoEl = headerEl.createDiv('file-info');
		this.renderFileInfo(fileInfoEl, entry);

		// Status and timestamp
		const statusEl = headerEl.createDiv('entry-status');
		this.renderStatusAndTimestamp(statusEl, entry);
	}

	/**
	 * Renders file information
	 * @param container The container element
	 * @param entry The history entry
	 */
	private renderFileInfo(container: HTMLElement, entry: HistoryEntry): void {
		const fileNameEl = container.createSpan('file-name');
		fileNameEl.textContent = entry.fileName;

		const filePathEl = container.createDiv('file-path');
		filePathEl.textContent = entry.filePath;
		filePathEl.title = entry.filePath; // Tooltip for full path
	}

	/**
	 * Renders status badge and timestamp
	 * @param container The container element
	 * @param entry The history entry
	 */
	private renderStatusAndTimestamp(container: HTMLElement, entry: HistoryEntry): void {
		const statusBadge = container.createSpan(`status-badge ${entry.applied ? 'applied' : 'unapplied'}`);
		statusBadge.textContent = entry.applied ? 'Applied' : 'Unapplied';

		const timestampEl = container.createDiv('timestamp');
		const date = new Date(entry.timestamp);
		timestampEl.textContent = date.toLocaleString();
		timestampEl.title = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
	}

	/**
	 * Renders detection details (language, confidence, method)
	 * @param entryEl The entry element
	 * @param entry The history entry
	 */
	private renderDetectionDetails(entryEl: HTMLElement, entry: HistoryEntry): void {
		const detailsEl = entryEl.createDiv('entry-details');

		// Language
		const languageEl = detailsEl.createSpan('detected-language');
		const languageLabel = languageEl.createEl('strong');
		languageLabel.textContent = 'Language:';
		languageEl.appendText(` ${entry.detectedLanguage}`);

		// Confidence with visual indicator
		const confidenceEl = detailsEl.createSpan('confidence');
		const confidenceLabel = confidenceEl.createEl('strong');
		confidenceLabel.textContent = 'Confidence:';
		confidenceEl.appendText(` ${entry.confidence}%`);
		
		// Add confidence bar
		const confidenceBar = confidenceEl.createDiv('confidence-bar');
		const confidenceProgress = confidenceBar.createDiv('confidence-progress');
		confidenceProgress.style.width = `${entry.confidence}%`;
		confidenceProgress.classList.add(this.getConfidenceClass(entry.confidence));

		// Method
		const methodEl = detailsEl.createSpan('method');
		const methodLabel = methodEl.createEl('strong');
		methodLabel.textContent = 'Method:';
		methodEl.appendText(` ${entry.method}`);

		// Add method badge
		const methodBadge = methodEl.createSpan('method-badge');
		methodBadge.textContent = entry.method;
		methodBadge.className = `method-badge method-${entry.method.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
	}

	/**
	 * Renders code preview with syntax highlighting hint
	 * @param entryEl The entry element
	 * @param entry The history entry
	 */
	private renderCodePreview(entryEl: HTMLElement, entry: HistoryEntry): void {
		const codePreviewEl = entryEl.createDiv('code-preview');

		// Add language indicator
		const languageIndicator = codePreviewEl.createDiv('language-indicator');
		languageIndicator.textContent = entry.detectedLanguage;

		// Code content
		const codeContent = codePreviewEl.createEl('pre');
		const codeEl = codeContent.createEl('code');
		
		const truncatedCode = this.truncateCode(entry.codeBlock.content, 200);
		codeEl.textContent = truncatedCode;

		// Add copy button
		const copyButton = codePreviewEl.createEl('button', { 
			cls: 'copy-code-btn',
			text: '📋'
		});
		copyButton.title = 'Copy code to clipboard';
		copyButton.addEventListener('click', () => {
			navigator.clipboard.writeText(entry.codeBlock.content);
			copyButton.textContent = '✓';
			setTimeout(() => {
				copyButton.textContent = '📋';
			}, 1000);
		});

		// Add expand button if code is truncated
		if (entry.codeBlock.content.length > 200) {
			const expandButton = codePreviewEl.createEl('button', {
				cls: 'expand-code-btn',
				text: 'Show more'
			});
			expandButton.addEventListener('click', () => {
				if (codeEl.textContent === truncatedCode) {
					codeEl.textContent = entry.codeBlock.content;
					expandButton.textContent = 'Show less';
				} else {
					codeEl.textContent = truncatedCode;
					expandButton.textContent = 'Show more';
				}
			});
		}
	}

	/**
	 * Renders action buttons for the entry
	 * @param entryEl The entry element
	 * @param entry The history entry
	 */
	private renderActionButtons(entryEl: HTMLElement, entry: HistoryEntry): void {
		const actionsEl = entryEl.createDiv('entry-actions');

		// Undo/Redo button
		const toggleButton = new ButtonComponent(actionsEl);
		toggleButton.setButtonText(entry.applied ? 'Undo' : 'Reapply');
		toggleButton.setClass(entry.applied ? 'mod-warning' : 'mod-cta');
		toggleButton.setTooltip(entry.applied ? 'Remove language tag' : 'Apply language tag');
		toggleButton.onClick(async () => {
			await this.onToggleEntry(entry);
		});

		// Edit/Navigate button
		const editButton = new ButtonComponent(actionsEl);
		editButton.setButtonText('Navigate');
		editButton.setTooltip('Jump to code block in file');
		editButton.onClick(async () => {
			await this.onEditEntry(entry);
		});
	}

	/**
	 * Renders empty state when no entries are available
	 * @param container The container element
	 */
	private renderEmptyState(container: HTMLElement): void {
		const emptyMessageEl = container.createDiv('empty-state-message');

		const iconEl = emptyMessageEl.createDiv('empty-state-icon');
		iconEl.textContent = '📝';

		const messageText = emptyMessageEl.createDiv('message-text');
		messageText.textContent = 'No history entries found';

		const subText = emptyMessageEl.createDiv('sub-text');
		subText.textContent = 'No language detection operations match the current filters.';

		// Add helpful tips
		const tipsEl = emptyMessageEl.createDiv('empty-state-tips');
		tipsEl.createEl('p', { text: 'Try:' });
		const tipsList = tipsEl.createEl('ul');
		tipsList.createEl('li', { text: 'Clearing search filters' });
		tipsList.createEl('li', { text: 'Changing the filter to "All entries"' });
		tipsList.createEl('li', { text: 'Running language detection on some code blocks' });
	}



	/**
	 * Gets color for confidence level
	 * @param confidence Confidence percentage
	 * @returns CSS color
	 */
	private getConfidenceColor(confidence: number): string {
		if (confidence >= 80) return '#4caf50'; // Green
		if (confidence >= 60) return '#ff9800'; // Orange
		if (confidence >= 40) return '#f44336'; // Red
		return '#9e9e9e'; // Gray
	}

	/**
	 * Gets CSS class for confidence level
	 * @param confidence Confidence percentage
	 * @returns CSS class name
	 */
	private getConfidenceClass(confidence: number): string {
		if (confidence >= 80) return 'high';
		if (confidence >= 60) return 'medium';
		return 'low';
	}

	/**
	 * Truncates code to specified length with smart word breaking
	 * @param code The code to truncate
	 * @param maxLength Maximum length
	 * @returns Truncated code
	 */
	private truncateCode(code: string, maxLength: number): string {
		if (code.length <= maxLength) {
			return code;
		}

		// Try to break at a newline near the limit
		const nearLimit = code.substring(0, maxLength);
		const lastNewline = nearLimit.lastIndexOf('\n');
		
		if (lastNewline > maxLength * 0.8) {
			return code.substring(0, lastNewline) + '\n...';
		}

		// Otherwise just truncate with ellipsis
		return code.substring(0, maxLength) + '...';
	}

	/**
	 * Updates the rendering of a specific entry (useful for real-time updates)
	 * @param entryId The ID of the entry to update
	 * @param updatedEntry The updated entry data
	 */
	updateEntry(entryId: string, updatedEntry: HistoryEntry): void {
		const entryElement = document.querySelector(`[data-entry-id="${entryId}"]`) as HTMLElement;
		if (entryElement && entryElement.parentElement) {
			// Remove old element
			entryElement.remove();
			
			// Render updated entry in the same position would require more complex logic
			// For now, this method is a placeholder for future enhancement
		}
	}
}
