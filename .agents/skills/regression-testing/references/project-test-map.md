# Project Regression Test Map

Use this map to select focused automated tests and to derive the final manual DSH Desktop checklist. Confirm the files still exist before running them.

## Automated suites

| Area | Focused tests | Primary coverage |
| --- | --- | --- |
| Host paths and addresses | `tests/address.test.ts` | Session file-address parsing and filename handling |
| File safety and persistence | `tests/files.test.ts` | Reads, checked saves, conflicts, symlinks, encodings, BOM, line endings, modes, indentation detection |
| Host API | `tests/routes.test.ts` | Route validation, authenticated workspace boundaries, request and error behavior |
| Document state | `tests/document.test.ts` | Initial state, disk-change decisions, save reconciliation |
| Document status | `tests/document-status.test.ts` | Stable in-sync footer and read-only, conflict, and save-failure exceptions |
| Save queue | `tests/save-queue.test.ts` | Immediate first save, coalesced latest-content follow-up, recovery after a failed write |
| Drafts | `tests/drafts.test.ts` | Legacy browser draft cleanup and unavailable-storage behavior |
| Shared editor | `tests/editor.test.ts` | Dirty comparison, language gates, completion freshness, bracket/quote behavior, indentation, keymaps |
| Settings | `tests/settings.test.ts` | Defensive legacy resolution (including retired AutoSave fields), mutation paths, accepted/rejected snapshots, feature settings |
| Language registry | `tests/languages.test.ts` | Extension mapping, adapter registration, duplicate rejection, special paths |
| HTML | `tests/html-editing.test.ts`, `tests/html-diagnostics.test.ts`, `tests/html-productivity.test.ts`, `tests/html-refactoring.test.ts`, `tests/editor.test.ts`, `tests/languages.test.ts`, `tests/settings.test.ts` | Parsing, completion, diagnostics and ranges, Hover, Outline, structure, selection, folding, formatting, Emmet, safe tag/ID rename, live gating, registration, settings |
| Java | `tests/java-lightweight.test.ts`, `tests/editor.test.ts`, `tests/settings.test.ts` | Local completion, snippets, Structured Javadoc, live assistance gate |
| Python editing | `tests/python-indentation.test.ts`, `tests/python-docstrings.test.ts`, `tests/editor.test.ts` | Syntax-aware indentation, Google Style Docstrings, shared editor integration |
| Python Intelligence | `tests/python-intelligence.test.ts`, `tests/python-environment.test.ts`, `tests/python-platform.test.ts` | Pyright completion, environment discovery, platform policy, lifecycle |
| Python navigation | `tests/python-navigation.test.ts`, `tests/editor.test.ts` | Navigation guards, native-tab coordination, position and freshness logic |
| LSP transport | `tests/lsp.test.ts` | Message framing and cancellation |

Run one or more focused files with the repository's documented form:

```bash
npx vitest run tests/<module>.test.ts
```

Use the full gate when the change crosses modules or when the user asks for complete regression testing:

```bash
npm run check
```

In the current package this covers, in CI order:

```text
npm run typecheck
npm test
npm run build
npm run verify
```

## Change-to-test guidance

- Changes under `src/host/` or to `src/protocol.ts`: prioritize files, routes, addresses, document state, save queue, and the full gate.
- Changes under `src/client/editor/`, `src/client/document/`, or shared renderer lifecycle: prioritize editor, document, document status, save queue, legacy draft cleanup, settings, language registry, then the full gate.
- Changes under one language module: run that language's suites plus editor, settings, and language-isolation tests; use the full gate for shared contracts or completed features.
- HTML changes: run the HTML editing, diagnostics, productivity, and refactoring suites with editor, settings, and language isolation.
- Changes to settings schema or UI: run settings and editor tests, then include every affected language gate.
- Changes to package metadata, build scripts, entry points, Cordis configuration, exports, or dependencies: run the full gate, inspect `npm pack --dry-run --ignore-scripts --json`, and apply the local Desktop safety gate.
- File-write, conflict, save-status, authentication, process lifecycle, or cross-platform changes always require broad automated coverage and explicit manual follow-up.

## Manual DSH Desktop handoff

Before native acceptance, apply [local DSH Desktop safety validation](dsh-desktop-safety-validation.md) for candidate identity, package, installation, restart, and runtime registration checks.

Choose only scenarios relevant to the tested change, but always include ordinary editing and saving when editor behavior changed:

- Confirm DSH Desktop starts and the session and native file tab open without a plugin-attributable error dialog, blank page, repeated notification, or crash.
- Open the affected file types in native DSH tabs; edit, undo/redo, save, close, reopen, and confirm content and status remain correct.
- Exercise the changed completion, indentation, comment, navigation, Hover, snippet, or settings behavior using real keyboard and pointer interaction.
- Toggle affected settings in already-open and newly opened tabs; restart DSH Desktop when persistence matters.
- Keep unrelated HTML, Java, and Python tabs open to confirm language isolation.
- Test conflict, read-only, immediate-save, and legacy draft cleanup behavior when those paths changed.
- Test paths containing spaces and Chinese characters; on Windows include drive-letter paths and CRLF when relevant.
- Disconnect networking for features required to work offline and confirm no unexpected process or download appears.
- Exit DSH Desktop normally and restart; confirm the plugin reloads from the expected source without a hang or crash.
- Repeat on macOS and Windows whenever both are in the version scope or the change touches platform-specific behavior.

If a matching `docs/version/vX.Y.Z/validation.md` exists, use its unchecked Desktop items as the authoritative manual checklist. Automated success must not check those items without the user's observed results.
