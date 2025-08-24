import { CodeBlock, ICodeAnalyzer } from '../../types';

/**
 * Analyzes markdown content to find code blocks and determine their language status
 */
export class CodeAnalyzer implements ICodeAnalyzer {
	private readonly codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
	private readonly fencedCodeBlockRegex = /^```(\w*)\n?([\s\S]*?)^```/gm;

	/**
	 * Finds all code blocks in the given markdown content
	 * @param content The markdown content to analyze
	 * @returns Array of code blocks found in the content
	 */
	findCodeBlocks(content: string): CodeBlock[] {
		const codeBlocks: CodeBlock[] = [];
		const lines = content.split('\n');
		
		// Reset regex to ensure we start from the beginning
		this.fencedCodeBlockRegex.lastIndex = 0;
		
		let match: RegExpExecArray | null;
		
		while ((match = this.fencedCodeBlockRegex.exec(content)) !== null) {
			const fullMatch = match[0];
			const language = match[1] || '';
			const codeContent = match[2] || '';
			
			// Find the line numbers for this code block
			const beforeMatch = content.substring(0, match.index);
			const startLine = beforeMatch.split('\n').length;
			const codeLines = fullMatch.split('\n').length;
			const endLine = startLine + codeLines - 1;
			
			const codeBlock: CodeBlock = {
				content: codeContent.trim(),
				startLine,
				endLine,
				hasLanguage: language.length > 0,
				originalLanguage: language.length > 0 ? language : undefined,
			};
			
			codeBlocks.push(codeBlock);
		}
		
		return codeBlocks;
	}

	/**
	 * Checks if a code block string has a language tag
	 * @param codeBlock The code block string to check
	 * @returns True if the code block has a language tag
	 */
	hasLanguageTag(codeBlock: string): boolean {
		const lines = codeBlock.trim().split('\n');
		if (lines.length === 0) return false;
		
		const firstLine = lines[0].trim();
		
		// Check if it starts with ``` followed by a language identifier
		const languageMatch = firstLine.match(/^```(\w+)/);
		return languageMatch !== null && languageMatch[1].length > 0;
	}

	/**
	 * Extracts the language tag from a code block if it exists
	 * @param codeBlock The code block string to extract language from
	 * @returns The language tag or null if not found
	 */
	extractLanguageTag(codeBlock: string): string | null {
		const lines = codeBlock.trim().split('\n');
		if (lines.length === 0) return null;
		
		const firstLine = lines[0].trim();
		const languageMatch = firstLine.match(/^```(\w+)/);
		
		return languageMatch ? languageMatch[1] : null;
	}

	/**
	 * Finds code blocks without language tags
	 * @param content The markdown content to analyze
	 * @returns Array of code blocks that don't have language tags
	 */
	findCodeBlocksWithoutLanguage(content: string): CodeBlock[] {
		const allCodeBlocks = this.findCodeBlocks(content);
		return allCodeBlocks.filter(block => !block.hasLanguage);
	}

	/**
	 * Validates if a string is a valid language identifier
	 * @param language The language string to validate
	 * @returns True if the language identifier is valid
	 */
	isValidLanguageIdentifier(language: string): boolean {
		if (!language || language.trim().length === 0) {
			return false;
		}
		
		// Language identifiers should be alphanumeric, possibly with hyphens or underscores
		const languageRegex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
		return languageRegex.test(language.trim());
	}

	/**
	 * Gets the content of a specific code block by its position
	 * @param content The full markdown content
	 * @param startLine The starting line of the code block
	 * @param endLine The ending line of the code block
	 * @returns The code block content or null if not found
	 */
	getCodeBlockContent(content: string, startLine: number, endLine: number): string | null {
		const lines = content.split('\n');
		
		if (startLine < 1 || endLine >= lines.length || startLine > endLine) {
			return null;
		}
		
		// Extract lines (convert from 1-based to 0-based indexing)
		const blockLines = lines.slice(startLine - 1, endLine);
		
		// Remove the fence markers and return the inner content
		if (blockLines.length >= 2) {
			// Remove first and last line (the ``` markers)
			return blockLines.slice(1, -1).join('\n');
		}
		
		return null;
	}
}
