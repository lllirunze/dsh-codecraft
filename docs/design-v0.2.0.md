# DSH CodeCraft v0.2.0 Python Intelligence Design

| Field | Value |
| --- | --- |
| Status | Implemented; automated validation and macOS Host startup passed, interactive Desktop acceptance pending |
| Target version | 0.2.0 |
| Baseline | 0.1.4 |
| Release theme | Project-aware Python completion and reusable intelligence infrastructure |
| Platform scope | Existing editor: macOS and Windows; Python Intelligence acceptance: macOS |

## Purpose and Release Scope

v0.2.0 is the first semantic-intelligence release. It adds project-aware Python completion to the existing native-tab editor and establishes only the reusable boundaries needed to add another language later. Success means that completion understands imports, symbols in other project files, inferred object members, and packages available in the selected Python environment. A list of words copied from the current document does not satisfy this release.

The required v0.2.0 result is deliberately narrower than a full IDE:

- semantic completion for `.py`, `.pyi`, and `.pyw` documents;
- one shared language-server session per workspace and effective server configuration;
- synchronization of unsaved editor content;
- explicit Python interpreter and language-server discovery with actionable status;
- a CodeMirror completion bridge that preserves LSP ranking and edit semantics;
- graceful fallback to the current editor when intelligence is disabled or unavailable.

Hover, signature help, go to definition, and diagnostics are follow-up `0.2.x` candidates, not v0.2.0 release requirements. Framework-specific support for PyTorch, Django, and FastAPI; other languages; formatters; debuggers; package management; notebooks; and AI fixes are out of scope. CodeCraft continues to reuse DSH's file tree and native file tabs.

## Findings from the Existing Repository

The current implementation already has useful seams, but it does not yet have semantic document versions or a Host-side intelligence service:

- `src/client/languages/` selects CodeMirror syntax support by extension through a browser-only `EditorLanguageAdapter`; it remains separate from semantic intelligence.
- `src/client/editor/extensions/completion.ts` installs CodeMirror's generic completion UI but contributes no semantic source.
- `CodeCraftBody` owns the live CodeMirror document, dirty state, drafts, saving, and tab lifetime. It is therefore the source of unsaved text and must assign a monotonically increasing intelligence revision independent of the disk concurrency token.
- `src/protocol.ts` and the authenticated `/codecraft/api` route already provide the browser-to-Host security pattern. Intelligence messages must keep the same Session-derived workspace authority and must never accept a browser-supplied workspace root as trusted input.
- v0.1.4 save, conflict, draft, bracket, and indentation behavior remains authoritative. LSP synchronization observes document changes; it never writes the file or changes save ownership.

## Host Feasibility and DSH Integration

Upstream DSH provides a managed `ctx.subprocess` capability intended for protocols such as LSP. It launches an explicit argument vector without a shell, scrubs ambient credentials, exposes piped stdio, and owns bounded process termination. This is the correct process boundary; CodeCraft must not call a shell or build a second process supervisor.

DSH also has `ctx.lsp` and `dsh-lsp-stdio`, but that service exposes four read-only navigation operations and transiently reads each source from disk. It does not expose completion and does not retain unsaved document state. It therefore cannot directly implement v0.2.0 editor completion. CodeCraft should reuse the public subprocess service and compatible protocol utilities where their exported contracts are stable, while owning a small interactive LSP session for `didOpen`, `didChange`, and completion.

The local compatibility target is DSH `0.2.1-rc.5`, whereas upstream documentation may describe a newer build. Before feature implementation, a Stage 0 probe must prove all of the following against the installed target:

1. the plugin can declare and obtain the public subprocess service;
2. piped stdin/stdout can complete a Pyright `initialize` handshake;
3. process disposal works on plugin unload and DSH shutdown;
4. the authenticated Host route can accept bounded document-sync and completion traffic;
5. the Session-derived workspace root matches the language server's execution world.

Failure of this gate blocks the advertised feature. Private DSH APIs, DOM injection, and lexical completion presented as semantic completion are not acceptable fallbacks.

## Architecture

Prefer capability interfaces and composition over a deep `BaseIntelligence` inheritance tree. Python is the only implementation in this release, so every abstraction must have an immediate use.

```text
CodeMirror editor
  -> client completion source and document-sync scheduler
  -> authenticated CodeCraft Host API
  -> intelligence coordinator and workspace session registry
  -> interactive LSP client
  -> DSH managed subprocess
  -> Pyright language server
```

Proposed responsibilities:

| Area | Responsibility |
| --- | --- |
| `src/client/intelligence/` | Track editor revisions, debounce full-text synchronization, cancel stale completion requests, and convert CodeMirror offsets to protocol positions |
| `src/client/editor/extensions/semantic-completion.ts` | Supply asynchronous CodeMirror completions and apply supported LSP edits as one undoable transaction |
| `src/host/intelligence/` | Select providers, validate requests, report service status, and manage workspace-scoped lifetimes |
| `src/host/lsp/` | JSON-RPC framing, initialization, request correlation, cancellation, document synchronization, bounded restart, and shutdown |
| `src/host/languages/` | Host-side semantic language providers; distinct from client-side syntax adapters |
| `src/host/languages/python/` | Detect Python documents, choose Pyright configuration and interpreter context, and create the first language provider |
| `src/host/frameworks/` | Reserved extension boundary for framework providers that depend on an existing language provider |
| `src/host/ecosystems/` | Reserved extension boundary for toolchain and project-ecosystem providers that compose existing capabilities |
| `src/protocol.ts` | Define bounded sync, completion, close, status, and configuration messages with stable error codes |
| `src/settings/` and `src/config.ts` | Persist enablement and explicit interpreter/server paths using the existing DSH settings surface |

v0.2.0 reserves the parallel `src/host/languages/`, `src/host/frameworks/`, and `src/host/ecosystems/` boundaries with explanatory README files. Python is the only concrete language provider in this release; no concrete framework or ecosystem provider is added. A small `IntelligenceProvider` contract, capability declaration, and registry remain sufficient proof that later providers can reuse the coordinator and editor bridge.

### Language, framework, and ecosystem extensions

The extension model has three distinct roles:

```text
src/host/
├── intelligence/            shared provider lifecycle and capability composition
├── languages/               semantic language providers
│   └── python/              Python and Pyright integration in v0.2.0
├── frameworks/              augments a language (future Django, FastAPI, PyTorch)
└── ecosystems/              augments a project/toolchain (future Kubernetes, Helm, Maven)
```

These Host-side language providers are separate from `src/client/languages/`. The client directory continues to select CodeMirror syntax highlighting and presentation extensions, while `src/host/languages/` owns server configuration, interpreter discovery, and semantic provider activation. The shared protocol connects them without importing Host implementations into the browser bundle.

#### Existing client language directory

`src/client/languages/` remains in place because it is browser code with a different responsibility from semantic language providers. It currently maps file extensions to CodeMirror language packages, supplies the language label shown by the editor, and falls back to plain text. These imports must remain on the client side because they produce CodeMirror `LanguageSupport` extensions used when constructing an `EditorState`.

The v0.1.4 names were broader than their actual responsibility. The v0.2.0 baseline therefore applies these boundaries:

- use the editor-facing `EditorLanguageAdapter` contract;
- keep only presentation fields such as language id, label, extensions, and `LanguageSupport` creation;
- omit `detectProjectRoot()` from the client contract because project-root resolution belongs to the Host semantic provider;
- keep semantic server configuration, environment discovery, and workspace activation exclusively under `src/host/languages/`;
- share only transport-safe identifiers and protocol types across Host and client, never Host implementations or CodeMirror objects.

Therefore, the client directory conforms to the v0.2.0 structure after this responsibility cleanup. Moving it under `src/host/languages/` would be incorrect and would risk including Node-only behavior in the browser boundary.

A framework provider must declare its required language and capabilities. For example, a future PyTorch provider depends on Python intelligence and contributes additional knowledge without creating another LSP client, completion UI, document synchronizer, or Python environment detector. Multiple compatible framework providers may be active in one workspace.

An ecosystem provider may operate across languages, but it must use the same provider lifecycle, workspace identity, status reporting, and security boundaries. It must not become a second editor, file tree, terminal, package manager, or process service.

Reserved provider categories may contain only their boundary README files until a concrete feature is implemented. New providers must be added because a shipped feature needs them, not to speculate about future class hierarchies.

## Document and Request Lifecycle

Each mounted editable Python tab receives an in-memory revision starting at one. The revision increases for every CodeMirror document transaction and is separate from `TextFileSnapshot.version`, which remains the opaque disk-save token.

The lifecycle is:

1. resolve the file and workspace from `sessionId` and the native tab path on the Host;
2. open the canonical file URI in the workspace's Python session with the complete current text;
3. send debounced full-text `didChange` notifications for v0.2.0;
4. flush the latest revision before requesting completion;
5. bind every result to session, canonical URI, tab instance, revision, and request sequence;
6. discard results after further edits, cursor movement that invalidates the query, tab replacement, or cancellation;
7. send `didClose` when the final editor reference closes, and shut down the server when its workspace session is disposed.

Full-text synchronization is simpler and safer for the existing 2 MiB editor limit. Incremental changes may be considered later after measurements. Synchronization must not trigger saving, alter draft state, or weaken conflict checks.

CodeMirror offsets must be converted by line and negotiated LSP position encoding. v0.2.0 should require or negotiate UTF-16 and test astral Unicode characters explicitly. The bridge must support ordinary insert text, snippets, `textEdit`, `sortText`, `filterText`, and non-conflicting same-document `additionalTextEdits`. Workspace edits, commands, and cross-file edits are rejected in this release. Applying one accepted completion must produce one undo step and must not duplicate brackets already handled by CodeMirror.

## Python Environment and Pyright

Pyright is the selected semantic engine, subject to the Stage 0 handshake. Environment selection is deterministic:

1. an explicit CodeCraft interpreter path;
2. a valid workspace `.venv`;
3. a valid workspace `venv`;
4. an available system interpreter;
5. otherwise, an `Unavailable` state with corrective guidance.

The language-server distribution strategy must be decided before implementation dependencies are added. Two acceptable options require a size, license, and Desktop-runtime check:

- bundle a pinned Pyright npm dependency and launch it with the supported DSH runtime; or
- resolve a user-installed `pyright-langserver` from the DSH subprocess environment and allow an explicit absolute path.

The release must choose and document one tested default. It must never download a server, install packages, create an environment, or execute commands found in project files automatically. Process arguments are passed as an array, the working directory is the canonical Session workspace, and status logs exclude source text and minimize absolute-path disclosure.

The existing editor remains supported on macOS and Windows. Python Intelligence in v0.2.0 is implemented and accepted on macOS only; on Windows it must remain disabled or clearly unavailable without breaking syntax highlighting, editing, or saving. This narrows the new feature without retracting the README's current Windows support for the base editor.

## Settings and User Feedback

Add a **Python Intelligence** group to the existing CodeCraft settings card:

| Setting | Default | Behavior |
| --- | --- | --- |
| Enable Python Intelligence | On when supported | Starts semantic services only for Python documents |
| Python interpreter path | Auto | Uses the deterministic discovery order above |
| Pyright language-server path | Release-strategy dependent | Uses the tested bundled or discovered server |
| Semantic completion | On | Allows completion to be disabled independently |

The editor should show a compact status such as `Starting`, `Ready`, `Unavailable`, or `Error`. Missing tools and invalid paths must explain the next action without repeated modal prompts. A server failure degrades only intelligence; normal editing and saving continue.

## Reliability, Security, and Resource Limits

- Reuse one server per canonical workspace and effective configuration; never start one process per tab or keystroke.
- Cap protocol messages, stderr retention, request duration, pending requests, and restart attempts.
- Restart at most once after an unexpected transport failure, then report a stable error until configuration or workspace state changes.
- Cancel superseded completion requests and ignore late responses even when server cancellation is not honored.
- Resolve all files and workspaces on the Host, enforce canonical workspace containment, and keep the browser outside the process boundary.
- Never forward DSH credentials or arbitrary environment variables to the server.
- Dispose requests, streams, document references, and processes on tab, workspace, configuration, plugin, and application lifecycle changes.

## Delivery Plan

### Stage 0: Feasibility spike

Prove the installed DSH service contracts, a managed Pyright handshake, authenticated transport, and clean teardown. Record the chosen Pyright distribution decision. This spike may be discarded; feature architecture does not begin until it passes.

### Stage 1: Reusable core

Add the provider contract, registry, protocol types, workspace coordinator, and interactive LSP transport. Use a fake language-server fixture to verify framing, cancellation, restart, and disposal before connecting UI behavior.

### Stage 2: Python completion

Add Python environment selection, Pyright initialization, live full-text synchronization, semantic completion conversion, status, and settings. Validate import, cross-file, inferred-member, and installed-dependency scenarios in a multi-file project.

### Stage 3: Regression and release evidence

Run the full repository check and add `docs/validation-v0.2.0.md`. Complete macOS DSH Desktop acceptance for multiple tabs, unsaved edits, cancellation, server absence and failure, configuration changes, save/autosave/conflicts, indentation, brackets, plugin unload, and process cleanup. README, changelog, package versions, badges, and release notes change only after implementation and validation.

## Verification Requirements

Automated tests must cover:

- split and combined `Content-Length` frames, malformed and oversized messages;
- request correlation, server requests, timeouts, cancellation, restart limits, and shutdown escalation;
- canonical workspace/session isolation and invalid-path rejection;
- document open/change/close ordering and monotonically increasing revisions;
- stale completion rejection across edits, tabs, files, sessions, and server restarts;
- UTF-16 position conversion with multiline text and surrogate pairs;
- completion lists and items, snippets, text edits, additional-edit conflicts, ranking metadata, and one-step undo;
- interpreter/server discovery, explicit configuration, `.venv`, missing tools, and malformed settings;
- degradation that leaves current editing, drafts, manual save, auto save, conflict handling, brackets, and indentation intact.

The release is blocked if any of the following remains true: completion only uses lexical words; unsaved text is invisible to Pyright; results can reach the wrong tab or revision; process cleanup is unreliable; no tested server-availability path exists; or existing safe-save behavior regresses.

## Final Definition

v0.2.0 is complete when a real multi-file Python project on macOS receives reliable import, cross-file, inferred-member, and selected-environment dependency completion from unsaved content, while the intelligence layer can be disabled or fail without affecting the established editor. The implementation must also demonstrate that a second language can later reuse the provider, Host transport, LSP session, and CodeMirror bridge without copying them.

## References

- [DSH LSP package group](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/lsp/README.md)
- [DSH stdio LSP provider](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/lsp/lsp-stdio/README.md)
- [DSH managed subprocess service](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subprocess/subprocess/README.md)
- [Language Server Protocol 3.18](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/)
- [Pyright installation](https://github.com/microsoft/pyright/blob/main/docs/installation.md)
- [CodeMirror autocomplete API](https://codemirror.net/docs/ref/#autocomplete)
