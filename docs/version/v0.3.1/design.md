# DSH CodeCraft v0.3.1 Python Navigation Design

| Field | Value |
| --- | --- |
| Status | Implemented and validated; release prepared |
| Target version | 0.3.1 |
| Baseline | 0.3.0 |
| Release type | Patch feature release |
| Platforms | macOS and Windows |
| Scope | Python Hover, definition and reference navigation |

## Purpose

v0.3.1 extends the existing workspace-scoped Pyright integration with mouse-driven Python code navigation. It must provide real LSP Hover data, modifier-click navigation from a use to its definition, reference discovery from a definition, native-tab target selection, and workspace-scoped Back and Forward history.

Every requirement in this document is mandatory. The release is not complete if it works only within one file, on one platform, or against saved content. Java remains the browser-local v0.3.0 implementation and does not gain LSP navigation.

This design follows the shared [intelligence module conventions](../../guide/intelligence-module-conventions.md).

## Required Scope

| ID | Requirement | Acceptance summary |
| --- | --- | --- |
| PY-031-01 | Python Hover | Show only signature, type, documentation, and source information returned by Pyright |
| PY-031-02 | Go to Definition | `Command+Click` on macOS or `Ctrl+Click` on Windows navigates from a use to the exact definition |
| PY-031-03 | Find References | The same gesture on a verified declaration requests project references instead of navigating to itself |
| PY-031-04 | Result UI | Zero, one, and multiple targets have deterministic UI and selectable, grouped results |
| PY-031-05 | Symbol coverage | Functions, methods, classes, fields, variables, parameters, and resolvable imports use semantic identity |
| PY-031-06 | Native-tab safety | Cross-file navigation reuses DSH tabs without saving, overwriting, or dropping drafts |
| PY-031-07 | History | Successful navigation supports workspace-scoped Back and Forward |
| PY-031-08 | Reliability | Stale, unavailable, unsupported, inaccessible, and changed targets fail safely on both platforms |
| PY-031-09 | Regression | Existing Python, Java, editing, draft, auto-save, and conflict behavior remains intact |

## User Interaction

### Hover

Hover activates only over a Python identifier and remains non-blocking. The card may contain an LSP-provided signature, type, Docstring, and source name; absent fields are omitted and no content is inferred. Moving to another symbol, editing, switching tabs or workspaces, losing the server, or closing the view cancels or invalidates the card.

Markdown is rendered through an allowlisted renderer that creates safe text and formatting nodes. Raw HTML, scripts, event attributes, command URIs, and arbitrary external navigation are never executed. Plain text is the safe fallback.

### Modifier click

- macOS uses `Command+Left Click`.
- Windows uses `Ctrl+Left Click`.
- A normal click retains CodeMirror cursor and selection behavior.
- The gesture is registered only by the Python adapter and only on a syntax-tree identifier.
- Failure produces a non-blocking message and never changes document content.

The client first requests definition information. If a returned target selection range identifies the current declaration, it requests references with `includeDeclaration: false`. Otherwise it performs Go to Definition. This decision combines Python syntax context, canonical URI identity, and LSP ranges; matching text alone is forbidden.

### Target and reference lists

One valid definition target may navigate immediately. Multiple definitions require a chooser. References always use the lightweight results surface, including the one-result case, so the definition-click interaction is predictable.

Results are grouped by workspace-relative file path and ordered by line and column. Each entry shows a 1-based position and a bounded line excerpt with the target range emphasized. Unreadable or changed entries remain visibly unavailable without disabling other results. Duplicates are removed by canonical path and range.

### Navigation history

Each successful navigation records the source and target after the target is actually revealed. Back and Forward have visible editor controls and platform-safe key bindings selected only after checking DSH conflicts. Ordinary cursor movement and Hover do not create entries. A new navigation after Back drops the forward branch.

History belongs to one active workspace and is cleared when that workspace is released. Deleted, inaccessible, or stale entries report failure without moving the cursor or damaging the remaining history.

## Architecture

```text
Python CodeMirror adapter
  ├── safe Hover tooltip
  ├── modifier-click routing
  ├── target/reference results
  └── Back/Forward controls
          │
Browser navigation coordinator
  ├── request cancellation and freshness
  ├── native-tab open/reuse and pending reveal
  └── workspace navigation history
          │
Authenticated CodeCraft protocol
          │
IntelligenceManager and LspSession
  ├── textDocument/hover
  ├── textDocument/definition
  └── textDocument/references
          │
Existing workspace-scoped Pyright process
```

### Runtime ownership

- `src/client/languages/python/` activates Python-only interaction and syntax guards.
- `src/client/navigation/` may own the smallest reusable controller, history, and presentation units required by the delivered feature.
- `src/client/renderer/` connects the current editor, tab lifecycle, draft state, and native navigation contract.
- `src/protocol.ts` owns normalized, transport-safe request and response types.
- `src/host/intelligence/` owns workspace authorization, provider capability checks, session reuse, and recovery.
- `src/host/lsp/` owns LSP requests, cancellation, UTF-16 positions, document synchronization, and server capabilities.

Shared layers must not import Python-specific CodeMirror features. Python must reuse the existing LSP session instead of starting a second Pyright process. Files are created only when a delivered responsibility needs them.

## DSH Native Navigation Gate

The implementation uses DSH's public `sidebarRight.openResource(address, options)` service. It opens or reuses a Session-derived `dsh-resource://file/session/...` resource, passes the exact target through navigation parameters, and records history only after the destination renderer acknowledges the reveal.

The implementation must:

1. use a public DSH service or renderer callback to open/reuse the target native tab;
2. use a Session-derived file address rather than a raw untrusted URI;
3. deliver line, UTF-16 character, and target range to the destination CodeCraft body;
4. acknowledge reveal before recording successful history;
5. avoid private stores, DOM-click simulation, or a second tab system.

The implementation does not access private stores, simulate DOM clicks, or create a second tab system. Native macOS and Windows acceptance must still confirm that the public contract behaves consistently before release.

## Protocol and LSP Design

### Requests

Hover, definition, and references extend the current intelligence document request shape with Session identity, path, tab generation, document revision, full current content, and a zero-based UTF-16 position. Every request synchronizes the unsaved document before querying the server and accepts an abort signal.

The Host validates all fields, resolves the source through the authenticated Session workspace, and selects the existing Python provider. A stale revision, replaced tab generation, changed workspace, or aborted HTTP request cannot produce an active client result.

### Capability negotiation

LSP initialization advertises the client capabilities needed for Hover content and definition/reference locations. The initialized session records whether the server provides Hover, definition, and references. Unsupported operations return a stable result or error and are not sent blindly.

The session normalizes:

- Hover plaintext or Markdown plus its optional range;
- `Location`, `Location[]`, `LocationLink[]`, and `null` definition results;
- reference `Location[]` and empty results;
- `LocationLink.targetSelectionRange` as the preferred symbol location;
- server position encoding, with UTF-16 required for this release.

Unknown response shapes, non-file URIs, malformed ranges, and unsafe Markdown links are rejected. Protocol responses contain no executable URI or arbitrary HTML.

### Workspace containment and excerpts

Every target URI is converted with platform URL/path utilities and canonicalized by Host-side workspace checks. Definition targets outside the active workspace are refused unless DSH later provides an explicitly authorized read-only mechanism; reference results outside the workspace are filtered.

Reference excerpts are produced through a bounded Host read after containment validation. The browser does not fetch arbitrary local paths. Source text is returned only for the requested bounded line context and is never written to logs.

### Freshness

Results remain valid only while workspace, canonical source URI, editor generation, revision, request generation, and active symbol position match. A newer Hover or navigation action aborts the older request. Late responses are ignored even when cancellation races with completion.

Before reveal, the destination snapshot and range are validated. If content changes make the range invalid, CodeCraft retries through the current synchronized document when safe or reports that the location changed. It never guesses a nearby symbol by name.

## Editor and Document Safety

- LSP zero-based UTF-16 positions are converted with tested utilities; Chinese text, emoji, CRLF, and surrogate pairs must not shift a target.
- Navigation moves the selection, scrolls the exact range into view, focuses the editor, and applies a short-lived highlight.
- Opening another file does not save the source. The existing draft store remains authoritative for unsaved content and selection restoration.
- Auto-save retains its configured behavior but is never triggered specially by navigation.
- Existing open tabs are reused; destination loading follows normal file validation and conflict handling.
- Read-only targets may be revealed but remain read-only. Missing, unsupported, or unauthorized targets fail without changing the current tab.
- Workspace or tab teardown disposes listeners, tooltips, panels, abort controllers, pending reveals, and history ownership.

## Failure Behavior

Starting, unavailable, errored, or capability-limited Pyright produces an actionable message while ordinary editing and saving continue. No result, no references, multiple definitions, timeout, cancellation, changed target, missing file, and permission denial are distinct states.

Automatic recovery remains bounded by the existing intelligence policy. Cancellation and stale results are control flow, not server failures, and do not trigger a restart. Diagnostic logs may record operation, stable error class, and duration, but not source content, Docstrings, credentials, environment values, or unnecessary full paths.

## Out of Scope

- Java or other-language navigation;
- a second language server, Python indexer, or text-search fallback;
- Peek Definition, Rename, Call Hierarchy, diagnostics, code actions, or refactoring;
- AI-generated Hover content or documentation;
- a new file tree, tab system, terminal, or external-browser navigation;
- forced navigation into unavailable third-party or binary-extension source;
- source modification as part of navigation.

## Implementation Sequence

1. Prove the public DSH native-tab open/reuse and destination-reveal contract on macOS and Windows.
2. Add normalized protocol types, strict route validation, LSP capability capture, and fake-server tests.
3. Add cancellable Hover, definition, and references operations to the existing manager and session.
4. Add canonical target filtering, bounded reference excerpts, UTF-16 conversion, and freshness checks.
5. Add Python-only Hover and modifier-click interaction with safe rendering and deterministic target lists.
6. Add native cross-file reveal and workspace-scoped Back/Forward history.
7. Run Python, Java, document, save, draft, auto-save, conflict, lifecycle, and packaging regressions.
8. Complete native Desktop acceptance on macOS and Windows before updating release metadata.

## Definition of Done

v0.3.1 is complete only when PY-031-01 through PY-031-09 pass; Hover and navigation use real synchronized Pyright results; use-to-definition and definition-to-references work across native tabs; multiple targets are selectable; UTF-16 positions are exact; history is reliable and workspace-scoped; stale or unauthorized results never navigate; drafts and saving remain safe; Java v0.3.0 behavior is unchanged; all automated checks pass; and native macOS and Windows acceptance is recorded.
