import { App, PluginSettingTab, Setting } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../main';
import { DetectorConfiguration, TriggerBehavior, ProcessingScope } from '../types';

/**
 * Dynamic settings tab that adapts to registered detectors
 */
export class DynamicAutoSyntaxHighlightSettingsTab extends PluginSettingTab {
	plugin: AutoSyntaxHighlightPlugin;

	constructor(app: App, plugin: AutoSyntaxHighlightPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Title
		containerEl.createEl('h1', { text: 'CodeBlock Language Detector Settings' });

		// Trigger Behavior Section
		this.createTriggerBehaviorSection(containerEl);

		// Processing Scope Section
		this.createProcessingScopeSection(containerEl);

		// Detection Engine Overview Section
		this.createDetectionEngineOverviewSection(containerEl);

		// Dynamic Detector Configuration Section
		this.createDetectorConfigurationSection(containerEl);

		// History Settings Section
		this.createHistorySettingsSection(containerEl);

		// Notification Settings Section
		this.createNotificationSettingsSection(containerEl);

		// Advanced Settings Section
		this.createAdvancedSettingsSection(containerEl);
	}

	private createTriggerBehaviorSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Trigger Behavior' });

		new Setting(containerEl)
			.setName('When to detect language')
			.setDesc('Choose when the plugin should automatically detect and apply language tags')
			.addDropdown(dropdown => {
				dropdown
					.addOption('auto-on-open', 'When opening a note')
					.addOption('auto-on-edit', 'When editing a note')
					.addOption('auto-on-save', 'When saving a note')
					.addOption('manual', 'Manual only (via command)')
					.setValue(this.plugin.settings.triggerBehavior)
					.onChange(async (value: TriggerBehavior) => {
						this.plugin.settings.triggerBehavior = value;
						await this.plugin.saveSettings();
					});
			});
	}

	private createProcessingScopeSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Processing Scope' });

		new Setting(containerEl)
			.setName('Code block processing scope')
			.setDesc('Choose whether to process code blocks in the current note only or across the entire vault')
			.addDropdown(dropdown => {
				dropdown
					.addOption('current-note', 'Current note only')
					.addOption('entire-vault', 'Entire vault')
					.setValue(this.plugin.settings.processingScope)
					.onChange(async (value: ProcessingScope) => {
						this.plugin.settings.processingScope = value;
						await this.plugin.saveSettings();
					});
			});
	}

	private createDetectionEngineOverviewSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Detection Engine' });

		const registeredDetectors = this.plugin.detectionEngine.getRegisteredDetectors();
		const detectionOrder = this.getDetectionOrder();

		// Global confidence threshold
		new Setting(containerEl)
			.setName('Global confidence threshold')
			.setDesc('Default confidence threshold for detectors that don\'t have their own threshold configured (0-100)')
			.addSlider(slider => {
				slider
					.setLimits(0, 100, 5)
					.setValue(this.plugin.settings.confidenceThreshold)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.confidenceThreshold = value;
						await this.plugin.saveSettings();
						// Update the display
						const valueEl = slider.sliderEl.parentElement?.querySelector('.setting-item-info');
						if (valueEl) {
							valueEl.textContent = `Current: ${value}%`;
						}
					});
			})
			.then(setting => {
				// Add current value display
				const desc = setting.descEl;
				desc.createSpan({ text: ` (Current: ${this.plugin.settings.confidenceThreshold}%)` });
			});
	}

	private createDetectorConfigurationSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Detector Configuration' });
		
		const descEl = containerEl.createEl('p', { 
			cls: 'setting-item-description',
			text: 'Configure individual detectors, their confidence thresholds, and execution order. Drag detectors to reorder them.' 
		});

		const registeredDetectors = this.plugin.detectionEngine.getRegisteredDetectors();
		const detectionOrder = this.getDetectionOrder();

		// Create sortable detector list
		const detectorListContainer = containerEl.createDiv('detector-list-container');

		// Add enabled detectors first (in order)
		detectionOrder.forEach((detectorName, index) => {
			const detector = registeredDetectors.find(d => d.getName() === detectorName);
			if (detector) {
				this.createDetectorConfigCard(detectorListContainer, detector, index, true);
			}
		});

		// Add disabled detectors
		registeredDetectors
			.filter(detector => !detectionOrder.includes(detector.getName()))
			.forEach((detector, index) => {
				this.createDetectorConfigCard(detectorListContainer, detector, detectionOrder.length + index, false);
			});
	}

	private createDetectorConfigCard(container: HTMLElement, detector: any, order: number, enabled: boolean): void {
		const detectorName = detector.getName();
		const detectorConfig = this.getDetectorConfig(detectorName);
		
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
			await this.toggleDetector(detectorName, toggle.checked);
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
			expandButton.textContent = '▶';
			expandButton.title = 'Show settings';
			expandButton.classList.add('collapsed');
			
			// Configuration section (initially hidden)
			const configSection = card.createDiv('detector-config-section');
			configSection.style.display = 'none';
			configSection.classList.add('collapsed');
			
			// Expand/collapse functionality
			expandButton.addEventListener('click', () => {
				const isCollapsed = configSection.style.display === 'none';
				
				if (isCollapsed) {
					// Expanding
					configSection.style.display = 'block';
					configSection.classList.remove('collapsed');
					expandButton.textContent = '▼';
					expandButton.classList.remove('collapsed');
					expandButton.classList.add('expanded');
					expandButton.title = 'Hide settings';
				} else {
					// Collapsing
					configSection.classList.add('collapsed');
					expandButton.textContent = '▶';
					expandButton.classList.remove('expanded');
					expandButton.classList.add('collapsed');
					expandButton.title = 'Show settings';
					
					// Hide after animation completes
					setTimeout(() => {
						if (configSection.classList.contains('collapsed')) {
							configSection.style.display = 'none';
						}
					}, 300);
				}
			});
			
			// Confidence threshold
			new Setting(configSection)
				.setName('Confidence threshold')
				.setDesc('Minimum confidence required for this detector (0-100)')
				.addSlider(slider => {
					slider
						.setLimits(0, 100, 5)
						.setValue(detectorConfig.confidenceThreshold)
						.setDynamicTooltip()
						.onChange(async (value) => {
							await this.updateDetectorConfig(detectorName, { 
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
			
			// Detector-specific configuration
			if (detector.isConfigurable && detector.isConfigurable()) {
				this.createDetectorSpecificConfig(configSection, detector, detectorConfig);
			}
		}
		
		// Make cards sortable with drag and drop
		this.makeSortable(card, detectorName, order);
	}

	private createDetectorSpecificConfig(container: HTMLElement, detector: any, detectorConfig: DetectorConfiguration): void {
		const detectorName = detector.getName();
		
		if (detectorName === 'vscode-ml') {
			// VSCode ML Detector specific configuration
			container.createEl('h5', { text: 'VSCode ML Detection Configuration' });
			
			const vscodeDetector = this.plugin.detectionEngine.getVSCodeDetector();
			if (!vscodeDetector) return;
			
			// Model status info
			const statusContainer = container.createDiv('detector-status');
			const isReady = vscodeDetector.isReady();
			
			const statusItem = statusContainer.createDiv('status-item');
			const statusIcon = statusItem.createSpan('status-icon');
			statusIcon.textContent = isReady ? '✓' : '○';
			statusIcon.style.color = isReady ? 'green' : 'orange';
			
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
						this.display(); // Refresh display to show updated status
					} catch (error) {
						console.error('Failed to initialize VSCode model:', error);
						initButton.textContent = 'Initialization Failed';
						initButton.style.color = 'red';
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
			
		} else if (detectorName === 'pattern-matching') {
			// Pattern matching specific configuration
			container.createEl('h5', { text: 'Pattern Matching Configuration' });
			
			const patternDetector = this.plugin.detectionEngine.getPatternMatchingDetector();
			if (!patternDetector) return;
			
			const availableLanguages = patternDetector.getAvailableLanguages();
			const enabledLanguages = detectorConfig.config.enabledLanguages || [];
			
			// Quick actions
			const quickActionsContainer = container.createDiv('quick-actions');
			const selectAllBtn = quickActionsContainer.createEl('button', { text: 'Select All', cls: 'select-all-btn' });
			const selectNoneBtn = quickActionsContainer.createEl('button', { text: 'Select None', cls: 'select-none-btn' });
			
			selectAllBtn.addEventListener('click', async () => {
				await this.updateDetectorConfig(detectorName, {
					...detectorConfig,
					config: { ...detectorConfig.config, enabledLanguages: [...availableLanguages] }
				});
				this.display(); // Refresh display
			});
			
			selectNoneBtn.addEventListener('click', async () => {
				await this.updateDetectorConfig(detectorName, {
					...detectorConfig,
					config: { ...detectorConfig.config, enabledLanguages: [] }
				});
				this.display(); // Refresh display
			});
			
			// Language grid
			const languageContainer = container.createDiv('language-toggles');
			
			availableLanguages.forEach(language => {
				const isEnabled = enabledLanguages.includes(language);
				
				const languageItem = languageContainer.createDiv(`language-item ${isEnabled ? 'enabled' : 'disabled'}`);
				
				// Toggle icon
				const toggleIcon = languageItem.createSpan('toggle-icon');
				toggleIcon.textContent = isEnabled ? '✓' : '○';
				
				// Language name
				const languageLabel = languageItem.createSpan('language-label');
				languageLabel.textContent = language;
				
				// Click handler
				languageItem.addEventListener('click', async () => {
					const currentlyEnabled = enabledLanguages.includes(language);
					let newEnabledLanguages;
					
					if (currentlyEnabled) {
						newEnabledLanguages = enabledLanguages.filter((lang: string) => lang !== language);
					} else {
						newEnabledLanguages = [...enabledLanguages, language];
					}
					
					await this.updateDetectorConfig(detectorName, {
						...detectorConfig,
						config: { ...detectorConfig.config, enabledLanguages: newEnabledLanguages }
					});
					this.display(); // Refresh display
				});
			});
			
			// Show count
			const countInfo = container.createDiv('enabled-count');
			countInfo.textContent = `${enabledLanguages.length} von ${availableLanguages.length} languages enabled`;
		}
	}

	private makeSortable(card: HTMLElement, detectorName: string, currentOrder: number): void {
		const dragHandle = card.querySelector('.detector-drag-handle') as HTMLElement;
		if (!dragHandle) return;
		
		// Add up/down buttons for alternative reordering
		const rightSection = card.querySelector('.detector-right-section') as HTMLElement;
		const orderControls = rightSection.createDiv('order-controls');
		
		const upBtn = orderControls.createEl('button', { text: '↑', cls: 'order-btn' });
		const downBtn = orderControls.createEl('button', { text: '↓', cls: 'order-btn' });
		
		upBtn.addEventListener('click', async () => {
			await this.moveDetector(detectorName, currentOrder - 1);
		});
		
		downBtn.addEventListener('click', async () => {
			await this.moveDetector(detectorName, currentOrder + 1);
		});
		
		// Disable buttons at boundaries
		const detectionOrder = this.getDetectionOrder();
		upBtn.disabled = currentOrder === 0;
		downBtn.disabled = currentOrder === detectionOrder.length - 1;
		
		// Implement proper drag and drop
		this.setupDragAndDrop(card, detectorName);
	}
	
	private setupDragAndDrop(card: HTMLElement, detectorName: string): void {
		const dragHandle = card.querySelector('.detector-drag-handle') as HTMLElement;
		const container = card.parentElement as HTMLElement;
		
		// Only allow dragging of enabled detectors
		if (card.classList.contains('disabled')) {
			dragHandle.draggable = false;
			return;
		}
		
		// Make the card draggable
		card.draggable = true;
		
		// Setup container drop handling only once per container
		if (container && !container.hasAttribute('data-drop-setup')) {
			this.setupContainerDrop(container);
		}
		
		// Make the entire card draggable, but only when dragging from the handle
		let isDraggingFromHandle = false;
		
		// Handle mouse down on drag handle
		dragHandle.addEventListener('mousedown', () => {
			isDraggingFromHandle = true;
		});
		
		// Reset flag when mouse leaves handle
		dragHandle.addEventListener('mouseleave', () => {
			isDraggingFromHandle = false;
		});
		
		// Make card draggable only when handle is pressed
		card.addEventListener('dragstart', (e) => {
			if (!isDraggingFromHandle) {
				e.preventDefault();
				return;
			}
			
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', detectorName);
				
				// Create drag image of the entire card
				const dragImage = card.cloneNode(true) as HTMLElement;
				dragImage.style.position = 'absolute';
				dragImage.style.top = '-1000px';
				dragImage.style.width = card.offsetWidth + 'px';
				dragImage.style.opacity = '0.8';
				dragImage.style.transform = 'rotate(2deg)';
				document.body.appendChild(dragImage);
				
				e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
				
				// Clean up drag image after a short delay
				setTimeout(() => {
					document.body.removeChild(dragImage);
				}, 0);
			}
			
			card.classList.add('dragging');
			this.setupDragPreview(container, detectorName);
		});
		
		// Drag end
		card.addEventListener('dragend', () => {
			card.classList.remove('dragging');
			isDraggingFromHandle = false;
			this.cleanupDragPreview(container);
		});
		
		// Drop zone setup for each card (only for enabled detectors)
		card.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (card.classList.contains('dragging') || card.classList.contains('disabled')) return;
			
			const draggingCard = container.querySelector('.dragging') as HTMLElement;
			if (!draggingCard) return;
			
			// Determine if cursor is in upper or lower half of the card
			const rect = card.getBoundingClientRect();
			const dropY = e.clientY - rect.top;
			const isInLowerHalf = dropY > rect.height / 2;
			
			// Update preview
			this.updateDragPreview(container, detectorName, isInLowerHalf);
		});
		
		card.addEventListener('drop', async (e) => {
			e.preventDefault();
			const draggedDetectorName = e.dataTransfer?.getData('text/plain');
			
			if (!draggedDetectorName || draggedDetectorName === detectorName || card.classList.contains('disabled')) return;
			
			// Use placeholder position to determine new order
			await this.handleDrop(container, draggedDetectorName);
		});
	}
	
	private setupContainerDrop(container: HTMLElement): void {
		// Prevent duplicate event listeners
		if (container.hasAttribute('data-drop-setup')) return;
		container.setAttribute('data-drop-setup', 'true');
		
		container.addEventListener('dragover', (e) => {
			e.preventDefault();
		});
		
		container.addEventListener('drop', async (e) => {
			e.preventDefault();
			const draggedDetectorName = e.dataTransfer?.getData('text/plain');
			
			if (!draggedDetectorName) return;
			
			await this.handleDrop(container, draggedDetectorName);
		});
	}
	
	private async handleDrop(container: HTMLElement, draggedDetectorName: string): Promise<void> {
		// Find placeholder position
		const placeholder = container.querySelector('.drag-placeholder');
		if (!placeholder) {
			return;
		}
		
		// Get all enabled detector cards (excluding the dragged one)
		const allEnabledCards = Array.from(container.querySelectorAll('.detector-config-card.enabled'))
			.filter(card => {
				const detectorName = this.getDetectorNameFromCard(card as HTMLElement);
				return detectorName !== draggedDetectorName;
			}) as HTMLElement[];
		
		// Find position based on placeholder location
		let newOrder = 0;
		
		for (let i = 0; i < allEnabledCards.length; i++) {
			const card = allEnabledCards[i];
			const cardRect = card.getBoundingClientRect();
			const placeholderRect = placeholder.getBoundingClientRect();
			
			if (placeholderRect.top < cardRect.top) {
				newOrder = i;
				break;
			} else {
				newOrder = i + 1;
			}
		}
		
		await this.moveDetectorToPosition(draggedDetectorName, newOrder);
	}
	
	private setupDragPreview(container: HTMLElement, draggedDetectorName: string): void {
		// Add preview placeholder
		const draggedCard = container.querySelector(`[data-detector-name="${draggedDetectorName}"]`) as HTMLElement;
		if (!draggedCard) {
			// Set data attribute for future reference
			const allCards = container.querySelectorAll('.detector-config-card');
			allCards.forEach((card, index) => {
				const detectorName = this.getDetectorNameFromCard(card as HTMLElement);
				(card as HTMLElement).setAttribute('data-detector-name', detectorName);
			});
		}
		
		// Create placeholder element
		const placeholder = container.createDiv('drag-placeholder');
		placeholder.textContent = `Drop ${draggedDetectorName} here`;
		placeholder.style.display = 'none';
	}
	
	private updateDragPreview(container: HTMLElement, targetDetectorName: string, insertAfter: boolean): void {
		// Remove existing placeholder
		const existingPlaceholder = container.querySelector('.drag-placeholder');
		if (existingPlaceholder) {
			existingPlaceholder.remove();
		}
		
		// Find target card and dragged card
		const targetCard = Array.from(container.querySelectorAll('.detector-config-card')).find(card => {
			const detectorName = this.getDetectorNameFromCard(card as HTMLElement);
			return detectorName === targetDetectorName;
		}) as HTMLElement;
		
		const draggedCard = container.querySelector('.detector-config-card.dragging') as HTMLElement;
		
		if (!targetCard || targetCard.classList.contains('dragging')) return;
		
		// Get the current position of the dragged detector
		const draggedDetectorName = this.getDraggedDetectorName(container);
		if (!draggedDetectorName) return;
		
		const detectionOrder = this.getDetectionOrder();
		const draggedIndex = detectionOrder.indexOf(draggedDetectorName);
		const targetIndex = detectionOrder.indexOf(targetDetectorName);
		
		// Calculate the new position that would result from this drop
		let newPosition: number;
		if (insertAfter) {
			newPosition = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
		} else {
			newPosition = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
		}
		
		// Don't show placeholder if we're dropping at the same position
		if (newPosition === draggedIndex) {
			return;
		}
		
		// Create new placeholder
		const placeholder = container.createDiv('drag-placeholder');
		const placeholderContent = placeholder.createDiv('placeholder-content');
		const placeholderIcon = placeholderContent.createSpan('placeholder-icon');
		placeholderIcon.textContent = '↓';
		const placeholderText = placeholderContent.createSpan('placeholder-text');
		placeholderText.textContent = 'Drop here';
		
		// Insert placeholder
		if (insertAfter) {
			targetCard.insertAdjacentElement('afterend', placeholder);
		} else {
			targetCard.insertAdjacentElement('beforebegin', placeholder);
		}
	}
	
	private cleanupDragPreview(container: HTMLElement): void {
		// Remove placeholder
		const placeholder = container.querySelector('.drag-placeholder');
		if (placeholder) {
			placeholder.remove();
		}
		
		// Remove all visual feedback classes
		const allCards = container.querySelectorAll('.detector-config-card');
		allCards.forEach(card => {
			card.classList.remove('drop-target', 'drop-target-above', 'drop-target-below');
		});
	}
	
	private getDraggedDetectorName(container: HTMLElement): string | null {
		const draggedCard = container.querySelector('.detector-config-card.dragging') as HTMLElement;
		if (!draggedCard) return null;
		
		return this.getDetectorNameFromCard(draggedCard);
	}
	

	
	private getDetectorNameFromCard(card: HTMLElement): string {
		// Extract detector name from the card's data or by looking at the title
		const titleElement = card.querySelector('.detector-center-section h4');
		if (!titleElement) return '';
		
		// We need to find the detector name by matching the display name
		const displayName = titleElement.textContent || '';
		const registeredDetectors = this.plugin.detectionEngine.getRegisteredDetectors();
		
		for (const detector of registeredDetectors) {
			if (detector.getDisplayName() === displayName) {
				return detector.getName();
			}
		}
		
		return '';
	}
	
	private async moveDetectorToPosition(detectorName: string, newOrder: number): Promise<void> {
		const detectionOrder = this.getDetectionOrder();
		const currentIndex = detectionOrder.indexOf(detectorName);
		
		if (currentIndex === -1) {
			return;
		}
		
		if (currentIndex === newOrder) {
			// No change needed
			return;
		}
		
		// Remove from current position
		const newDetectionOrder = [...detectionOrder];
		newDetectionOrder.splice(currentIndex, 1);
		
		// Insert at new position
		newDetectionOrder.splice(newOrder, 0, detectorName);
		
		// Update all order values
		for (let i = 0; i < newDetectionOrder.length; i++) {
			const detName = newDetectionOrder[i];
			const config = this.getDetectorConfig(detName);
			await this.updateDetectorConfig(detName, {
				...config,
				order: i
			});
		}
		
		this.display(); // Refresh display
	}

	private async toggleDetector(detectorName: string, enabled: boolean): Promise<void> {
		const currentConfig = this.getDetectorConfig(detectorName);
		
		await this.updateDetectorConfig(detectorName, {
			...currentConfig,
			enabled: enabled
		});
		
		this.display(); // Refresh the entire display
	}

	private async moveDetector(detectorName: string, newOrder: number): Promise<void> {
		const detectionOrder = this.getDetectionOrder();
		const currentIndex = detectionOrder.indexOf(detectorName);
		
		if (currentIndex === -1 || newOrder < 0 || newOrder >= detectionOrder.length) {
			return;
		}
		
		// Reorder the array
		const newDetectionOrder = [...detectionOrder];
		newDetectionOrder.splice(currentIndex, 1);
		newDetectionOrder.splice(newOrder, 0, detectorName);
		
		// Update all order values
		for (let i = 0; i < newDetectionOrder.length; i++) {
			const detName = newDetectionOrder[i];
			const config = this.getDetectorConfig(detName);
			await this.updateDetectorConfig(detName, {
				...config,
				order: i
			});
		}
		
		this.display(); // Refresh display
	}

	private async updateDetectorConfig(detectorName: string, config: DetectorConfiguration): Promise<void> {
		// Ensure detectorConfigurations exists
		if (!this.plugin.settings.detectorConfigurations) {
			this.plugin.settings.detectorConfigurations = {};
		}
		
		this.plugin.settings.detectorConfigurations[detectorName] = config;
		await this.plugin.saveSettings();
		
		// Apply the configuration to the detection engine
		this.plugin.updateDetectionEngineSettings();
	}

	private getDetectorConfig(detectorName: string): DetectorConfiguration {
		const configs = this.plugin.settings.detectorConfigurations || {};
		return configs[detectorName] || {
			enabled: true,
			confidenceThreshold: this.plugin.settings.confidenceThreshold,
			order: 0,
			config: {}
		};
	}

	private getDetectionOrder(): string[] {
		const configs = this.plugin.settings.detectorConfigurations || {};
		
		return Object.entries(configs)
			.filter(([_, config]) => config.enabled)
			.sort((a, b) => a[1].order - b[1].order)
			.map(([name, _]) => name);
	}

	private createHistorySettingsSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'History & Undo' });

		new Setting(containerEl)
			.setName('Enable history tracking')
			.setDesc('Track all language detection and application operations for undo functionality')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.enableHistory)
					.onChange(async (value) => {
						this.plugin.settings.enableHistory = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Maximum history entries')
			.setDesc('Maximum number of history entries to keep (higher values use more memory)')
			.addSlider(slider => {
				slider
					.setLimits(10, 1000, 10)
					.setValue(this.plugin.settings.maxHistoryEntries)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxHistoryEntries = value;
						await this.plugin.saveSettings();
					});
			})
			.then(setting => {
				const desc = setting.descEl;
				desc.createSpan({ text: ` (Current: ${this.plugin.settings.maxHistoryEntries})` });
			});

		new Setting(containerEl)
			.setName('Clear history')
			.setDesc('Remove all history entries')
			.addButton(button => {
				button
					.setButtonText('Clear All History')
					.setWarning()
					.onClick(async () => {
						if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
							this.plugin.historyService.clearHistory();
						}
					});
			});
	}

	private createNotificationSettingsSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Notifications' });

		new Setting(containerEl)
			.setName('Show notifications')
			.setDesc('Display notifications when languages are detected and applied')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.showNotifications)
					.onChange(async (value) => {
						this.plugin.settings.showNotifications = value;
						await this.plugin.saveSettings();
					});
			});
	}

	private createAdvancedSettingsSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Advanced' });

		// Plugin version and info
		new Setting(containerEl)
			.setName('Plugin information')
			.setDesc('Current plugin version and statistics')
			.then(setting => {
				const infoContainer = setting.controlEl.createDiv('plugin-info');

				// Add version info
				const versionEl = infoContainer.createDiv();
				versionEl.textContent = `Version: ${this.plugin.manifest.version}`;

				// Add statistics if history is enabled
				if (this.plugin.settings.enableHistory) {
					const stats = this.plugin.historyService.getStatistics();
					const statsEl = infoContainer.createDiv('stats');
					statsEl.textContent = `Total detections: ${stats.totalEntries}, Applied: ${stats.appliedEntries}, Avg confidence: ${stats.avgConfidence}%`;
				}
			});

		// Export/Import settings
		new Setting(containerEl)
			.setName('Export settings')
			.setDesc('Export current plugin settings to clipboard')
			.addButton(button => {
				button
					.setButtonText('Export')
					.onClick(async () => {
						const settings = JSON.stringify(this.plugin.settings, null, 2);
						await navigator.clipboard.writeText(settings);
						console.log('Settings exported to clipboard');
					});
			});

		new Setting(containerEl)
			.setName('Import settings')
			.setDesc('Import plugin settings from clipboard')
			.addButton(button => {
				button
					.setButtonText('Import')
					.onClick(async () => {
						try {
							const clipboardText = await navigator.clipboard.readText();
							const importedSettings = JSON.parse(clipboardText);
							
							if (this.validateSettings(importedSettings)) {
								Object.assign(this.plugin.settings, importedSettings);
								await this.plugin.saveSettings();
								this.display();
								console.log('Settings imported successfully');
							} else {
								console.error('Invalid settings format');
							}
						} catch (error) {
							console.error('Failed to import settings:', error);
						}
					});
			});

		// Reset to defaults
		new Setting(containerEl)
			.setName('Reset to defaults')
			.setDesc('Reset all settings to their default values')
			.addButton(button => {
				button
					.setButtonText('Reset')
					.setWarning()
					.onClick(async () => {
						if (confirm('Are you sure you want to reset all settings to defaults?')) {
							await this.plugin.resetSettings();
							this.display();
						}
					});
			});
	}

	private validateSettings(settings: any): boolean {
		return (
			typeof settings === 'object' &&
			typeof settings.triggerBehavior === 'string' &&
			typeof settings.confidenceThreshold === 'number' &&
			typeof settings.enableHistory === 'boolean' &&
			typeof settings.maxHistoryEntries === 'number' &&
			typeof settings.showNotifications === 'boolean' &&
			typeof settings.processingScope === 'string'
		);
	}
}
