import { App, Modal, ButtonComponent } from 'obsidian';
import { HistoryEntry } from '../../types';
import { HistoryService } from '../../services';
import AutoSyntaxHighlightPlugin from '../../../main';

/**
 * Modal for displaying detailed history statistics
 */
export class StatisticsModal extends Modal {
	private plugin: AutoSyntaxHighlightPlugin;
	private historyService: HistoryService;

	constructor(app: App, plugin: AutoSyntaxHighlightPlugin) {
		super(app);
		this.plugin = plugin;
		this.historyService = plugin.historyService;
	}

	/**
	 * Called when the modal is opened
	 */
	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		
		// Add CSS class for wider modal
		this.modalEl.addClass('statistics-modal');

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
		container.createEl('h2', { text: 'Detection Statistics' });

		// Get all entries for statistics
		const entries = this.historyService.getEntries();
		
		if (entries.length === 0) {
			container.createDiv('no-data').textContent = 'No history data available';
			this.createCloseButton(container);
			return;
		}

		// Create statistics sections
		this.createBasicStatistics(container, entries);
		this.createMethodStatistics(container, entries);
		this.createLanguageStatistics(container, entries);
		this.createTrendStatistics(container, entries);
		this.createConfidenceDistribution(container, entries);
		this.createTimeBasedStatistics(container, entries);

		// Close button
		this.createCloseButton(container);
	}

	/**
	 * Creates basic statistics section
	 * @param container The container element
	 * @param entries The history entries
	 */
	private createBasicStatistics(container: HTMLElement, entries: HistoryEntry[]): void {
		const section = container.createDiv('statistics-section basic-stats');
		section.createEl('h3', { text: 'Overview' });

		const stats = this.historyService.getStatistics();
		const basicStatsGrid = section.createDiv('stats-grid');

		const createStatCard = (title: string, value: string | number, description?: string) => {
			const card = basicStatsGrid.createDiv('stat-card');
			card.createEl('div', { text: title, cls: 'stat-title' });
			card.createEl('div', { text: value.toString(), cls: 'stat-value' });
			if (description) {
				card.createEl('div', { text: description, cls: 'stat-description' });
			}
		};

		createStatCard('Total Entries', stats.totalEntries);
		createStatCard('Applied', stats.appliedEntries, `${Math.round((stats.appliedEntries / stats.totalEntries) * 100)}%`);
		createStatCard('Avg Confidence', `${stats.avgConfidence}%`);
		createStatCard('Success Rate', `${Math.round((stats.appliedEntries / stats.totalEntries) * 100)}%`);
	}

	/**
	 * Creates method statistics section
	 * @param container The container element
	 * @param entries The history entries
	 */
	private createMethodStatistics(container: HTMLElement, entries: HistoryEntry[]): void {
		const section = container.createDiv('statistics-section method-stats');
		section.createEl('h3', { text: 'Detection Methods' });

		const detailedStats = this.historyService.getDetailedStatistics();
		const methodsTable = section.createEl('table', { cls: 'stats-table' });
		
		// Header
		const headerRow = methodsTable.createEl('tr');
		headerRow.createEl('th', { text: 'Method' });
		headerRow.createEl('th', { text: 'Count' });
		headerRow.createEl('th', { text: 'Success Rate' });
		headerRow.createEl('th', { text: 'Avg Confidence' });

		// Data rows
		Object.entries(detailedStats.methods).forEach(([method, stats]) => {
			const row = methodsTable.createEl('tr');
			row.createEl('td', { text: method });
			row.createEl('td', { text: stats.count.toString() });
			row.createEl('td', { text: `${stats.successRate}%` });
			row.createEl('td', { text: `${stats.avgConfidence}%` });
		});
	}

	/**
	 * Creates language statistics section
	 * @param container The container element
	 * @param entries The history entries
	 */
	private createLanguageStatistics(container: HTMLElement, entries: HistoryEntry[]): void {
		const section = container.createDiv('statistics-section language-stats');
		section.createEl('h3', { text: 'Top Languages' });

		const detailedStats = this.historyService.getDetailedStatistics();
		const languagesTable = section.createEl('table', { cls: 'stats-table' });
		
		// Header
		const headerRow = languagesTable.createEl('tr');
		headerRow.createEl('th', { text: 'Language' });
		headerRow.createEl('th', { text: 'Count' });
		headerRow.createEl('th', { text: 'Avg Confidence' });

		// Get top 10 languages
		const topLanguages = Object.entries(detailedStats.languages)
			.sort(([,a], [,b]) => b.count - a.count)
			.slice(0, 10);

		// Data rows
		topLanguages.forEach(([language, stats]) => {
			const row = languagesTable.createEl('tr');
			row.createEl('td', { text: language });
			row.createEl('td', { text: stats.count.toString() });
			row.createEl('td', { text: `${stats.avgConfidence}%` });
		});
	}

	/**
	 * Creates trend statistics section
	 * @param container The container element
	 * @param entries The history entries
	 */
	private createTrendStatistics(container: HTMLElement, entries: HistoryEntry[]): void {
		const section = container.createDiv('statistics-section trend-stats');
		section.createEl('h3', { text: 'Trends' });

		const detailedStats = this.historyService.getDetailedStatistics();
		
		if (!detailedStats.trends) {
			section.createDiv('no-data').textContent = 'Not enough data for trend analysis';
			return;
		}

		const trendsGrid = section.createDiv('trends-grid');

		const createTrendCard = (title: string, trend: string, recent: number, overall: number, unit: string = '%') => {
			const card = trendsGrid.createDiv('trend-card');
			card.createEl('div', { text: title, cls: 'trend-title' });
			
			const trendIndicator = card.createDiv('trend-indicator');
			const icon = trend === 'improving' ? '↗' : trend === 'declining' ? '↘' : '→';
			const color = trend === 'improving' ? 'green' : trend === 'declining' ? 'red' : 'gray';
			
			const iconSpan = trendIndicator.createEl('span');
			iconSpan.style.color = color;
			iconSpan.style.fontSize = '1.5em';
			iconSpan.textContent = icon;
			
			trendIndicator.appendText(` ${trend}`);
			
			card.createEl('div', { text: `Recent: ${recent}${unit}`, cls: 'trend-current' });
			card.createEl('div', { text: `Overall: ${overall}${unit}`, cls: 'trend-overall' });
		};

		createTrendCard(
			'Confidence', 
			detailedStats.trends.confidenceTrend, 
			detailedStats.trends.recentAvgConfidence, 
			detailedStats.trends.overallAvgConfidence
		);
		
		createTrendCard(
			'Application Rate', 
			detailedStats.trends.applicationRateTrend, 
			detailedStats.trends.recentApplicationRate, 
			detailedStats.trends.overallApplicationRate
		);
	}

	/**
	 * Creates confidence distribution section
	 * @param container The container element
	 * @param entries The history entries
	 */
	private createConfidenceDistribution(container: HTMLElement, entries: HistoryEntry[]): void {
		const section = container.createDiv('statistics-section confidence-distribution');
		section.createEl('h3', { text: 'Confidence Distribution' });

		const distribution = this.historyService.getConfidenceDistribution(entries);
		const chartContainer = section.createDiv('confidence-chart');

		Object.entries(distribution).forEach(([range, count]) => {
			if (count > 0) {
				const bar = chartContainer.createDiv('confidence-bar');
				const percentage = (count / entries.length) * 100;
				
				bar.createEl('div', { text: range, cls: 'bar-label' });
				const barFill = bar.createEl('div', { cls: 'bar-fill' });
				barFill.style.width = `${Math.max(percentage, 2)}%`;  // Minimum 2% for visibility
				bar.createEl('div', { text: count.toString(), cls: 'bar-count' });
			}
		});
	}

	/**
	 * Creates time-based statistics section
	 * @param container The container element
	 * @param entries The history entries
	 */
	private createTimeBasedStatistics(container: HTMLElement, entries: HistoryEntry[]): void {
		const section = container.createDiv('statistics-section time-stats');
		section.createEl('h3', { text: 'Time Distribution (Last 7 Days)' });

		const timeStats = this.historyService.getTimeBasedStatistics(entries);
		const timeTable = section.createEl('table', { cls: 'stats-table' });
		
		// Header
		const headerRow = timeTable.createEl('tr');
		headerRow.createEl('th', { text: 'Date' });
		headerRow.createEl('th', { text: 'Count' });
		headerRow.createEl('th', { text: 'Applied' });
		headerRow.createEl('th', { text: 'Avg Confidence' });
		headerRow.createEl('th', { text: 'Languages' });

		// Get last 7 days of data, sorted by date
		const sortedTimeStats = Object.entries(timeStats)
			.sort(([a], [b]) => b.localeCompare(a))  // Sort descending by date
			.slice(0, 7);

		// Data rows
		sortedTimeStats.forEach(([date, stats]) => {
			const row = timeTable.createEl('tr');
			row.createEl('td', { text: date });
			row.createEl('td', { text: stats.count.toString() });
			row.createEl('td', { text: stats.appliedCount.toString() });
			row.createEl('td', { text: `${stats.avgConfidence}%` });
			row.createEl('td', { text: stats.languages.slice(0, 3).join(', ') }); // Show top 3 languages
		});

		if (sortedTimeStats.length === 0) {
			timeTable.remove();
			section.createDiv('no-data').textContent = 'No data for the last 7 days';
		}
	}

	/**
	 * Creates the close button
	 * @param container The container element
	 */
	private createCloseButton(container: HTMLElement): void {
		const buttonContainer = container.createDiv('modal-actions');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.justifyContent = 'flex-end';
		buttonContainer.style.paddingTop = '16px';
		buttonContainer.style.borderTop = '1px solid var(--background-modifier-border)';
		
		const closeButton = new ButtonComponent(buttonContainer);
		closeButton.setButtonText('Close');
		closeButton.setClass('mod-cta');
		closeButton.onClick(() => {
			this.close();
		});
	}
}
