# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.5.2] - 2026-11-14

### Changed

- Validated the complete CodeCraft editing, workspace, settings, icon, Python, Java, and HTML experience on DSH Desktop `0.2.2-rc.3` across macOS and Windows.
- Narrowed the declared DSH compatibility range to `>=0.2.2-rc.3 <0.2.3` and recorded `0.2.2-rc.3` as the validated release.
- Strengthened build verification for stable bundle identity, Host routes and exports, Client injection and external boundaries, native menu contributions, and single plugin registration.
- Confirmed the DSH Windows in-app update to rc.3 completes replacement, automatically relaunches Desktop, and preserves CodeCraft activation.

## [0.5.1] - 2026-11-13

### Added

- Added an explicit CodeCraft settings action that installs the pinned Material Icon Theme into the rebuildable DSH cache through configured, mainland-China, or official npm registries.
- Added synchronized file, compound-extension, named-folder, expanded-folder, workspace, and native Explorer tab icon mappings generated from the exact compatible icon package version.

### Changed

- Removed bundled Material SVG assets from the source tree and npm package while retaining upstream license attribution and deterministic version-update tooling.
- Kept unmatched files and folders, unavailable networks, missing caches, and invalid icon resources on CodeCraft's built-in default icons without affecting Explorer or editor behavior.

### Fixed

- Routed verified icon reads through CodeCraft's authenticated API so installed icons render immediately in DSH Desktop without relying on a separate custom-protocol image request.
- Made generated Material Icon mappings deterministic across operating-system locales and tolerant of checkout line endings.
- Stabilized the Material Icon synchronization and HTML refactoring checks on slower CI runners.
- Moved macOS CI and publication jobs to the Apple Silicon `macos-latest` runner.

## [0.5.0] - 2026-11-13

### Added

- Added a workspace Explorer with file and folder creation, rename, copy, cut/paste, move, multi-selection, drag-and-drop, refresh, path copying, and Finder/Explorer reveal.
- Added file-management actions to DSH's native file and directory context menus.
- Added system Trash and Recycle Bin deletion with explicit confirmation before any permanent-delete fallback.

### Changed

- Coordinated workspace mutations with dirty documents, open tabs, save targets, and language-service document state.
- Refreshed visible workspace directories after internal operations and external filesystem changes while preserving valid tree state.

### Fixed

- Rejected traversal, workspace escape, unsafe symlink operations, invalid cross-platform names, silent overwrite, and destructive self/descendant moves.

## [0.4.2] - 2026-11-12

### Added

- Added offline HTML diagnostics for malformed structure, invalid attributes and values, duplicate or missing targets, document skeletons, accessibility issues, and deprecated constructs.
- Added a current-tab Problems list with exact-range navigation and stale-result isolation.
- Added previewed, syntax-aware paired-tag and current-document ID rename with explicit confirmation, refusal guards, and one-step Undo.

### Changed

- Replaced periodic AutoSave and durable draft recovery with immediate conflict-checked saving after every writable document change.
- Kept the normal editor footer stable as `In sync` while preserving visible read-only, external-change, conflict, and save-failure states.

### Fixed

- Removed browser unload vetoes that could prevent normal DSH Desktop exit on macOS or Windows.

## [0.4.1] - 2026-11-11

### Added

- Added offline HTML Hover for standard tags, attributes, and known attribute values using the bundled HTML reference data.
- Added a nested HTML Outline, DOM ancestor breadcrumbs, and a subtle highlight for the element containing the caret.
- Added multiline HTML comment folding, start/end tag matching navigation, and syntax-aware expand/shrink selection.
- Added navigation for relative local `src`/`href` resources and same-document `#id` targets with explicit failure feedback.
- Added whole-document and selection HTML formatting that follows the shared two- or four-space indentation setting.
- Added explicit Emmet abbreviation expansion and HTML5 template insertion without intercepting ordinary Tab.
- Added a native **Preview in Browser** action that protects unsaved edits and opens the saved HTML file through the operating system's default file association.

### Changed

- Kept every new HTML capability inside the existing single HTML Editing Assistance switch and browser-local module, with no language server, development server, embedded WebView, or new Host route.

## [0.4.0] - 2026-11-09

### Added

- Added a dedicated offline HTML editing module for `.html` and `.htm` files with local parsing, highlighting, contextual completion, entity completion, tag closing, comments, and HTML5 snippets.
- Added syntax-aware HTML indentation that follows the live two- or four-space setting and safely handles paired tags, closing tags, void elements, and optional-end elements.
- Added one persistent HTML Editing Assistance switch that immediately updates open and future HTML tabs and reports Ready, Disabled, or Error status without affecting ordinary editing or saving.

### Changed

- Kept HTML assistance entirely browser-local without an HTML language server, subprocess, runtime download, or network dependency.

## [0.3.3] - 2026-11-08

### Added

- Added a persistent Java Editing Assistance switch that immediately controls browser-local Java features in open and future Java tabs.

### Changed

- Kept common editing, saving, drafts, indentation, and Python Intelligence independent from the Java feature gate.

## [0.3.2] - 2026-11-08

### Fixed

- Corrected the package version metadata after the v0.3.1 release was published from a commit that still identified itself as v0.3.0.
- Republished the validated v0.3.1 implementation without functional changes.

## [0.3.1] - 2026-11-08

### Added

- Added safe Pyright Hover cards with signatures, types, Docstrings, and source locations for Python symbols.
- Added `Command+Click` on macOS and `Ctrl+Click` on Windows for semantic definition and reference navigation.
- Added grouped cross-file result lists, exact native-tab reveal, and Back/Forward navigation history.

### Changed

- Extended the workspace-scoped Pyright session with cancellable definition and reference requests for synchronized unsaved content.
- Filtered stale, malformed, changed, inaccessible, and outside-workspace navigation targets before reveal.

## [0.3.0] - 2026-11-07

### Added

- Added offline Java keyword, common-type, snippet, and current-document completion.
- Added CodeCraft Structured Javadoc generation for methods and constructors, including parameters, return types, and declared exceptions.
- Added Java editing support for brackets, indentation, comments, folding, and common declaration and control-flow snippets.

### Changed

- Implemented Java assistance entirely in the browser without JDT LS, a JDK, a Java process, runtime downloads, or network access.
- Kept Java completion deliberately lexical and current-document scoped so unavailable semantic services never affect editing or saving.

### Notes

- Cross-file symbols, import resolution, inferred members, diagnostics, navigation, refactoring, and build integration are outside this release.

## [0.2.2] - 2026-11-07

### Added

- Added syntax-guarded Google Style Docstring generation for the first statement of Python functions, methods, async functions, and classes.
- Added ordered summary, `Args`, `Returns`, and `Yields` placeholders with two- and four-space indentation and one-step Undo.
- Added automatic call parentheses and inside-caret placement for methods, functions, and constructors in clear invocation contexts while preserving callback and other callable references.
- Added end-to-end completion cancellation from an abandoned browser request to the LSP `$/cancelRequest` notification.

### Fixed

- Retired idle workspace Pyright sessions after the final tracked Python document closes.
- Bounded repeated startup and transport recovery with a cooldown instead of repeatedly spawning failed language servers.
- Rejected changed content at equal or older revisions and preserved the current tab generation when an older tab closes.
- Prevented stale completion responses from crossing document revisions and prevented internal paths or environment details from reaching browser errors.

### Notes

- Triple quotes outside a direct first-statement function or class body retain normal multiline-string behavior.
- Signature help, diagnostics, additional Docstring styles, and Linux Python Intelligence remain outside this release.

## [0.2.1] - 2026-11-05

### Added

- Added Python syntax-aware Enter indentation for block headers, multiline expressions, and container literals.
- Added safe input-time alignment for `elif`, `else`, `except`, `finally`, `case`, and closing delimiters.
- Added a browser-side Python module boundary for language-specific editor extensions.

### Changed

- Preserved generic delimiter expansion while delegating Python indentation decisions to CodeMirror's Python syntax tree.
- Kept two- and four-space settings authoritative without rewriting existing file content.
- Preserved the macOS and Windows Python Intelligence behavior validated in v0.2.1-rc.0.

### Notes

- Dictionary, slice, annotation, string, comment, lambda, and URL colons do not trigger block indentation.
- Docstring generation and new semantic language features remain outside this release.

## [0.2.1-rc.0] - 2026-11-05

### Added

- Added Windows support for the existing project-aware Python Intelligence feature set.
- Added native Windows environment discovery for `.venv\\Scripts\\python.exe` and `venv\\Scripts\\python.exe`.
- Added stable unavailable reasons for unsupported platforms, interpreter failures, launch failures, initialization timeouts, workspace failures, and unexpected server exits.

### Changed

- Moved Python platform support into a provider-owned policy while keeping shared LSP infrastructure platform-neutral.
- Added macOS and Windows CI coverage, including real Pyright completion from a workspace path containing spaces and Unicode.
- Published preview packages through the npm `rc` dist-tag without moving `latest`.

### Notes

- This preview contains only Windows Python Intelligence compatibility work; the broader v0.2.1 indentation and Docstring scope is not included.
- Linux remains unsupported.
- Windows DSH Desktop acceptance must be completed before this release candidate is published.

## [0.2.0] - 2026-11-05

### Added

- Added project-aware Python completion backed by a bundled Pyright language server.
- Added unsaved document synchronization, workspace-scoped LSP sessions, request cancellation, stale-result rejection, bounded restart with document replay, and managed process teardown.
- Added Python Intelligence settings for enablement, semantic completion, interpreter selection, and an optional server override.
- Added extension boundaries for language, framework, and ecosystem intelligence providers.

### Changed

- Narrowed client language adapters to CodeMirror presentation and moved semantic language responsibilities to the Host boundary.
- Added DSH's managed subprocess service as a Host requirement while preserving the authenticated Session-derived workspace boundary.
- Added one bounded self-recovery attempt when a stale Pyright session unexpectedly returns no member completions.
- Removed CodeMirror's macOS `Option` completion aliases because they can produce composed input characters; typing activation remains the primary macOS interaction.

### Notes

- Python Intelligence targets macOS in v0.2.0; the existing editor remains supported on macOS and Windows.
- Hover, signature help, diagnostics, go to definition, frameworks, and other semantic languages remain future work.
- Automated validation, macOS Host startup, and core Python member-completion acceptance pass.

## [0.1.4] - 2026-11-04

### Added

- Added persistent two- or four-space indentation settings that apply immediately to open editors.
- Added language-neutral Enter behavior for inherited indentation, unmatched openers, and empty brace, bracket, or parenthesis expansion.
- Added boundary-aligned Tab and Shift+Tab commands for single lines and multiline selections.

### Changed

- New indentation is always space-only while historical tabs and existing file content remain unchanged until explicitly edited.
- Multiline indentation now preserves selections, skips blank lines, excludes column-zero endpoints, and forms one undoable transaction.
- The status bar now reports the configured indentation width instead of the file's detected historical style.

### Notes

- Language-specific indentation, project configuration discovery, and whole-file formatting remain outside this release.
- Automated validation and macOS DSH Desktop acceptance pass; the focused Windows regression remains pending.

## [0.1.3] - 2026-11-04

### Fixed

- Fixed the CodeCraft settings card not appearing because the client watched the package name instead of the Cordis settings entry ID.
- Kept Schemastery external to the Host bundle so CodeCraft shares DSH's schema instance and does not block Desktop startup.
- Strengthened build verification so settings registration requires the requested namespace to be served by DSH.

### Notes

- This patch makes the auto-save controls introduced in v0.1.2 accessible as a dedicated CodeCraft section in DSH Settings.

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
