import { Setting } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../../../main';
import { DetectorConfiguration } from '../../../types';
import { DragDropHandler } from './DragDropHandler';
import { LanguageToggleGrid } from './LanguageToggleGrid';
import { DetectorConfigUtils } from '../utils/DetectorConfigUtils';

/**
 * Component for rendering detector configuration cards
 */
export class DetectorConfigCard {
	private plugin: AutoSyntaxHighlightPlugin;
	private dragDropHandler: DragDropHandler;
	private configUtils: DetectorConfigUtils;
	private onDisplayRefresh: () => void;

	constructor(plugin: AutoSyntaxHighlightPlugin, dragDropHandler: DragDropHandler, onDisplayRefresh: () => void) {
		this.plugin = plugin;
		this.dragDropHandler = dragDropHandler;
		this.configUtils = new DetectorConfigUtils(plugin);
		this.onDisplayRefresh = onDisplayRefresh;
	}

	/**
	 * Creates a detector configuration card
	 * @param container The container element
	 * @param detector The detector instance
	 * @param order The display order
	 * @param enabled Whether the detector is enabled
	 */
	create(container: HTMLElement, detector: any, order: number, enabled: boolean): void {
		const detectorName = detector.getName();
		const detectorConfig = this.configUtils.getDetectorConfig(detectorName);
		
		const card = container.createDiv(`detector-config-card ${enabled ? 'enabled' : 'disabled'}`);
		
		// Header with improved layout
		const header = card.createDiv('detector-header');
		
		// Left section: Drag handle and checkbox
		const leftSection = header.createDiv('detector-left-section');
		
		// Drag handle
		const dragHandle = leftSection.createSpan('detector-drag-handle');
		dragHandle.textContent = '⋮⋮';
		dragHandle.title = 'Drag to reorder';
		dragHandle.draggable = true;
		
		// Toggle checkbox
		const toggle = leftSection.createEl('input', { type: 'checkbox' });
		toggle.checked = enabled;
		toggle.addEventListener('change', async () => {
			await this.configUtils.toggleDetector(detectorName, toggle.checked);
			this.onDisplayRefresh();
		});
		
		// Center section: Detector info
		const centerSection = header.createDiv('detector-center-section');
		const title = centerSection.createEl('h4', { text: detector.getDisplayName() });
		const desc = centerSection.createEl('p', { 
			text: detector.getDescription(),
			cls: 'detector-description' 
		});
		
		// Right section: Controls
		const rightSection = header.createDiv('detector-right-section');
		
		// Expand/Collapse button for settings (only shown if enabled)
		if (enabled) {
			const expandButton = rightSection.createSpan('detector-expand-btn');
			
			// Check if this detector card should be expanded based on saved UI state
			const isExpanded = this.plugin.settings.uiState?.expandedDetectorCards?.[detectorName] || false;
			
			expandButton.textContent = isExpanded ? '▼' : '▶';
			expandButton.title = isExpanded ? 'Hide settings' : 'Show settings';
			expandButton.classList.add(isExpanded ? 'expanded' : 'collapsed');
			
			// Configuration section
			const configSection = card.createDiv('detector-config-section config-section');
			if (isExpanded) {
				configSection.classList.remove('collapsed');
				// Mark as pre-expanded to prevent animation on re-render
				configSection.classList.add('pre-expanded');
			} else {
				configSection.classList.add('collapsed');
			}
			
			// Expand/collapse functionality
			expandButton.addEventListener('click', () => {
				this.toggleConfigSection(configSection, expandButton, detectorName);
			});
			
			// Confidence threshold
			this.createConfidenceThresholdSetting(configSection, detectorName, detectorConfig);
			
			// Detector-specific configuration
			if (detector.isConfigurable && detector.isConfigurable()) {
				this.createDetectorSpecificConfig(configSection, detector, detectorConfig);
			}
		}
		
		// Make cards sortable with drag and drop
		this.setupSortable(card, detectorName, order);
	}

	/**
	 * Toggles the configuration section visibility
	 * @param configSection The configuration section element
	 * @param expandButton The expand button element
	 * @param detectorName The name of the detector for state persistence
	 */
	private async toggleConfigSection(configSection: HTMLElement, expandButton: HTMLElement, detectorName: string): Promise<void> {
		const isCollapsed = configSection.classList.contains('collapsed');
		
		if (isCollapsed) {
			// Expanding - remove pre-expanded class to allow animation
			configSection.classList.remove('pre-expanded');
			configSection.classList.remove('collapsed');
			expandButton.textContent = '▼';
			expandButton.classList.remove('collapsed');
			expandButton.classList.add('expanded');
			expandButton.title = 'Hide settings';
			
			// Save expanded state
			await this.saveDetectorExpandState(detectorName, true);
		} else {
			// Collapsing - remove pre-expanded class to allow animation
			configSection.classList.remove('pre-expanded');
			configSection.classList.add('collapsed');
			expandButton.textContent = '▶';
			expandButton.classList.remove('expanded');
			expandButton.classList.add('collapsed');
			expandButton.title = 'Show settings';
			
			// Save collapsed state
			await this.saveDetectorExpandState(detectorName, false);
		}
	}

	/**
	 * Saves the expand/collapse state of a detector card
	 * @param detectorName The name of the detector
	 * @param isExpanded Whether the detector card is expanded
	 */
	private async saveDetectorExpandState(detectorName: string, isExpanded: boolean): Promise<void> {
		// Initialize uiState if it doesn't exist
		if (!this.plugin.settings.uiState) {
			this.plugin.settings.uiState = {
				expandedDetectorCards: {}
			};
		}
		
		if (!this.plugin.settings.uiState.expandedDetectorCards) {
			this.plugin.settings.uiState.expandedDetectorCards = {};
		}
		
		// Update the state
		this.plugin.settings.uiState.expandedDetectorCards[detectorName] = isExpanded;
		
		// Save settings
		await this.plugin.saveSettings();
	}

	/**
	 * Creates the confidence threshold setting
	 * @param configSection The configuration section
	 * @param detectorName The detector name
	 * @param detectorConfig The detector configuration
	 */
	private createConfidenceThresholdSetting(configSection: HTMLElement, detectorName: string, detectorConfig: DetectorConfiguration): void {
		new Setting(configSection)
			.setName('Confidence threshold')
			.setDesc('Minimum confidence required for this detector (0-100)')
			.addSlider(slider => {
				slider
					.setLimits(0, 100, 5)
					.setValue(detectorConfig.confidenceThreshold)
					.setDynamicTooltip()
					.onChange(async (value) => {
						await this.configUtils.updateDetectorConfig(detectorName, { 
							...detectorConfig, 
							confidenceThreshold: value 
						});
						// Update display
						const valueEl = slider.sliderEl.parentElement?.querySelector('.confidence-value');
						if (valueEl) {
							valueEl.textContent = `${value}%`;
						}
					});
			})
			.then(setting => {
				const valueSpan = setting.descEl.createSpan({ 
					text: ` (${detectorConfig.confidenceThreshold}%)`,
					cls: 'confidence-value'
				});
			});
	}

	/**
	 * Creates detector-specific configuration
	 * @param container The container element
	 * @param detector The detector instance
	 * @param detectorConfig The detector configuration
	 */
	private createDetectorSpecificConfig(container: HTMLElement, detector: any, detectorConfig: DetectorConfiguration): void {
		const detectorName = detector.getName();
		
		if (detectorName === 'vscode-ml') {
			this.createVSCodeDetectorConfig(container, detector);
		} else if (detectorName === 'pattern-matching') {
			this.createPatternMatchingDetectorConfig(container, detector, detectorConfig);
		}
	}

	/**
	 * Creates VSCode detector-specific configuration
	 * @param container The container element
	 * @param detector The detector instance
	 */
	private createVSCodeDetectorConfig(container: HTMLElement, detector: any): void {
		container.createEl('h5', { text: 'VSCode ML Detection Configuration' });
		
		const vscodeDetector = this.plugin.detectionEngine.getVSCodeDetector();
		if (!vscodeDetector) return;
		
		// Model status info
		const statusContainer = container.createDiv('detector-status');
		const isReady = vscodeDetector.isReady();
		
		const statusItem = statusContainer.createDiv('status-item');
		const statusIcon = statusItem.createSpan('status-icon');
		statusIcon.textContent = isReady ? '✓' : '○';
		statusIcon.classList.add(isReady ? 'ready' : 'not-ready');
		
		const statusLabel = statusItem.createSpan('status-label');
		statusLabel.textContent = `Model Status: ${isReady ? 'Ready' : 'Not Initialized'}`;
		
		// Initialize button if not ready
		if (!isReady) {
			const initButton = container.createEl('button', { 
				text: 'Initialize Model', 
				cls: 'init-model-btn' 
			});
			initButton.addEventListener('click', async () => {
				try {
					initButton.textContent = 'Initializing...';
					initButton.disabled = true;
					await vscodeDetector.initialize();
					this.onDisplayRefresh();
				} catch (error) {
					console.error('Failed to initialize VSCode model:', error);
					initButton.textContent = 'Initialization Failed';
					initButton.classList.add('error');
				}
			});
		}
		
		// Model info
		const infoContainer = container.createDiv('detector-info');
		infoContainer.createEl('p', { 
			text: 'Powered by Microsoft\'s VSCode Language Detection using machine learning (guesslang model).',
			cls: 'detector-description'
		});
		
		// Languages supported
		const languagesContainer = container.createDiv('supported-languages');
		languagesContainer.createEl('h6', { text: 'Supported Languages' });
		
		const supportedLanguages = vscodeDetector.getAvailableLanguages();
		const languageList = languagesContainer.createDiv('language-list');
		supportedLanguages.slice(0, 15).forEach(lang => {
			const langTag = languageList.createSpan('language-tag');
			langTag.textContent = lang;
		});
		
		if (supportedLanguages.length > 15) {
			const moreInfo = languageList.createSpan('more-languages');
			moreInfo.textContent = `... and ${supportedLanguages.length - 15} more`;
		}
	}

	/**
	 * Creates pattern matching detector-specific configuration
	 * @param container The container element
	 * @param detector The detector instance
	 * @param detectorConfig The detector configuration
	 */
	private createPatternMatchingDetectorConfig(container: HTMLElement, detector: any, detectorConfig: DetectorConfiguration): void {
		container.createEl('h5', { text: 'Pattern Matching Configuration' });
		
		const patternDetector = this.plugin.detectionEngine.getPatternMatchingDetector();
		if (!patternDetector) return;
		
		const availableLanguages = patternDetector.getAvailableLanguages();
		const enabledLanguages = detectorConfig.config.enabledLanguages || [];
		
		// Create language toggle grid
		const languageToggleGrid = new LanguageToggleGrid(
			this.plugin, 
			detector.getName(), 
			() => this.onDisplayRefresh()
		);
		
		languageToggleGrid.create(container, availableLanguages, enabledLanguages);
	}

	/**
	 * Sets up sortable functionality for the card
	 * @param card The card element
	 * @param detectorName The detector name
	 * @param currentOrder The current order
	 */
	private setupSortable(card: HTMLElement, detectorName: string, currentOrder: number): void {
		// Add up/down buttons for alternative reordering
		const rightSection = card.querySelector('.detector-right-section') as HTMLElement;
		const orderControls = rightSection.createDiv('order-controls');
		
		const upBtn = orderControls.createEl('button', { text: '↑', cls: 'order-btn' });
		const downBtn = orderControls.createEl('button', { text: '↓', cls: 'order-btn' });
		
		upBtn.addEventListener('click', async () => {
			await this.configUtils.moveDetector(detectorName, currentOrder - 1);
			this.onDisplayRefresh();
		});
		
		downBtn.addEventListener('click', async () => {
			await this.configUtils.moveDetector(detectorName, currentOrder + 1);
			this.onDisplayRefresh();
		});
		
		// Disable buttons at boundaries
		const detectionOrder = this.configUtils.getDetectionOrder();
		upBtn.disabled = currentOrder === 0;
		downBtn.disabled = currentOrder === detectionOrder.length - 1;
		
		// Implement proper drag and drop
		this.dragDropHandler.setupDragAndDrop(card, detectorName);
	}
}
