import { App, PluginSettingTab, Setting } from 'obsidian';
import AutoSyntaxHighlightPlugin from '../../main';
import { DetectionMethod, TriggerBehavior, SUPPORTED_LANGUAGES } from '../types';

/**
 * Settings tab for the Auto Syntax Highlight plugin
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
		containerEl.createEl('h2', { text: 'Auto Syntax Highlight Settings' });

		// Trigger Behavior Section
		this.createTriggerBehaviorSection(containerEl);

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

		// Language Selection
		const languageSettingContainer = containerEl.createDiv('language-selection-container');
		languageSettingContainer.createEl('h4', { text: 'Language Detection' });
		languageSettingContainer.createEl('p', { 
			text: 'Select which languages should be detected and applied automatically',
			cls: 'setting-item-description'
		});

		// Quick actions
		const quickActionsContainer = languageSettingContainer.createDiv('quick-actions');
		quickActionsContainer.style.marginBottom = '12px';
		quickActionsContainer.style.display = 'flex';
		quickActionsContainer.style.gap = '8px';
		quickActionsContainer.style.flexWrap = 'wrap';

		const selectAllBtn = quickActionsContainer.createEl('button', { text: 'Select All' });
		selectAllBtn.style.padding = '4px 12px';
		selectAllBtn.style.fontSize = '0.9em';
		selectAllBtn.style.backgroundColor = 'var(--interactive-accent)';
		selectAllBtn.style.color = 'var(--text-on-accent)';
		selectAllBtn.style.border = 'none';
		selectAllBtn.style.borderRadius = '4px';
		selectAllBtn.style.cursor = 'pointer';
		selectAllBtn.addEventListener('click', async () => {
			this.plugin.settings.enabledLanguages = [...SUPPORTED_LANGUAGES];
			await this.plugin.saveSettings();
			this.display(); // Refresh display
		});

		const selectNoneBtn = quickActionsContainer.createEl('button', { text: 'Select None' });
		selectNoneBtn.style.padding = '4px 12px';
		selectNoneBtn.style.fontSize = '0.9em';
		selectNoneBtn.style.backgroundColor = 'var(--background-modifier-border)';
		selectNoneBtn.style.color = 'var(--text-normal)';
		selectNoneBtn.style.border = 'none';
		selectNoneBtn.style.borderRadius = '4px';
		selectNoneBtn.style.cursor = 'pointer';
		selectNoneBtn.addEventListener('click', async () => {
			this.plugin.settings.enabledLanguages = [];
			await this.plugin.saveSettings();
			this.display(); // Refresh display
		});

		// Language grid container
		const languageContainer = languageSettingContainer.createDiv('language-toggles');
		languageContainer.style.display = 'grid';
		languageContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(140px, 1fr))';
		languageContainer.style.gap = '6px';
		languageContainer.style.maxHeight = '300px';
		languageContainer.style.overflowY = 'auto';
		languageContainer.style.padding = '12px';
		languageContainer.style.backgroundColor = 'var(--background-primary-alt)';
		languageContainer.style.border = '1px solid var(--background-modifier-border)';
		languageContainer.style.borderRadius = '6px';

		// Create language toggles
		SUPPORTED_LANGUAGES.forEach(language => {
			const isEnabled = this.plugin.settings.enabledLanguages.includes(language);
			
			const languageItem = languageContainer.createDiv('language-item');
			languageItem.style.display = 'flex';
			languageItem.style.alignItems = 'center';
			languageItem.style.padding = '6px 8px';
			languageItem.style.backgroundColor = isEnabled ? 'var(--interactive-accent)' : 'var(--background-secondary)';
			languageItem.style.color = isEnabled ? 'var(--text-on-accent)' : 'var(--text-muted)';
			languageItem.style.borderRadius = '4px';
			languageItem.style.cursor = 'pointer';
			languageItem.style.transition = 'all 0.2s ease';
			languageItem.style.border = `1px solid ${isEnabled ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}`;
			languageItem.style.fontSize = '0.9em';
			languageItem.style.fontFamily = 'var(--font-monospace)';
			
			// Add hover effect
			languageItem.addEventListener('mouseenter', () => {
				if (!isEnabled) {
					languageItem.style.backgroundColor = 'var(--background-modifier-hover)';
				}
			});
			
			languageItem.addEventListener('mouseleave', () => {
				if (!isEnabled) {
					languageItem.style.backgroundColor = 'var(--background-secondary)';
				}
			});

			// Toggle icon
			const toggleIcon = languageItem.createSpan('toggle-icon');
			toggleIcon.textContent = isEnabled ? '✓' : '○';
			toggleIcon.style.marginRight = '6px';
			toggleIcon.style.fontSize = '0.8em';
			toggleIcon.style.fontWeight = 'bold';

			// Language name
			const languageLabel = languageItem.createSpan('language-label');
			languageLabel.textContent = language;
			languageLabel.style.flex = '1';

			// Click handler for toggle
			languageItem.addEventListener('click', async () => {
				const currentlyEnabled = this.plugin.settings.enabledLanguages.includes(language);
				
				if (currentlyEnabled) {
					// Remove language
					this.plugin.settings.enabledLanguages = this.plugin.settings.enabledLanguages.filter(lang => lang !== language);
				} else {
					// Add language
					this.plugin.settings.enabledLanguages.push(language);
				}
				
				await this.plugin.saveSettings();
				this.display(); // Refresh display to update all states
			});
		});

		// Show count of enabled languages
		const countInfo = languageSettingContainer.createDiv('enabled-count');
		countInfo.style.marginTop = '8px';
		countInfo.style.fontSize = '0.9em';
		countInfo.style.color = 'var(--text-muted)';
		countInfo.style.textAlign = 'center';
		countInfo.textContent = `${this.plugin.settings.enabledLanguages.length} von ${SUPPORTED_LANGUAGES.length} Languages enabled`;

		// Plugin version and info
		new Setting(containerEl)
			.setName('Plugin information')
			.setDesc('Current plugin version and statistics')
			.then(setting => {
				const infoContainer = setting.controlEl.createDiv('plugin-info');
				infoContainer.style.marginTop = '8px';
				infoContainer.style.fontSize = '0.9em';
				infoContainer.style.color = 'var(--text-muted)';

				// Add version info
				const versionEl = infoContainer.createDiv();
				versionEl.textContent = `Version: ${this.plugin.manifest.version}`;

				// Add statistics if history is enabled
				if (this.plugin.settings.enableHistory) {
					const stats = this.plugin.historyService.getStatistics();
					const statsEl = infoContainer.createDiv();
					statsEl.style.marginTop = '4px';
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
			Array.isArray(settings.enabledLanguages)
		);
	}
}
