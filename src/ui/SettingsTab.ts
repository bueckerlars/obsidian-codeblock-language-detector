import { App, PluginSettingTab, Setting } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../main';
import { DetectionMethod, TriggerBehavior, ProcessingScope } from '../types';

/**
 * Settings tab for the CodeBlock Language Detector plugin
 */
export class AutoSyntaxHighlightSettingsTab extends PluginSettingTab {
	plugin: AutoSyntaxHighlightPlugin;

	constructor(app: App, plugin: AutoSyntaxHighlightPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Title
		containerEl.createEl('h2', { text: 'CodeBlock Language Detector Settings' });

		// Trigger Behavior Section
		this.createTriggerBehaviorSection(containerEl);

		// Processing Scope Section
		this.createProcessingScopeSection(containerEl);

		// Detection Settings Section
		this.createDetectionSettingsSection(containerEl);

		// Method Configuration Section
		this.createMethodConfigurationSection(containerEl);

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

	private createDetectionSettingsSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Detection Settings' });

		new Setting(containerEl)
			.setName('Confidence threshold')
			.setDesc('Minimum confidence percentage required to apply a detected language (0-100)')
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

		new Setting(containerEl)
			.setName('Detection method order')
			.setDesc('Order in which detection methods are tried (first method is tried first)')
			.addDropdown(dropdown => {
				dropdown
					.addOption('highlight-js,pattern-matching', 'Highlight.js → Pattern Matching')
					.addOption('pattern-matching,highlight-js', 'Pattern Matching → Highlight.js')
					.setValue(this.plugin.settings.detectionMethodOrder.join(','))
					.onChange(async (value) => {
						this.plugin.settings.detectionMethodOrder = value.split(',') as DetectionMethod[];
						await this.plugin.saveSettings();
					});
			});
	}

	private createMethodConfigurationSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Detection Methods' });

		new Setting(containerEl)
			.setName('Enable Highlight.js detection')
			.setDesc('Use Highlight.js library for automatic language detection')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.enableHighlightJs)
					.onChange(async (value) => {
						this.plugin.settings.enableHighlightJs = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Enable pattern matching detection')
			.setDesc('Use keyword and pattern matching for language detection')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.enablePatternMatching)
					.onChange(async (value) => {
						this.plugin.settings.enablePatternMatching = value;
						await this.plugin.saveSettings();
					});
			});
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

		// Pattern Language Selection
		const languageSettingContainer = containerEl.createDiv('language-selection-container');
		languageSettingContainer.createEl('h4', { text: 'Pattern Matching Languages' });
		languageSettingContainer.createEl('p', { 
			text: 'Select which languages should be used for pattern matching detection. Highlight.js detection is not affected by this setting.',
			cls: 'setting-item-description'
		});

		// Quick actions
		const quickActionsContainer = languageSettingContainer.createDiv('quick-actions');

		const selectAllBtn = quickActionsContainer.createEl('button', { text: 'Select All', cls: 'select-all-btn' });
		// Get available pattern languages from the pattern matching detector  
		const availablePatternLanguages = this.plugin.detectionEngine.getPatternMatchingDetector().getAvailableLanguages();
		
		selectAllBtn.addEventListener('click', async () => {
			this.plugin.settings.enabledPatternLanguages = [...availablePatternLanguages];
			await this.plugin.saveSettings();
			this.display(); // Refresh display
		});

		const selectNoneBtn = quickActionsContainer.createEl('button', { text: 'Select None', cls: 'select-none-btn' });
		selectNoneBtn.addEventListener('click', async () => {
			this.plugin.settings.enabledPatternLanguages = [];
			await this.plugin.saveSettings();
			this.display(); // Refresh display
		});

		// Language grid container
		const languageContainer = languageSettingContainer.createDiv('language-toggles');

		// Create language toggles (only for available pattern languages)
		availablePatternLanguages.forEach(language => {
			const isEnabled = this.plugin.settings.enabledPatternLanguages.includes(language);
			
			const languageItem = languageContainer.createDiv(`language-item ${isEnabled ? 'enabled' : 'disabled'}`);

			// Toggle icon
			const toggleIcon = languageItem.createSpan('toggle-icon');
			toggleIcon.textContent = isEnabled ? '✓' : '○';

			// Language name
			const languageLabel = languageItem.createSpan('language-label');
			languageLabel.textContent = language;

			// Click handler for toggle
			languageItem.addEventListener('click', async () => {
				const currentlyEnabled = this.plugin.settings.enabledPatternLanguages.includes(language);
				
				if (currentlyEnabled) {
					// Remove language
					this.plugin.settings.enabledPatternLanguages = this.plugin.settings.enabledPatternLanguages.filter(lang => lang !== language);
				} else {
					// Add language
					this.plugin.settings.enabledPatternLanguages.push(language);
				}
				
				await this.plugin.saveSettings();
				this.display(); // Refresh display to update all states
			});
		});

		// Show count of enabled languages
		const countInfo = languageSettingContainer.createDiv('enabled-count');
		countInfo.textContent = `${this.plugin.settings.enabledPatternLanguages.length} von ${availablePatternLanguages.length} Pattern Languages enabled`;

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
						// Note: In Obsidian, you might want to use a different notification method
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
							
							// Validate settings structure
							if (this.validateSettings(importedSettings)) {
								Object.assign(this.plugin.settings, importedSettings);
								await this.plugin.saveSettings();
								this.display(); // Refresh the settings display
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
							this.display(); // Refresh the settings display
						}
					});
			});
	}

	private validateSettings(settings: any): boolean {
		// Basic validation of settings structure
		return (
			typeof settings === 'object' &&
			typeof settings.triggerBehavior === 'string' &&
			typeof settings.confidenceThreshold === 'number' &&
			Array.isArray(settings.detectionMethodOrder) &&
			typeof settings.enableHighlightJs === 'boolean' &&
			typeof settings.enablePatternMatching === 'boolean' &&
			typeof settings.enableHistory === 'boolean' &&
			typeof settings.maxHistoryEntries === 'number' &&
			typeof settings.showNotifications === 'boolean' &&
			Array.isArray(settings.enabledPatternLanguages) &&
			typeof settings.processingScope === 'string'
		);
	}
}
