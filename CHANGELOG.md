# Changelog

## [0.2.0] - 2025-08-25

### Added
- Undo Ignore Service for enhanced code block detection management
- Statistics Modal with detailed breakdown of detection activities
- VSCode Language Detection Engine
- Dynamic Detector Registry for modular extensibility

### Changed
- Refactored History Modal for improved user experience
- Enhanced statistics moved from History Modal to separate Statistics Modal
- Optimized Detection Engine architecture
- Settings split into logical sections and components

### Fixed
- Fixed innerHTML issues in Statistics Modal
- Removed redundant code for better performance

## [0.1.1] - 2025-08-24

### Added
- Comprehensive History Management System with entry management, storage, and validation
- Dynamic settings for detection methods
- Detailed README documentation with screenshots
- MIT License added

### Changed
- Plugin renamed from "obsidian" to "codeblock-language-detector"
- Repository renamed for better clarity
- Detection Engine refactored with dynamic registration of detectors
- Settings UI improved for better user experience

### Fixed
- Fixed History Modal empty state display
- Implemented requested changes from Obsidian Plugin Review
- Fixed Pattern Matching detection order and confidence threshold bugs
- Corrected settings text for active languages

### Removed
- Removed "obsidian" from plugin ID

## [0.1.0] - 2025-08-24

### Added
- **Initial complete implementation** of the CodeBlock Language Detector Plugin
- **Automatic language detection** for code blocks without language tags
- **Dual-Detection System:**
  - Highlight.js Detection for precise language recognition
  - Pattern Matching Detection for domain-specific languages
- **Flexible Trigger Options:**
  - On opening a note (auto-on-open)
  - On editing (auto-on-edit)
  - On saving (auto-on-save)
  - Manual via Command Palette
- **Intelligent Processing Scope:**
  - Current note
  - Entire vault
- **Comprehensive History System:**
  - Complete tracking of all detections
  - Undo functionality for individual or all changes
  - Persistent history with configurable number of entries
- **Advanced Configuration:**
  - Adjustable confidence threshold (0-100%)
  - Priority order of detection methods
  - Language filtering for Pattern Matching
  - Optional notifications
- **70+ supported programming languages:**
  - Web Technologies: JavaScript, TypeScript, HTML, CSS, SCSS, JSON, XML
  - Backend Languages: Python, Java, C#, C++, C, Go, Rust, PHP, Ruby
  - Databases: SQL, MongoDB, Redis
  - DevOps: Bash/Shell, PowerShell, Dockerfile, YAML, TOML
  - Functional Languages: Haskell, Scala, Clojure, F#
  - Others: Markdown, LaTeX, R, MATLAB, Swift, Kotlin
- **User Interface:**
  - Clear settings with logical groupings
  - History browser with detailed breakdown
  - Language toggle grid for Pattern Matching configuration
  - Drag & Drop handler for improved UX
- **Command Palette Integration:**
  - "Detect language in current note"
  - "Detect language in entire vault"
  - "Show detection history"
  - "Undo last detection"
  - "Clear all detections"
- **Performance Optimizations:**
  - Asynchronous processing
  - Intelligent caching
  - Minimal overhead for large vaults

### Technical Implementation
- **Modular Architecture** with clear separation of responsibilities
- **Core Services:**
  - LanguageDetectionEngine for central coordination
  - CodeAnalyzer for code block recognition
  - SyntaxApplier for language tag application
  - HistoryService for change tracking
- **Detection Engines:**
  - HighlightJsDetector with statistical analysis
  - PatternMatchingDetector with keyword and syntax analysis
- **UI Components:**
  - DynamicSettingsTab for configuration
  - HistoryModal for history display
  - Various Settings Sections for organized settings
- **TypeScript Implementation** with full type safety
- **ESBuild Integration** for optimized builds
- **Obsidian API Compliance** for seamless integration

### Dependencies
- `@vscode/vscode-languagedetection`: ^1.0.22 - ML-based language detection
- `highlight.js`: ^11.9.0 - Syntax highlighting and language detection
- Various DevDependencies for TypeScript, ESLint and build tools

### Initial Release Features
- Fully functional plugin ready for Community Plugin Store
- Comprehensive documentation with examples and screenshots
- Automated Release Workflow for GitHub
- Manifest and versioning for Obsidian Plugin System
- CSS styling for consistent UI/UX integration

---

## Legend

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Now removed features
- **Fixed**: Bug fixes
- **Security**: Security updates
