import { HistoryEntry } from '../../types';

/**
 * Provides statistics and analytics for history data
 */
export class HistoryStatistics {
	/**
	 * Gets comprehensive statistics about the history
	 * @param entries The history entries to analyze
	 * @returns Object containing various statistics
	 */
	getStatistics(entries: HistoryEntry[]): {
		totalEntries: number;
		appliedEntries: number;
		methodCounts: Record<string, number>;
		languageCounts: Record<string, number>;
		avgConfidence: number;
	} {
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
	 * Gets method-specific statistics
	 * @param entries The history entries to analyze
	 * @returns Statistics broken down by detection method
	 */
	getMethodStatistics(entries: HistoryEntry[]): Record<string, {
		count: number;
		avgConfidence: number;
		appliedCount: number;
		successRate: number;
	}> {
		const methodStats: Record<string, {
			count: number;
			avgConfidence: number;
			appliedCount: number;
			successRate: number;
		}> = {};

		entries.forEach(entry => {
			if (!methodStats[entry.method]) {
				methodStats[entry.method] = {
					count: 0,
					avgConfidence: 0,
					appliedCount: 0,
					successRate: 0
				};
			}

			const stats = methodStats[entry.method];
			const oldCount = stats.count;
			
			// Update count
			stats.count++;
			
			// Update average confidence (running average)
			stats.avgConfidence = (stats.avgConfidence * oldCount + entry.confidence) / stats.count;
			
			// Update applied count
			if (entry.applied) {
				stats.appliedCount++;
			}
			
			// Update success rate
			stats.successRate = (stats.appliedCount / stats.count) * 100;
		});

		// Round confidence values
		Object.values(methodStats).forEach(stats => {
			stats.avgConfidence = Math.round(stats.avgConfidence * 100) / 100;
			stats.successRate = Math.round(stats.successRate * 100) / 100;
		});

		return methodStats;
	}

	/**
	 * Gets language-specific statistics
	 * @param entries The history entries to analyze
	 * @returns Statistics broken down by detected language
	 */
	getLanguageStatistics(entries: HistoryEntry[]): Record<string, {
		count: number;
		avgConfidence: number;
		appliedCount: number;
		successRate: number;
		methods: Record<string, number>;
	}> {
		const languageStats: Record<string, {
			count: number;
			avgConfidence: number;
			appliedCount: number;
			successRate: number;
			methods: Record<string, number>;
		}> = {};

		entries.forEach(entry => {
			if (!languageStats[entry.detectedLanguage]) {
				languageStats[entry.detectedLanguage] = {
					count: 0,
					avgConfidence: 0,
					appliedCount: 0,
					successRate: 0,
					methods: {}
				};
			}

			const stats = languageStats[entry.detectedLanguage];
			const oldCount = stats.count;
			
			// Update count
			stats.count++;
			
			// Update average confidence (running average)
			stats.avgConfidence = (stats.avgConfidence * oldCount + entry.confidence) / stats.count;
			
			// Update applied count
			if (entry.applied) {
				stats.appliedCount++;
			}
			
			// Update success rate
			stats.successRate = (stats.appliedCount / stats.count) * 100;
			
			// Count methods for this language
			stats.methods[entry.method] = (stats.methods[entry.method] || 0) + 1;
		});

		// Round confidence values
		Object.values(languageStats).forEach(stats => {
			stats.avgConfidence = Math.round(stats.avgConfidence * 100) / 100;
			stats.successRate = Math.round(stats.successRate * 100) / 100;
		});

		return languageStats;
	}

	/**
	 * Gets time-based statistics
	 * @param entries The history entries to analyze
	 * @param timeRangeMs Time range in milliseconds for grouping
	 * @returns Statistics grouped by time periods
	 */
	getTimeBasedStatistics(entries: HistoryEntry[], timeRangeMs: number = 24 * 60 * 60 * 1000): Record<string, {
		count: number;
		appliedCount: number;
		avgConfidence: number;
		languages: Set<string>;
		methods: Set<string>;
	}> {
		const timeStats: Record<string, {
			count: number;
			appliedCount: number;
			avgConfidence: number;
			languages: Set<string>;
			methods: Set<string>;
		}> = {};

		entries.forEach(entry => {
			// Group by time range
			const timeKey = Math.floor(entry.timestamp / timeRangeMs) * timeRangeMs;
			const dateKey = new Date(timeKey).toISOString().split('T')[0]; // YYYY-MM-DD format

			if (!timeStats[dateKey]) {
				timeStats[dateKey] = {
					count: 0,
					appliedCount: 0,
					avgConfidence: 0,
					languages: new Set(),
					methods: new Set()
				};
			}

			const stats = timeStats[dateKey];
			const oldCount = stats.count;
			
			// Update count
			stats.count++;
			
			// Update average confidence
			stats.avgConfidence = (stats.avgConfidence * oldCount + entry.confidence) / stats.count;
			
			// Update applied count
			if (entry.applied) {
				stats.appliedCount++;
			}
			
			// Track languages and methods
			stats.languages.add(entry.detectedLanguage);
			stats.methods.add(entry.method);
		});

		// Round confidence values and convert sets to arrays
		const result: Record<string, any> = {};
		Object.entries(timeStats).forEach(([key, stats]) => {
			result[key] = {
				...stats,
				avgConfidence: Math.round(stats.avgConfidence * 100) / 100,
				languages: Array.from(stats.languages),
				methods: Array.from(stats.methods)
			};
		});

		return result;
	}

	/**
	 * Gets confidence distribution statistics
	 * @param entries The history entries to analyze
	 * @param bucketSize Size of confidence buckets (default: 10)
	 * @returns Distribution of confidence values
	 */
	getConfidenceDistribution(entries: HistoryEntry[], bucketSize: number = 10): Record<string, number> {
		const distribution: Record<string, number> = {};

		// Initialize buckets
		for (let i = 0; i < 100; i += bucketSize) {
			const bucketLabel = `${i}-${Math.min(i + bucketSize - 1, 100)}%`;
			distribution[bucketLabel] = 0;
		}

		entries.forEach(entry => {
			const bucket = Math.floor(entry.confidence / bucketSize) * bucketSize;
			const bucketLabel = `${bucket}-${Math.min(bucket + bucketSize - 1, 100)}%`;
			distribution[bucketLabel]++;
		});

		return distribution;
	}

	/**
	 * Gets performance trends over time
	 * @param entries The history entries to analyze
	 * @returns Trend analysis data
	 */
	getPerformanceTrends(entries: HistoryEntry[]): {
		confidenceTrend: 'improving' | 'declining' | 'stable';
		applicationRateTrend: 'improving' | 'declining' | 'stable';
		recentAvgConfidence: number;
		overallAvgConfidence: number;
		recentApplicationRate: number;
		overallApplicationRate: number;
	} {
		if (entries.length === 0) {
			return {
				confidenceTrend: 'stable',
				applicationRateTrend: 'stable',
				recentAvgConfidence: 0,
				overallAvgConfidence: 0,
				recentApplicationRate: 0,
				overallApplicationRate: 0
			};
		}

		const sortedEntries = entries.sort((a, b) => a.timestamp - b.timestamp);
		const halfPoint = Math.floor(sortedEntries.length / 2);
		
		const recentEntries = sortedEntries.slice(halfPoint);
		const allEntries = sortedEntries;

		// Calculate confidence averages
		const recentAvgConfidence = recentEntries.length > 0 
			? recentEntries.reduce((sum, entry) => sum + entry.confidence, 0) / recentEntries.length 
			: 0;
		
		const overallAvgConfidence = allEntries.length > 0 
			? allEntries.reduce((sum, entry) => sum + entry.confidence, 0) / allEntries.length 
			: 0;

		// Calculate application rates
		const recentApplicationRate = recentEntries.length > 0 
			? (recentEntries.filter(e => e.applied).length / recentEntries.length) * 100 
			: 0;
		
		const overallApplicationRate = allEntries.length > 0 
			? (allEntries.filter(e => e.applied).length / allEntries.length) * 100 
			: 0;

		// Determine trends
		const confidenceDiff = recentAvgConfidence - overallAvgConfidence;
		const applicationDiff = recentApplicationRate - overallApplicationRate;

		const confidenceTrend = Math.abs(confidenceDiff) < 5 ? 'stable' : 
			confidenceDiff > 0 ? 'improving' : 'declining';
		
		const applicationRateTrend = Math.abs(applicationDiff) < 5 ? 'stable' : 
			applicationDiff > 0 ? 'improving' : 'declining';

		return {
			confidenceTrend,
			applicationRateTrend,
			recentAvgConfidence: Math.round(recentAvgConfidence * 100) / 100,
			overallAvgConfidence: Math.round(overallAvgConfidence * 100) / 100,
			recentApplicationRate: Math.round(recentApplicationRate * 100) / 100,
			overallApplicationRate: Math.round(overallApplicationRate * 100) / 100
		};
	}
}
