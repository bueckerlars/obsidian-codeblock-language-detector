import { DetectorConfiguration } from '../types';

/**
 * Returns enabled detector names sorted by their configured order.
 * Uses Object.keys to avoid Object.entries unsafe-* typing issues.
 */
export function getEnabledDetectorNamesSorted(
	configs: Record<string, DetectorConfiguration>
): string[] {
	return Object.keys(configs)
		.filter((name) => configs[name]?.enabled)
		.sort((a, b) => configs[a].order - configs[b].order);
}
