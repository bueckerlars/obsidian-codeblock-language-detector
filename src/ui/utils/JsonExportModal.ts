import { App, Modal, Setting } from 'obsidian';

/**
 * Modal for exporting JSON data with manual copy (no clipboard API write).
 */
export class JsonExportModal extends Modal {
	constructor(
		app: App,
		title: string,
		private description: string,
		private jsonContent: string
	) {
		super(app);
		this.setTitle(title);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('p', { text: this.description });
		contentEl.createEl('p', {
			text: 'Select all (Cmd/Ctrl+A) and copy (Cmd/Ctrl+C) to copy the data.',
			cls: 'aslh-json-export-hint',
		});

		new Setting(contentEl)
			.setName('JSON data')
			.addTextArea(text => {
				const textAreaEl = text.inputEl;
				textAreaEl.rows = 12;
				textAreaEl.value = this.jsonContent;
				textAreaEl.readOnly = true;
				textAreaEl.addClass('aslh-json-export-textarea');
				window.setTimeout(() => {
					textAreaEl.focus();
					textAreaEl.select();
				}, 0);
			});

		const buttonContainer = contentEl.createDiv('modal-button-container');
		buttonContainer.createEl('button', { text: 'Close', cls: 'mod-cta' }).addEventListener('click', () => {
			this.close();
		});
	}
}
