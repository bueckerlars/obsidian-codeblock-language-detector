import { App, Modal } from 'obsidian';

/**
 * Simple confirmation modal that returns a promise
 */
export class ConfirmModal extends Modal {
	private resolvePromise: (value: boolean) => void;
	public promise: Promise<boolean>;

	constructor(app: App, title: string, message: string) {
		super(app);
		this.setTitle(title);
		this.promise = new Promise((resolve) => {
			this.resolvePromise = resolve;
		});

		this.contentEl.createDiv({ text: message });
		
		const buttonContainer = this.contentEl.createDiv('modal-button-container');
		
		const confirmButton = buttonContainer.createEl('button', { text: 'OK', cls: 'mod-cta' });
		confirmButton.addEventListener('click', () => {
			this.resolvePromise(true);
			this.close();
		});

		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => {
			this.resolvePromise(false);
			this.close();
		});
	}

	onClose(): void {
		if (this.resolvePromise) {
			this.resolvePromise(false);
		}
	}
}

