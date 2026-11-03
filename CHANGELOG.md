# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
