import AutoSyntaxHighlightPlugin from '../../../../main';
import { DetectorConfiguration } from '../../../types';

/**
 * Component for managing language toggles in a grid layout
 */
export class LanguageToggleGrid {
	private plugin: AutoSyntaxHighlightPlugin;
	private detectorName: string;
	private onLanguagesChanged: () => void;

	constructor(plugin: AutoSyntaxHighlightPlugin, detectorName: string, onLanguagesChanged: () => void) {
		this.plugin = plugin;
		this.detectorName = detectorName;
		this.onLanguagesChanged = onLanguagesChanged;
	}

	/**
	 * Creates the language toggle grid
	 * @param container The container element
	 * @param availableLanguages Available languages
	 * @param enabledLanguages Currently enabled languages
	 */
	create(container: HTMLElement, availableLanguages: string[], enabledLanguages: string[]): void {
		// Quick actions
		const quickActionsContainer = container.createDiv('quick-actions');
		const selectAllBtn = quickActionsContainer.createEl('button', { text: 'Select All', cls: 'select-all-btn' });
		const selectNoneBtn = quickActionsContainer.createEl('button', { text: 'Select None', cls: 'select-none-btn' });
		
		selectAllBtn.addEventListener('click', async () => {
			await this.updateEnabledLanguages([...availableLanguages]);
		});
		
		selectNoneBtn.addEventListener('click', async () => {
			await this.updateEnabledLanguages([]);
		});
		
		// Language grid
		const languageContainer = container.createDiv('language-toggles');
		
		availableLanguages.forEach(language => {
			this.createLanguageToggle(languageContainer, language, enabledLanguages);
		});
		
		// Show count
		const countInfo = container.createDiv('enabled-count');
		countInfo.textContent = `${enabledLanguages.length} von ${availableLanguages.length} languages enabled`;
	}

	/**
	 * Creates a single language toggle
	 * @param container The container element
	 * @param language The language name
	 * @param enabledLanguages Currently enabled languages
	 */
	private createLanguageToggle(container: HTMLElement, language: string, enabledLanguages: string[]): void {
		const isEnabled = enabledLanguages.includes(language);
		
		const languageItem = container.createDiv(`language-item ${isEnabled ? 'enabled' : 'disabled'}`);
		
		// Toggle icon
		const toggleIcon = languageItem.createSpan('toggle-icon');
		toggleIcon.textContent = isEnabled ? '✓' : '○';
		
		// Language name
		const languageLabel = languageItem.createSpan('language-label');
		languageLabel.textContent = language;
		
		// Click handler
		languageItem.addEventListener('click', async () => {
			const currentlyEnabled = enabledLanguages.includes(language);
			let newEnabledLanguages: string[];
			
			if (currentlyEnabled) {
				newEnabledLanguages = enabledLanguages.filter((lang: string) => lang !== language);
			} else {
				newEnabledLanguages = [...enabledLanguages, language];
			}
			
			await this.updateEnabledLanguages(newEnabledLanguages);
		});
	}

	/**
	 * Updates the enabled languages for the detector
	 * @param newEnabledLanguages The new list of enabled languages
	 */
	private async updateEnabledLanguages(newEnabledLanguages: string[]): Promise<void> {
		const detectorConfig = this.getDetectorConfig();
		
		await this.updateDetectorConfig({
			...detectorConfig,
			config: { ...detectorConfig.config, enabledLanguages: newEnabledLanguages }
		});
		
		this.onLanguagesChanged();
	}

	/**
	 * Gets the current detector configuration
	 * @returns The detector configuration
	 */
	private getDetectorConfig(): DetectorConfiguration {
		const configs = this.plugin.settings.detectorConfigurations || {};
		return configs[this.detectorName] || {
			enabled: true,
			confidenceThreshold: this.plugin.settings.confidenceThreshold,
			order: 0,
			config: {}
		};
	}

	/**
	 * Updates the detector configuration
	 * @param config The new configuration
	 */
	private async updateDetectorConfig(config: DetectorConfiguration): Promise<void> {
		// Ensure detectorConfigurations exists
		if (!this.plugin.settings.detectorConfigurations) {
			this.plugin.settings.detectorConfigurations = {};
		}
		
		this.plugin.settings.detectorConfigurations[this.detectorName] = config;
		await this.plugin.saveSettings();
		
		// Apply the configuration to the detection engine
		this.plugin.updateDetectionEngineSettings();
	}
}
