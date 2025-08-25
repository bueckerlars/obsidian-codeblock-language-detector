/**
 * Core types and interfaces for the Auto Syntax Highlight plugin
 */

// Detection methods available for language detection
// Note: This is now used for backward compatibility in settings
// The actual detection system supports dynamic registration of any detector
export type DetectionMethod = 'vscode-ml' | 'highlight-js' | 'pattern-matching';

// Trigger behaviors for when the plugin should activate
export type TriggerBehavior = 'auto-on-open' | 'auto-on-edit' | 'auto-on-save' | 'manual';

// Processing scope for code blocks
export type ProcessingScope = 'current-note' | 'entire-vault';

// Detector configuration interface
export interface DetectorConfiguration {
	enabled: boolean;
	confidenceThreshold: number;
	order: number;
	config: Record<string, any>;
}

// Plugin settings interface
export interface AutoSyntaxHighlightSettings {
	// Trigger behavior setting
	triggerBehavior: TriggerBehavior;
	
	// Global confidence threshold (0-100) - fallback for detectors without specific threshold
	confidenceThreshold: number;
	
	// Detection method order (first method is tried first)
	// Legacy setting - still used for backward compatibility
	detectionMethodOrder: DetectionMethod[];
	
	// Dynamic detector configurations (takes precedence over legacy settings)
	detectorConfigurations: Record<string, DetectorConfiguration>;
	
	// Enable/disable individual detection methods (legacy)
	enableVSCodeML: boolean;
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
	detectionMethodOrder: ['vscode-ml', 'highlight-js', 'pattern-matching'],
	detectorConfigurations: {
		'vscode-ml': {
			enabled: true,
			confidenceThreshold: 70,
			order: 0,
			config: {}
		},
		'highlight-js': {
			enabled: true,
			confidenceThreshold: 70,
			order: 1,
			config: {}
		},
		'pattern-matching': {
			enabled: true,
			confidenceThreshold: 70,
			order: 2,
			config: {
				enabledLanguages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'bash']
			}
		}
	},
	enableVSCodeML: true,
	enableHighlightJs: true,
	enablePatternMatching: true,
	enableHistory: true,
	maxHistoryEntries: 100,
	showNotifications: true,
	enabledPatternLanguages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'bash'], // All pattern-based languages enabled by default
	processingScope: 'current-note', // Default to current note only
	historyData: [],
};
