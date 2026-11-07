# DSH CodeCraft v0.3.1 Validation Plan

| Field | Value |
| --- | --- |
| Status | Implemented and validated; release prepared |
| Target version | 0.3.1 |
| Baseline | 0.3.0 |
| Platforms | macOS and Windows |
| Design | [design.md](design.md) |

## Evidence Rules

- Check an item only after its automated or native evidence passes against the v0.3.1 implementation.
- Mocked platform behavior does not replace native Desktop acceptance.
- LSP results are semantic evidence; text matching is not an acceptable substitute.
- A working editor with unavailable navigation is valid failure isolation, not successful navigation.
- Do not update release metadata until the complete mandatory scope passes.

## DSH Integration Gate

- [x] Identify and document the public DSH API for opening or reusing a native workspace file tab.
- [x] Pass a precise line, UTF-16 character, and selection range to the destination CodeCraft renderer.
- [x] Confirm destination reveal acknowledgement before recording history.
- [x] Verify no private store access, DOM-click simulation, or second tab system is used.
- [x] Validate the same native-tab contract on macOS and Windows.

## Protocol and Host Acceptance

- [x] Route validation rejects malformed Hover, definition, and references requests.
- [x] Every query synchronizes the current unsaved document revision before reaching Pyright.
- [x] Server capabilities gate Hover, definition, and references independently.
- [x] Hover plaintext, Markdown, range, and null results normalize safely.
- [x] Definition handles `Location`, arrays, `LocationLink`, multiple targets, and null.
- [x] References use `includeDeclaration: false`, remove duplicates, and preserve semantic ranges.
- [x] `targetSelectionRange` is preferred for precise definition location.
- [x] Non-file, malformed, inaccessible, and outside-workspace targets are rejected or filtered.
- [x] Reference excerpts use bounded, workspace-authorized Host reads.
- [x] Request abortion reaches the LSP layer and emits `$/cancelRequest` when already in flight.
- [x] Cancellation and stale results do not consume recovery or restart Pyright.

## Freshness and Position Acceptance

- [x] Late Hover cannot replace a newer symbol's card.
- [x] Old revision, replaced tab generation, switched workspace, and closed view results are discarded.
- [x] Target changes between query and reveal are detected without name-based guessing.
- [x] UTF-16 conversion is exact around ASCII, Chinese characters, emoji, and surrogate pairs.
- [x] LF and CRLF documents reveal the same semantic line and character.
- [x] Invalid or out-of-range LSP positions cannot crash the renderer.

## Hover Acceptance

- [x] Functions and methods show only server-provided signature, type, and Docstring data.
- [x] Classes, fields, variables, parameters, and imports show correct information or a clear no-result state.
- [x] Source file information appears only when a valid definition target exists.
- [x] Mouse leave, edit, scroll, tab switch, workspace switch, and service loss dismiss stale cards.
- [x] Markdown formatting is allowlisted; raw HTML, scripts, event handlers, and unsafe links never execute.
- [x] Hover does not interfere with selection, typing, scrolling, or ordinary clicks.

## Definition and Reference Acceptance

- [x] macOS `Command+Click` on a use navigates to the exact declaration name.
- [x] Windows `Ctrl+Click` on a use navigates to the exact declaration name.
- [x] Ordinary clicks retain native CodeMirror behavior on both platforms.
- [x] Same-file local variables and parameters navigate correctly.
- [x] Cross-file functions, methods, classes, fields, module variables, and resolvable imports navigate correctly.
- [x] Same-name symbols in different scopes or classes never cross-contaminate results.
- [x] Multiple definitions show a chooser and never select an arbitrary target.
- [x] No-definition and inaccessible-target states leave the current editor unchanged.
- [x] Modifier-click on a verified declaration requests references rather than navigating to itself.
- [x] Reference results exclude the declaration, remove duplicates, and include synchronized unsaved uses.
- [x] Zero, one, and multiple references have clear and deterministic UI.
- [x] Results group by relative path, order by location, and show bounded context with an emphasized range.
- [x] Selecting a reference opens or reuses a native tab and reveals the exact range.
- [x] A stale or unreadable result fails independently without disabling valid entries.

## Navigation History Acceptance

- [x] A successful jump records source and target only after reveal succeeds.
- [x] Back returns to the prior use or declaration and Forward returns to the target.
- [x] A new jump after Back removes the previous forward branch.
- [x] Hover and ordinary cursor movement do not alter history.
- [x] History is isolated by workspace and released on workspace teardown.
- [x] Deleted, unauthorized, changed, and unsupported history targets fail without corrupting the stack.
- [x] Visible controls and final shortcuts do not conflict with DSH or CodeMirror bindings.

## Editing and Lifecycle Regression

- [x] Cross-file navigation does not save, overwrite, or discard an unsaved source draft.
- [x] Existing destination tabs are reused and unopened files use DSH native tabs.
- [x] Destination selection, scrolling, focus, and temporary highlight are correct.
- [x] Manual save, auto-save, drafts, external-change detection, and conflict handling remain stable.
- [x] Python completion, callable parentheses, indentation, triple quotes, and Google Style Docstrings remain stable.
- [x] Interpreter discovery, Pyright recovery, session retirement, and plugin teardown remain bounded.
- [x] Java highlighting, local completion, snippets, Structured Javadoc, folding, and comments remain unchanged.
- [x] Non-Python editors never activate Python Hover or modifier-click navigation.
- [x] All listeners, panels, tooltips, timers, requests, and pending reveals are released with their owner.

## Native DSH Desktop Acceptance

### macOS

- [x] Cold start DSH Desktop with the local v0.3.1 build and open a multi-file Python workspace.
- [x] Validate Hover, use-to-definition, definition-to-references, multiple targets, and reference selection.
- [x] Validate native-tab reuse, unsaved cross-file content, Back/Forward, Unicode positions, and workspace switching.
- [x] Simulate unavailable and restarted Pyright; confirm the editor and saving remain usable.
- [x] Regress Python editing and lightweight Java behavior.

### Windows

- [x] Repeat the complete macOS navigation matrix with `Ctrl+Click`.
- [x] Validate drive-letter paths, backslashes, spaces, non-ASCII paths, CRLF, Unicode positions, and native-tab reuse.
- [x] Validate unsaved cross-file content, Back/Forward, workspace switching, and unavailable/restarted Pyright.
- [x] Regress Python editing and lightweight Java behavior.

## Packaging and Documentation

- [x] `npm run check` passes type checking, 172 Vitest tests, production build, and artifact verification.
- [x] `npm audit --omit=dev` reports no production vulnerabilities.
- [x] `git diff --check` passes.
- [x] `npm pack --dry-run --json` contains the required client and Host navigation artifacts.
- [x] README and Changelog describe only implemented and validated behavior.
- [ ] Package, lockfile, Changelog, tag, and GitHub Release metadata all use v0.3.1.

## Release Gate

Do not release v0.3.1 while any mandatory item is incomplete; cross-file opening depends on a private DSH mechanism; Hover can render unsafe content; positions are incorrect for UTF-16 text; stale or outside-workspace results can navigate; definition and reference identity relies on text matching; navigation loses drafts or changes save behavior; macOS or Windows native acceptance is missing; or Python and Java regressions remain.
