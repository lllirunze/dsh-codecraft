# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.2] - 2026-11-04

### Added

- Added persistent auto-save settings to DSH's native Plugins settings surface, disabled by default with 10, 30, 60, and 120-second intervals.
- Added per-document auto-save scheduling that only writes dirty, writable, conflict-free documents through the existing checked save path.
- Added explicit common bracket and quote pairing with selection wrapping, paired deletion, closer skipping, language-aware backticks, and Python triple quotes.

### Changed

- Serialized overlapping automatic and manual save requests so edits made during an in-flight save remain dirty and receive a follow-up save.
- Expanded automated coverage for settings validation, auto-save eligibility, Host settings mutations, and bracket interaction behavior.

### Notes

- Auto save preserves external-change detection, drafts, read-only handling, and the existing manual save shortcuts.
- Automated validation passes; native DSH Desktop regression testing remains manual.

## [0.1.1] - 2026-11-04

### Changed

- Separated plugin lifecycle, native-tab rendering, editor composition, document state, and language selection into focused client modules.
- Centralized shared CodeMirror bracket, completion, folding, and indentation extensions.
- Replaced the language switch with a duplicate-safe adapter registry and conservative base adapter.
- Extracted draft restoration, external-change decisions, and save reconciliation into testable document functions.

### Quality

- Added regression coverage for language registration, project-root defaults, draft restoration, disk changes, and edits made while saving.
- Preserved the v0.1.0 host protocol, checked atomic saves, and native-tab integration while validating Windows support alongside macOS.

### Notes

- This release does not add LSP support, project indexing, language-specific intelligent completion, or autosave.
- Automated validation passes; native DSH Desktop regression testing remains manual.

## [0.1.0] - 2026-11-03

### Added

- A CodeMirror 6 editor embedded in DSH's native file tabs through `ctx.documentPreviews`.
- Syntax highlighting, line numbers, active-line highlighting, bracket matching, automatic brackets and quotes, indentation, folding, undo/redo, search, line comments, and basic completion.
- DSH-aware light and dark styling with a compact editor status bar.
- `Cmd+S` and status-bar saves with dirty, saving, saved, failed, and read-only states.
- An authenticated Host endpoint at `/codecraft/api` for complete reads, version checks, and controlled saves.
- Session-authoritative workspace resolution, `realpath` containment checks, and symbolic-link write protection.
- A 2 MiB editable-file limit with UTF-8, NUL, BOM, and line-ending validation.
- Optimistic concurrency using `mtimeNs:size:ino`, sibling temporary files, version rechecks, and atomic replacement.
- External-change detection with safe reloads for clean files and conflict handling for local drafts.
- Draft persistence in memory and `localStorage`, including selection and scroll restoration.
- Safe fallback messages for large, binary, non-UTF-8, and mixed-line-ending files.
- Unit tests and build verification for filesystem operations, routes, addresses, drafts, language mapping, editor state, and bundle registration.
- Separate English and Simplified Chinese user guides for installation, updates, uninstallation, and usage.

### Security

- The browser submits only a Session identity and file path; it cannot select the workspace root.
- Host requests pass through DSH's Host/Origin and browser-authentication fence.
- Every filesystem target must remain inside the authenticated Session workspace.
- Detected version conflicts never overwrite disk content.
- File editing does not call models, upload content, or add telemetry.

### Known limitations

- v0.1.0 targets macOS and DSH Desktop `0.2.1-rc.5`.
- LSP, semantic diagnostics, automatic imports, go-to-definition, file management, Git, and terminal features are not included.
- Unsupported files require switching to DSH's native read-only viewer.
- Atomic replacement does not preserve hard-link relationships or extended attributes.
- Drafts are removed when the plugin is uninstalled or site data is cleared.
- End-to-end validation in the native DSH Desktop UI is still pending.
