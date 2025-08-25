/**
 * Core types and interfaces for the Auto Syntax Highlight plugin
 */

// Detection methods available for language detection
// Note: This is now used for backward compatibility in settings
// The actual detection system supports dynamic registration of any detector
export type DetectionMethod = 'highlight-js' | 'pattern-matching';

// Trigger behaviors for when the plugin should activate
export type TriggerBehavior = 'auto-on-open' | 'auto-on-edit' | 'auto-on-save' | 'manual';

// Processing scope for code blocks
export type ProcessingScope = 'current-note' | 'entire-vault';

// Plugin settings interface
export interface AutoSyntaxHighlightSettings {
	// Trigger behavior setting
	triggerBehavior: TriggerBehavior;
	
	// Confidence threshold (0-100)
	confidenceThreshold: number;
	
	// Detection method order (first method is tried first)
	// Legacy setting - still used for backward compatibility
	detectionMethodOrder: DetectionMethod[];
	
	// New dynamic detector order (takes precedence over detectionMethodOrder)
	detectorOrder?: string[];
	
	// Enable/disable individual detection methods (legacy)
	enableHighlightJs: boolean;
	enablePatternMatching: boolean;
	
	// Enable/disable history tracking
	enableHistory: boolean;
	
	// Maximum number of history entries to keep
	maxHistoryEntries: number;
	
	// Enable notifications when language is detected
	showNotifications: boolean;
	
	// Enabled languages for pattern matching detection (only these will be used for pattern matching)
	enabledPatternLanguages: string[];
	
	// Processing scope setting
	processingScope: ProcessingScope;
	
	// Persistent history data storage
	historyData: HistoryEntry[];
	
	// New settings for dynamic detector management
	enabledDetectors?: string[]; // List of enabled detector names
	detectorConfigurations?: Record<string, Record<string, any>>; // Per-detector configurations
}

// Language detection result
export interface DetectionResult {
	language: string;
	confidence: number;
	// method is now the actual detector name (string) instead of limited DetectionMethod
	method: string;
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
	// method is now the actual detector name (string) instead of limited DetectionMethod
	method: string;
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
	// Kern-Funktionalität
	detectLanguage(code: string): Promise<DetectionResult | null>;
	getAvailableLanguages(): string[];
	
	// Metadaten für die Registry
	getName(): string;                    // Eindeutiger Name für die Registrierung
	getDisplayName(): string;             // Benutzerfreundlicher Anzeigename
	getDescription(): string;             // Beschreibung der Detection-Methode
	
	// Konfiguration
	setMinConfidence(threshold: number): void;
	getMinConfidence(): number;
	
	// Optionale erweiterte Konfiguration
	isConfigurable?(): boolean;           // Ob erweiterte Konfiguration verfügbar ist
	getConfiguration?(): Record<string, any>; // Aktuelle Konfiguration abrufen
	setConfiguration?(config: Record<string, any>): void; // Konfiguration setzen
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
	enabledPatternLanguages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'bash'], // All pattern-based languages enabled by default
	processingScope: 'current-note', // Default to current note only
	historyData: [],
};
