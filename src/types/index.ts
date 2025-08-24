/**
 * Core types and interfaces for the Auto Syntax Highlight plugin
 */

// Detection methods available for language detection
export type DetectionMethod = 'highlight-js' | 'pattern-matching';

// Trigger behaviors for when the plugin should activate
export type TriggerBehavior = 'auto-on-open' | 'auto-on-edit' | 'auto-on-save' | 'manual';

// Plugin settings interface
export interface AutoSyntaxHighlightSettings {
	// Trigger behavior setting
	triggerBehavior: TriggerBehavior;
	
	// Confidence threshold (0-100)
	confidenceThreshold: number;
	
	// Detection method order (first method is tried first)
	detectionMethodOrder: DetectionMethod[];
	
	// Enable/disable individual detection methods
	enableHighlightJs: boolean;
	enablePatternMatching: boolean;
	
	// Enable/disable history tracking
	enableHistory: boolean;
	
	// Maximum number of history entries to keep
	maxHistoryEntries: number;
	
	// Enable notifications when language is detected
	showNotifications: boolean;
	
	// Persistent history data storage
	historyData: HistoryEntry[];
}

// Language detection result
export interface DetectionResult {
	language: string;
	confidence: number;
	method: DetectionMethod;
}

// Code block information
export interface CodeBlock {
	content: string;
	startLine: number;
	endLine: number;
	hasLanguage: boolean;
	originalLanguage?: string;
}

// History entry for tracking changes
export interface HistoryEntry {
	id: string;
	timestamp: number;
	fileName: string;
	filePath: string;
	codeBlock: CodeBlock;
	detectedLanguage: string;
	confidence: number;
	method: DetectionMethod;
	applied: boolean;
}

// Pattern matching configuration for a language
export interface LanguagePattern {
	name: string;
	extensions: string[];
	keywords: string[];
	patterns: string[];
	imports: string[];
	comments: {
		line: string[];
		block: Array<{ start: string; end: string }>;
	};
	operators: string[];
	builtins: string[];
}

// Service interfaces
export interface ILanguageDetector {
	detectLanguage(code: string): Promise<DetectionResult | null>;
	getAvailableLanguages(): string[];
}

export interface ICodeAnalyzer {
	findCodeBlocks(content: string): CodeBlock[];
	hasLanguageTag(codeBlock: string): boolean;
}

export interface ISyntaxApplier {
	applyLanguageTag(content: string, codeBlock: CodeBlock, language: string): string;
}

export interface IHistoryService {
	addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): string;
	getEntries(): HistoryEntry[];
	removeEntry(id: string): boolean;
	clearHistory(): void;
	undoEntry(id: string): boolean;
	getEntryById(id: string): HistoryEntry | null;
}

// Default settings
export const DEFAULT_SETTINGS: AutoSyntaxHighlightSettings = {
	triggerBehavior: 'auto-on-edit',
	confidenceThreshold: 70,
	detectionMethodOrder: ['highlight-js', 'pattern-matching'],
	enableHighlightJs: true,
	enablePatternMatching: true,
	enableHistory: true,
	maxHistoryEntries: 100,
	showNotifications: true,
	historyData: [],
};

// Constants
export const SUPPORTED_LANGUAGES = [
	'javascript',
	'typescript',
	'python',
	'java',
	'cpp',
	'c',
	'csharp',
	'php',
	'ruby',
	'go',
	'rust',
	'swift',
	'kotlin',
	'scala',
	'r',
	'sql',
	'html',
	'css',
	'scss',
	'sass',
	'json',
	'yaml',
	'xml',
	'markdown',
	'bash',
	'shell',
	'powershell',
	'dockerfile',
	'makefile',
];
