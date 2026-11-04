# DSH CodeCraft v0.1.1 Architecture Refactoring Design

| Field | Value |
| --- | --- |
| Status | Implemented; automated validation passed, Desktop regression pending |
| Target version | 0.1.1 |
| Baseline | 0.1.0 |
| Platform | DSH Desktop on macOS |
| Release type | Internal maintenance refactoring |

v0.1.1 reorganizes CodeCraft while preserving its public behavior and file-safety semantics. It centralizes shared CodeMirror capabilities, separates host integration from document state, and creates a minimal extension point for future language-aware features. It does not add project-level completion or LSP support.

## Goals and Non-Goals

The refactoring should:

- centralize shared editing features such as bracket closing, indentation, folding, undo/redo, and completion UI;
- separate native-tab rendering, editor setup, document state, safe saving, and DSH host integration;
- introduce a lightweight language adapter and registry only where they have real consumers;
- use composition for shared editor behavior and limited inheritance for language-specific defaults;
- retain all v0.1.0 editing, draft, conflict, fallback, and security behavior.

This release will not implement language servers, project indexes, language-specific intelligent completion, a separate IDE shell, third-party plugin dependencies, Windows/Linux support, or periodic autosave. A future autosave feature may default to 30 seconds with fixed interval options, but it must reuse the existing checked save path.

## Architectural Boundaries

DSH continues to own the workspace explorer and native tab lifecycle. CodeCraft manages only the authorized file content area and must rely on verified public extension points rather than private DOM structure.

Dependencies should flow in one direction:

```text
renderer -> editor + document -> host adapter
                 |
                 -> language registry -> one language adapter
```

- `editor/` owns CodeMirror creation, shared extensions, interaction, and styling. It consumes language extensions through an interface and never imports a concrete language module.
- `document/` owns dirty state, drafts, versions, conflicts, and save coordination for every language.
- `renderer/` adapts the editor to DSH native tabs without creating its own explorer or tab system.
- `host/` wraps verified DSH APIs and controlled filesystem access without UI logic.
- `languages/<name>/` owns only file recognition, project-root discovery, environment detection, and truly language-specific behavior. Language modules must not depend on one another or implement their own save path.

## Implemented Structure

The structure is a logical destination, not a requirement to create empty files or directories:

```text
src/
├── client/
│   ├── core/             # plugin lifecycle and composition
│   ├── renderer/         # native-tab renderer integration
│   ├── editor/           # CodeMirror setup and shared extensions
│   ├── languages/
│   │   ├── base/         # minimal adapter contract and defaults
│   │   └── registry.ts   # adapter registration and selection
│   └── document/         # state, save reconciliation, and conflicts
└── host/                 # DSH APIs and controlled file service
```

The implementation remains proportional to the current codebase. It does not create placeholder language directories, a settings directory without settings, or an empty `lsp/` subsystem.

## Minimal Language Contract

The adapter contract should remain intentionally small. Shared brackets, indentation UI, and saving do not belong in it.

```ts
export interface LanguageAdapter {
  readonly id: string
  readonly extensions: readonly string[]
  detectProjectRoot?(fileUri: string, workspaceUri: string): Promise<string>
}

export abstract class BaseLanguageAdapter implements LanguageAdapter {
  abstract readonly id: string
  abstract readonly extensions: readonly string[]

  async detectProjectRoot(_fileUri: string, workspaceUri: string): Promise<string> {
    return workspaceUri
  }
}
```

This is an internal CodeCraft example, not a confirmed DSH API. New capabilities should be added only when an implemented language requires them; larger concerns may deserve separate interfaces instead of expanding the base class.

## Compatibility Requirements

After refactoring, supported files must still open inside native tabs with the same editing features. `Cmd+S`, status reporting, checked atomic saves, conflict handling, and draft recovery must not regress. Tab changes, close operations, plugin disabling, and save failures must never silently discard unsaved content. Unsupported files must remain with native DSH viewers, and uninstalling CodeCraft must restore the native experience. macOS-only support and independence from community plugins remain unchanged.

Any draft loss, silent overwrite, or unauthorized write is a release blocker.

## Implementation Sequence

1. **Establish the baseline:** record current structure, commands, host contracts, and repeatable open/edit/save/conflict/uninstall behavior.
2. **Extract editor composition:** centralize CodeMirror initialization, shared extensions, and theme without changing interaction.
3. **Separate document and host boundaries:** move state, save coordination, and conflict protection out of UI callbacks while retaining validation.
4. **Add the minimal language mechanism:** introduce the adapter, base defaults, and registry only when consumed; do not start LSP work.
5. **Validate and release:** run the automated suite, complete macOS Desktop regression checks, inspect package output, update the changelog and release notes, and publish `v0.1.1`.

## Acceptance and Risks

Acceptance covers native-tab integration, editing parity, safe saves, external modifications, draft lifecycle, fallback behavior, unsupported files, plugin independence, clean module boundaries, and responsive typing/scrolling/tab switching on macOS.

The main risks are reliance on unverified host behavior, over-designing language infrastructure, and regressions in document state. Mitigate them through small focused commits, public DSH extension points, minimal interfaces, and preservation of the `v0.1.0` tag as a rollback baseline.

Future minor releases may add one language ecosystem at a time. Shared LSP transport, document synchronization, and completion adaptation should be implemented once, while language directories provide only configuration and special behavior. Language order remains demand-driven rather than fixed.

## Proposed Release Notes

```markdown
## Changed
- Reorganized editor, document, renderer, and host responsibilities.
- Centralized shared CodeMirror editing extensions.
- Introduced a lightweight language-adapter foundation for future language modules.

## Quality
- Improved maintainability and regression coverage.
- Preserved existing editing, save, and native-tab behavior.

## Notes
- No new language-specific completion features in this patch release.
- macOS-only support remains unchanged.
```

Final release notes must describe only changes that were implemented and verified.
