import { App, Modal, Notice, Setting } from 'obsidian';

/**
 * Modal for importing JSON data via manual paste (no clipboard API read).
 */
export class JsonImportModal extends Modal {
	private onSubmit: (jsonText: string) => void | Promise<void>;
	private validate?: (jsonText: string) => boolean | string;

	constructor(
		app: App,
		title: string,
		private description: string,
		onSubmit: (jsonText: string) => void | Promise<void>,
		validate?: (jsonText: string) => boolean | string
	) {
		super(app);
		this.setTitle(title);
		this.onSubmit = onSubmit;
		this.validate = validate;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('p', { text: this.description });

		let textAreaEl: HTMLTextAreaElement;

		new Setting(contentEl)
			.setName('JSON data')
			.addTextArea(text => {
				textAreaEl = text.inputEl;
				textAreaEl.rows = 12;
				textAreaEl.placeholder = 'Paste JSON here...';
				textAreaEl.addClass('aslh-json-import-textarea');
			});

		const buttonContainer = contentEl.createDiv('modal-button-container');

		const importButton = buttonContainer.createEl('button', { text: 'Import', cls: 'mod-cta' });
		importButton.addEventListener('click', () => {
			void this.handleImport(textAreaEl.value);
		});

		buttonContainer.createEl('button', { text: 'Cancel' }).addEventListener('click', () => {
			this.close();
		});
	}

	private async handleImport(jsonText: string): Promise<void> {
		if (!jsonText.trim()) {
			new Notice('No JSON data provided');
			return;
		}

		if (this.validate) {
			const result = this.validate(jsonText);
			if (result === false) {
				new Notice('Invalid JSON format');
				return;
			}
			if (typeof result === 'string') {
				new Notice(result);
				return;
			}
		}

		try {
			await this.onSubmit(jsonText);
			this.close();
		} catch (error) {
			console.error('JSON import failed:', error);
			new Notice('Import failed');
		}
	}
}
