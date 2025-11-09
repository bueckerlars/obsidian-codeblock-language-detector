import { App, PluginSettingTab } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../main';

// Import the refactored sections
import {
	TriggerBehaviorSection,
	ProcessingScopeSection,
	DetectionEngineSection,
	DetectorConfigurationSection,
	HistorySettingsSection,
	NotificationSettingsSection,
	AdvancedSettingsSection
} from './settings/sections';

/**
 * Dynamic settings tab that adapts to registered detectors
 */
export class DynamicAutoSyntaxHighlightSettingsTab extends PluginSettingTab {
	plugin: AutoSyntaxHighlightPlugin;

	// Section instances
	private triggerBehaviorSection: TriggerBehaviorSection;
	private processingScopeSection: ProcessingScopeSection;
	private detectionEngineSection: DetectionEngineSection;
	private detectorConfigurationSection: DetectorConfigurationSection;
	private historySettingsSection: HistorySettingsSection;
	private notificationSettingsSection: NotificationSettingsSection;
	private advancedSettingsSection: AdvancedSettingsSection;

	constructor(app: App, plugin: AutoSyntaxHighlightPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		
		// Initialize sections
		this.initializeSections();
	}

	/**
	 * Initialize all settings sections
	 */
	private initializeSections(): void {
		this.triggerBehaviorSection = new TriggerBehaviorSection(this.plugin);
		this.processingScopeSection = new ProcessingScopeSection(this.plugin);
		this.detectionEngineSection = new DetectionEngineSection(this.plugin);
		this.detectorConfigurationSection = new DetectorConfigurationSection(this.plugin, () => this.display());
		this.historySettingsSection = new HistorySettingsSection(this.plugin);
		this.notificationSettingsSection = new NotificationSettingsSection(this.plugin);
		this.advancedSettingsSection = new AdvancedSettingsSection(this.plugin);
		
		// Set callback for advanced section to refresh display
		this.advancedSettingsSection.onSettingsChanged = () => this.display();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Create all sections using the refactored components
		this.triggerBehaviorSection.create(containerEl);
		this.processingScopeSection.create(containerEl);
		this.detectionEngineSection.create(containerEl);
		this.detectorConfigurationSection.create(containerEl);
		this.historySettingsSection.create(containerEl);
		this.notificationSettingsSection.create(containerEl);
		this.advancedSettingsSection.create(containerEl);
	}
}
