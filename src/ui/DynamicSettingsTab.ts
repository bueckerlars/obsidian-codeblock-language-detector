import { App, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../main';
import { ProcessingScope, TriggerBehavior } from '../types';

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
 * Dynamic settings tab that adapts to registered detectors.
 *
 * Dual support:
 * - Obsidian &lt; 1.13: imperative {@link display} / {@link renderSettings}
 * - Obsidian ≥ 1.13: declarative {@link getSettingDefinitions} (also enables settings search)
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
		this.detectorConfigurationSection = new DetectorConfigurationSection(this.plugin, () => this.refreshSettings());
		this.historySettingsSection = new HistorySettingsSection(this.plugin);
		this.notificationSettingsSection = new NotificationSettingsSection(this.plugin);
		this.advancedSettingsSection = new AdvancedSettingsSection(this.plugin);
		
		// Set callback for advanced section to refresh display
		this.advancedSettingsSection.onSettingsChanged = () => this.refreshSettings();
	}

	/**
	 * Declarative settings for Obsidian 1.13+ (search indexing + rendering).
	 * Complex custom UI is mounted via render callbacks that reuse existing sections.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: 'Trigger behavior',
				items: [
					{
						name: 'When to detect language',
						desc: 'Choose when the plugin should automatically detect and apply language tags',
						control: {
							type: 'dropdown',
							key: 'triggerBehavior',
							options: {
								'auto-on-open': 'When opening a note',
								'auto-on-edit': 'When editing a note',
								'auto-on-save': 'When saving a note',
								'manual': 'Manual only (via command)'
							}
						}
					}
				]
			},
			{
				type: 'group',
				heading: 'Processing scope',
				items: [
					{
						name: 'Code block processing scope',
						desc: 'Controls manual processing (ribbon icon, command palette). "Entire vault" processes all markdown files; automatic triggers always process only the current note.',
						control: {
							type: 'dropdown',
							key: 'processingScope',
							options: {
								'current-note': 'Current note only',
								'entire-vault': 'Entire vault'
							}
						}
					}
				]
			},
			{
				type: 'group',
				heading: 'Detection engine',
				items: [
					{
						name: 'Global confidence threshold',
						desc: 'Default confidence threshold for detectors that don\'t have their own threshold configured (0-100)',
						control: {
							type: 'slider',
							key: 'confidenceThreshold',
							min: 0,
							max: 100,
							step: 5
						}
					}
				]
			},
			{
				type: 'group',
				heading: 'Detector configuration',
				items: [
					{
						name: 'Detectors',
						desc: 'Configure individual detectors, their confidence thresholds, and execution order. Drag detectors to reorder them.',
						render: (setting) => {
							this.mountSection(setting.settingEl, (el) =>
								this.detectorConfigurationSection.create(el, { includeHeading: false })
							);
						}
					}
				]
			},
			{
				type: 'group',
				heading: 'History & undo',
				items: [
					{
						name: 'Enable history tracking',
						desc: 'Track all language detection and application operations for undo functionality',
						control: {
							type: 'toggle',
							key: 'enableHistory'
						}
					},
					{
						name: 'Maximum history entries',
						desc: 'Maximum number of history entries to keep (higher values use more memory)',
						control: {
							type: 'slider',
							key: 'maxHistoryEntries',
							min: 10,
							max: 1000,
							step: 10
						}
					},
					{
						name: 'History tools',
						desc: 'Export, import, validate, or clear detection history',
						render: (setting) => {
							this.mountSection(setting.settingEl, (el) => this.historySettingsSection.createTools(el));
						}
					}
				]
			},
			{
				type: 'group',
				heading: 'Notifications',
				items: [
					{
						name: 'Show notifications',
						desc: 'Display notifications when languages are detected and applied',
						control: {
							type: 'toggle',
							key: 'showNotifications'
						}
					}
				]
			},
			{
				type: 'group',
				heading: 'Advanced',
				items: [
					{
						name: 'Advanced options',
						desc: 'Plugin information, import/export settings, and reset',
						render: (setting) => {
							this.mountSection(setting.settingEl, (el) =>
								this.advancedSettingsSection.create(el, { includeHeading: false })
							);
						}
					}
				]
			}
		];
	}

	/**
	 * Persist control changes through the plugin save path (updates detectors, history limits, etc.).
	 */
	async setControlValue(key: string, value: unknown): Promise<void> {
		switch (key) {
			case 'triggerBehavior':
				this.plugin.settings.triggerBehavior = value as TriggerBehavior;
				break;
			case 'processingScope':
				this.plugin.settings.processingScope = value as ProcessingScope;
				break;
			case 'confidenceThreshold':
				this.plugin.settings.confidenceThreshold = value as number;
				break;
			case 'enableHistory':
				this.plugin.settings.enableHistory = value as boolean;
				break;
			case 'maxHistoryEntries':
				this.plugin.settings.maxHistoryEntries = value as number;
				break;
			case 'showNotifications':
				this.plugin.settings.showNotifications = value as boolean;
				break;
			default:
				return;
		}
		await this.plugin.saveSettings();
	}

	/**
	 * Imperative fallback for Obsidian versions before 1.13.0.
	 * Also used when getSettingDefinitions is empty / not honored.
	 */
	display(): void {
		this.renderSettings();
	}

	/**
	 * Shared imperative render used by display() and pre-1.13 refresh paths.
	 */
	private renderSettings(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.triggerBehaviorSection.create(containerEl);
		this.processingScopeSection.create(containerEl);
		this.detectionEngineSection.create(containerEl);
		this.detectorConfigurationSection.create(containerEl);
		this.historySettingsSection.create(containerEl);
		this.notificationSettingsSection.create(containerEl);
		this.advancedSettingsSection.create(containerEl);
	}

	/**
	 * Refresh settings UI after structural changes (detector reorder, import, etc.).
	 */
	private refreshSettings(): void {
		const tabWithUpdate = this as PluginSettingTab & { update?: () => void };
		if (typeof tabWithUpdate.update === 'function') {
			tabWithUpdate.update();
			return;
		}
		this.renderSettings();
	}

	/**
	 * Replace a declarative setting row with an embedded imperative section.
	 */
	private mountSection(settingEl: HTMLElement, create: (el: HTMLElement) => void): void {
		settingEl.empty();
		settingEl.className = 'aslh-embedded-settings-section';
		create(settingEl);
	}
}
