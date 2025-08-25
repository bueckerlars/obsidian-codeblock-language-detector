import AutoSyntaxHighlightPlugin from '../../../../main';
import { DetectorConfigCard } from '../components/DetectorConfigCard';
import { DragDropHandler } from '../components/DragDropHandler';
import { DetectorConfigUtils } from '../utils/DetectorConfigUtils';

/**
 * Settings section for detector configuration
 */
export class DetectorConfigurationSection {
	private plugin: AutoSyntaxHighlightPlugin;
	private configUtils: DetectorConfigUtils;
	private onDisplayRefresh: () => void;

	constructor(plugin: AutoSyntaxHighlightPlugin, onDisplayRefresh: () => void) {
		this.plugin = plugin;
		this.configUtils = new DetectorConfigUtils(plugin);
		this.onDisplayRefresh = onDisplayRefresh;
	}

	/**
	 * Creates the detector configuration settings section
	 * @param containerEl The container element to add settings to
	 */
	create(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Detector Configuration' });
		
		const descEl = containerEl.createEl('p', { 
			cls: 'setting-item-description',
			text: 'Configure individual detectors, their confidence thresholds, and execution order. Drag detectors to reorder them.' 
		});

		const registeredDetectors = this.plugin.detectionEngine.getRegisteredDetectors();
		const detectionOrder = this.configUtils.getDetectionOrder();

		// Create sortable detector list
		const detectorListContainer = containerEl.createDiv('detector-list-container');

		// Create drag drop handler
		const dragDropHandler = new DragDropHandler(this.plugin, () => this.onDisplayRefresh());

		// Create detector config card component
		const detectorConfigCard = new DetectorConfigCard(this.plugin, dragDropHandler, () => this.onDisplayRefresh());

		// Add enabled detectors first (in order)
		detectionOrder.forEach((detectorName, index) => {
			const detector = registeredDetectors.find(d => d.getName() === detectorName);
			if (detector) {
				detectorConfigCard.create(detectorListContainer, detector, index, true);
			}
		});

		// Add disabled detectors
		registeredDetectors
			.filter(detector => !detectionOrder.includes(detector.getName()))
			.forEach((detector, index) => {
				detectorConfigCard.create(detectorListContainer, detector, detectionOrder.length + index, false);
			});
	}
}
