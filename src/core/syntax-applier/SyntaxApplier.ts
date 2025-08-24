import { CodeBlock, ISyntaxApplier } from '../../types';

/**
 * Handles applying syntax highlighting language tags to code blocks
 */
export class SyntaxApplier implements ISyntaxApplier {
	
	/**
	 * Applies a language tag to a code block in the markdown content
	 * @param content The full markdown content
	 * @param codeBlock The code block to modify
	 * @param language The language tag to apply
	 * @returns The updated markdown content
	 */
	applyLanguageTag(content: string, codeBlock: CodeBlock, language: string): string {
		if (!this.isValidLanguageTag(language)) {
			throw new Error(`Invalid language tag: ${language}`);
		}

		const lines = content.split('\n');
		
		// Validate line numbers
		if (codeBlock.startLine < 1 || codeBlock.startLine > lines.length) {
			throw new Error(`Invalid start line: ${codeBlock.startLine}`);
		}

		// Find the opening fence line (should be at startLine - 1 in 0-based array)
		const fenceLineIndex = codeBlock.startLine - 1;
		const fenceLine = lines[fenceLineIndex];
		
		if (!this.isCodeBlockFence(fenceLine)) {
			throw new Error(`Line ${codeBlock.startLine} is not a code block fence`);
		}

		// Replace the fence line with the language tag
		const updatedFenceLine = this.addLanguageToFence(fenceLine, language);
		lines[fenceLineIndex] = updatedFenceLine;

		return lines.join('\n');
	}

	/**
	 * Removes a language tag from a code block
	 * @param content The full markdown content
	 * @param codeBlock The code block to modify
	 * @returns The updated markdown content
	 */
	removeLanguageTag(content: string, codeBlock: CodeBlock): string {
		const lines = content.split('\n');
		
		// Validate line numbers
		if (codeBlock.startLine < 1 || codeBlock.startLine > lines.length) {
			throw new Error(`Invalid start line: ${codeBlock.startLine}`);
		}

		const fenceLineIndex = codeBlock.startLine - 1;
		const fenceLine = lines[fenceLineIndex];
		
		if (!this.isCodeBlockFence(fenceLine)) {
			throw new Error(`Line ${codeBlock.startLine} is not a code block fence`);
		}

		// Remove the language tag from the fence
		lines[fenceLineIndex] = '```';

		return lines.join('\n');
	}

	/**
	 * Updates an existing language tag in a code block
	 * @param content The full markdown content
	 * @param codeBlock The code block to modify
	 * @param newLanguage The new language tag to apply
	 * @returns The updated markdown content
	 */
	updateLanguageTag(content: string, codeBlock: CodeBlock, newLanguage: string): string {
		if (!this.isValidLanguageTag(newLanguage)) {
			throw new Error(`Invalid language tag: ${newLanguage}`);
		}

		const lines = content.split('\n');
		
		// Validate line numbers
		if (codeBlock.startLine < 1 || codeBlock.startLine > lines.length) {
			throw new Error(`Invalid start line: ${codeBlock.startLine}`);
		}

		const fenceLineIndex = codeBlock.startLine - 1;
		const fenceLine = lines[fenceLineIndex];
		
		if (!this.isCodeBlockFence(fenceLine)) {
			throw new Error(`Line ${codeBlock.startLine} is not a code block fence`);
		}

		// Update the fence line with the new language
		const updatedFenceLine = this.addLanguageToFence(fenceLine, newLanguage);
		lines[fenceLineIndex] = updatedFenceLine;

		return lines.join('\n');
	}

	/**
	 * Checks if a line is a code block fence (```)
	 * @param line The line to check
	 * @returns True if the line is a code block fence
	 */
	private isCodeBlockFence(line: string): boolean {
		const trimmed = line.trim();
		return trimmed.startsWith('```');
	}

	/**
	 * Adds a language tag to a fence line
	 * @param fenceLine The original fence line
	 * @param language The language to add
	 * @returns The updated fence line with language tag
	 */
	private addLanguageToFence(fenceLine: string, language: string): string {
		// Preserve the original indentation
		const leadingWhitespace = fenceLine.match(/^(\s*)/)?.[1] || '';
		
		// Remove any existing language tag and add the new one
		const cleanFence = fenceLine.trim().replace(/^```\w*/, '```');
		
		return leadingWhitespace + '```' + language;
	}

	/**
	 * Validates if a language tag is valid
	 * @param language The language tag to validate
	 * @returns True if the language tag is valid
	 */
	private isValidLanguageTag(language: string): boolean {
		if (!language || typeof language !== 'string') {
			return false;
		}

		const trimmed = language.trim();
		
		// Must not be empty after trimming
		if (trimmed.length === 0) {
			return false;
		}

		// Should only contain alphanumeric characters, hyphens, and underscores
		// Should start with a letter
		const languageRegex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
		return languageRegex.test(trimmed);
	}

	/**
	 * Extracts the current language tag from a fence line
	 * @param fenceLine The fence line to extract from
	 * @returns The language tag or null if none exists
	 */
	extractLanguageFromFence(fenceLine: string): string | null {
		const trimmed = fenceLine.trim();
		const match = trimmed.match(/^```(\w+)/);
		return match ? match[1] : null;
	}

	/**
	 * Validates that a code block structure is correct
	 * @param content The markdown content
	 * @param codeBlock The code block to validate
	 * @returns True if the code block structure is valid
	 */
	validateCodeBlockStructure(content: string, codeBlock: CodeBlock): boolean {
		const lines = content.split('\n');
		
		// Check if line numbers are within bounds
		if (codeBlock.startLine < 1 || 
			codeBlock.endLine > lines.length || 
			codeBlock.startLine > codeBlock.endLine) {
			return false;
		}

		// Check if start and end lines are fence lines
		const startLine = lines[codeBlock.startLine - 1];
		const endLine = lines[codeBlock.endLine - 1];
		
		return this.isCodeBlockFence(startLine) && this.isCodeBlockFence(endLine);
	}

	/**
	 * Finds all occurrences of a code block pattern in content
	 * @param content The markdown content to search
	 * @param codeBlock The code block to find
	 * @returns Array of line numbers where the pattern occurs
	 */
	findCodeBlockOccurrences(content: string, codeBlock: CodeBlock): number[] {
		const lines = content.split('\n');
		const occurrences: number[] = [];
		
		// Look for identical code block content
		for (let i = 0; i < lines.length - 2; i++) {
			if (this.isCodeBlockFence(lines[i])) {
				// Find the closing fence
				for (let j = i + 1; j < lines.length; j++) {
					if (this.isCodeBlockFence(lines[j])) {
						// Extract content between fences
						const blockContent = lines.slice(i + 1, j).join('\n');
						
						if (blockContent.trim() === codeBlock.content.trim()) {
							occurrences.push(i + 1); // Convert to 1-based line number
						}
						
						i = j; // Skip to after this block
						break;
					}
				}
			}
		}
		
		return occurrences;
	}

	/**
	 * Creates a backup of the content before modification
	 * @param content The content to backup
	 * @returns A backup object with timestamp and content
	 */
	createBackup(content: string): { timestamp: number; content: string } {
		return {
			timestamp: Date.now(),
			content
		};
	}

	/**
	 * Applies multiple language tags to different code blocks in a single operation
	 * @param content The markdown content
	 * @param modifications Array of modifications to apply
	 * @returns The updated content
	 */
	applyMultipleLanguageTags(
		content: string, 
		modifications: Array<{ codeBlock: CodeBlock; language: string }>
	): string {
		// Sort modifications by line number in descending order
		// This ensures we don't affect line numbers of subsequent modifications
		const sortedModifications = modifications.sort((a, b) => b.codeBlock.startLine - a.codeBlock.startLine);
		
		let updatedContent = content;
		
		for (const { codeBlock, language } of sortedModifications) {
			try {
				updatedContent = this.applyLanguageTag(updatedContent, codeBlock, language);
			} catch (error) {
				console.error(`Failed to apply language tag '${language}' to code block at line ${codeBlock.startLine}:`, error);
				// Continue with other modifications even if one fails
			}
		}
		
		return updatedContent;
	}
}
