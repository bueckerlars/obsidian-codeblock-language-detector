import AutoSyntaxHighlightPlugin from '../../../../main';
import { DetectorConfiguration } from '../../../types';

/**
 * Handles drag and drop functionality for detector reordering
 */
export class DragDropHandler {
	private plugin: AutoSyntaxHighlightPlugin;
	private onOrderChanged: () => void;

	constructor(plugin: AutoSyntaxHighlightPlugin, onOrderChanged: () => void) {
		this.plugin = plugin;
		this.onOrderChanged = onOrderChanged;
	}

	/**
	 * Sets up drag and drop for a detector card
	 * @param card The detector card element
	 * @param detectorName The name of the detector
	 */
	setupDragAndDrop(card: HTMLElement, detectorName: string): void {
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

	/**
	 * Sets up container-level drop handling
	 * @param container The container element
	 */
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

	/**
	 * Handles the drop operation
	 * @param container The container element
	 * @param draggedDetectorName The name of the dragged detector
	 */
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

	/**
	 * Sets up drag preview placeholder
	 * @param container The container element
	 * @param draggedDetectorName The name of the dragged detector
	 */
	private setupDragPreview(container: HTMLElement, draggedDetectorName: string): void {
		// Add preview placeholder
		const draggedCard = container.querySelector(`[data-detector-name="${draggedDetectorName}"]`) as HTMLElement;
		if (!draggedCard) {
			// Set data attribute for future reference
			const allCards = container.querySelectorAll('.detector-config-card');
			allCards.forEach((card) => {
				const detectorName = this.getDetectorNameFromCard(card as HTMLElement);
				(card as HTMLElement).setAttribute('data-detector-name', detectorName);
			});
		}
		
		// Create placeholder element
		const placeholder = container.createDiv('drag-placeholder');
		placeholder.textContent = `Drop ${draggedDetectorName} here`;
		placeholder.style.display = 'none';
	}

	/**
	 * Updates the drag preview
	 * @param container The container element
	 * @param targetDetectorName The target detector name
	 * @param insertAfter Whether to insert after the target
	 */
	private updateDragPreview(container: HTMLElement, targetDetectorName: string, insertAfter: boolean): void {
		// Remove existing placeholder
		const existingPlaceholder = container.querySelector('.drag-placeholder');
		if (existingPlaceholder) {
			existingPlaceholder.remove();
		}
		
		// Find target card
		const targetCard = Array.from(container.querySelectorAll('.detector-config-card')).find(card => {
			const detectorName = this.getDetectorNameFromCard(card as HTMLElement);
			return detectorName === targetDetectorName;
		}) as HTMLElement;
		
		if (!targetCard || targetCard.classList.contains('dragging')) return;
		
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

	/**
	 * Cleans up drag preview
	 * @param container The container element
	 */
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

	/**
	 * Gets detector name from card element
	 * @param card The card element
	 * @returns The detector name
	 */
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

	/**
	 * Moves a detector to a specific position
	 * @param detectorName The detector name
	 * @param newOrder The new position
	 */
	private async moveDetectorToPosition(detectorName: string, newOrder: number): Promise<void> {
		const detectionOrder = this.getDetectionOrder();
		const currentIndex = detectionOrder.indexOf(detectorName);
		
		if (currentIndex === -1 || currentIndex === newOrder) {
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
		
		this.onOrderChanged();
	}

	/**
	 * Gets the current detection order
	 * @returns Array of detector names in order
	 */
	private getDetectionOrder(): string[] {
		const configs = this.plugin.settings.detectorConfigurations || {};
		
		return Object.entries(configs)
			.filter(([_, config]) => config.enabled)
			.sort((a, b) => a[1].order - b[1].order)
			.map(([name, _]) => name);
	}

	/**
	 * Gets detector configuration
	 * @param detectorName The detector name
	 * @returns The detector configuration
	 */
	private getDetectorConfig(detectorName: string): DetectorConfiguration {
		const configs = this.plugin.settings.detectorConfigurations || {};
		return configs[detectorName] || {
			enabled: true,
			confidenceThreshold: this.plugin.settings.confidenceThreshold,
			order: 0,
			config: {}
		};
	}

	/**
	 * Updates detector configuration
	 * @param detectorName The detector name
	 * @param config The new configuration
	 */
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
}
