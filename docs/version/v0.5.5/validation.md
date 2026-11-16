# DSH CodeCraft v0.5.5 Validation Plan

| Field | Value |
| --- | --- |
| Target version | 0.5.5 |
| Baseline | 0.5.4 at `db89bbc780dbe1866f7ae84eaeda9509b604d192` |
| Platforms | DSH Desktop `0.2.2-rc.3` on macOS and Windows |
| Status | Implementation and automated regression PASS; native acceptance pending |
| Design | [design.md](design.md) |

## Evidence Rules

Use `PASS`, `FAIL`, `BLOCKED`, `NOT VERIFIED`, or `NOT APPLICABLE` for individual evidence. Automation cannot prove native rendering, live DSH appearance switching, state preservation, or platform compatibility. Every new checklist item remains unchecked until the corresponding current-candidate evidence is obtained.

## Current Gates

| Gate | State | Evidence |
| --- | --- | --- |
| G0 Scope | PASS | User revision retains only syntax colors and removes CodeCraft font/size behavior plus all other prior v0.5.5 scope |
| G1 Requirements | PASS | `design.md` normalizes only `EVR-055-06` and `EVR-055-07`; removed planning requirements are explicitly excluded |
| G2 Architecture | PASS | The change stays in the existing shared Client theme and CodeMirror highlight mapping; no Host or settings path is required |
| G3 Implementation | PASS | Shared light/dark semantic palette implemented in `src/client/theme.ts`; superseded feature code removed |
| G4 Automated regression | PASS | Focused regression passed 3 files / 43 tests; `npm run check` passed typecheck, 31 files / 303 tests, build, and verification |
| G4b Local Desktop candidate | NOT VERIFIED | Profile mutation and candidate application require explicit authorization |
| G5 Native acceptance | NOT VERIFIED | Independent macOS and Windows checks are pending |
| G6 Release | NOT APPLICABLE | Publication was not requested |

## Requirement Traceability

| Requirement | Automated evidence | Native evidence | Current state |
| --- | --- | --- | --- |
| `EVR-055-06` | PASS: shared palette values, semantic mapping, language activation/isolation, and editor regression | Representative supported-language syntax remains readable and consistent | NOT VERIFIED |
| `EVR-055-07` | PASS: DSH dark-marker scope, absence of global body rules, typecheck, build, and editor regression | Live Light/Dark switching preserves editor state on macOS and Windows | NOT VERIFIED |

## Automated Checklist

- [x] The light and dark palettes contain all eight required semantic roles.
- [x] Variables, punctuation, operators, and unclassified editor text use neutral foreground colors.
- [x] Properties and attributes use the shared property role.
- [x] One shared `HighlightStyle` remains the syntax-color owner; language modules add no private color palette.
- [x] Dark overrides use `body[data-ds-dark-theme] .dsh-codecraft`; no global `body` styling is introduced.
- [x] Existing DSH font-family and font-size variables remain in place.
- [x] No font settings, downloadable-font code, font protocol action, font storage, Editor Appearance UI, or font license notice remains.
- [x] No new indentation-guide, search, fold, gutter, selection, bracket, caret, or container styling remains from the removed scope.
- [x] Existing language activation and isolation tests pass.
- [x] Existing editor, document, save, settings, workspace, intelligence, and route regressions pass.
- [x] `npm run check` passes on the final source revision.
- [x] `git diff --check` reports no whitespace errors.

## Native Acceptance

### macOS

- [ ] T055-01: Representative supported languages remain readable and consistent in Light mode.
- [ ] T055-02: The same files remain readable and consistent in Dark mode.
- [ ] T055-03: Live Light/Dark switching preserves content, dirty state, Undo/Redo, selection, cursor, scrolling, folds, and tab identity.
- [ ] T055-04: DSH Desktop's native font and font-size controls govern CodeCraft; no duplicate CodeCraft control appears.
- [ ] T055-05: Type, edit, save, close, reopen, and restart normally without an activation failure or crash.

### Windows

- [ ] T055-06: Representative supported languages remain readable and consistent in Light mode.
- [ ] T055-07: The same files remain readable and consistent in Dark mode.
- [ ] T055-08: Live Light/Dark switching preserves content, dirty state, Undo/Redo, selection, cursor, scrolling, folds, and tab identity.
- [ ] T055-09: DSH Desktop's native font and font-size controls govern CodeCraft; no duplicate CodeCraft control appears.
- [ ] T055-10: Type, edit, save, close, reopen, and restart normally without an activation failure or crash.

### Shared safety checks

- [ ] T055-11: Diagnostics remain visually distinct from syntax highlighting in both appearances.
- [ ] T055-12: Chinese comments, Unicode punctuation, symbols, and emoji remain readable through the existing DSH/system font path.
- [ ] T055-13: CodeCraft does not change DSH page, sidebar, workspace tree, settings framework, or other plugin styling.
- [ ] T055-14: Paths containing spaces and Chinese characters still open, edit, and save normally.
- [ ] T055-15: Offline operation has no effect on syntax colors and triggers no font or theme network request.

## Local Desktop Candidate Gate

- [ ] Obtain explicit authorization before applying the local candidate through DSH Plugin Manager.
- [ ] Record candidate identity, package version, DSH version, profile, and exact install source.
- [ ] Fully restart DSH Desktop after replacing Client code.
- [ ] Confirm Plugin Manager reports one enabled/running CodeCraft instance from the expected source.
- [ ] Confirm Client registrations occur exactly once and the authenticated route fence remains intact.
- [ ] Confirm no activation failure, blank page, reload loop, duplicate registration, or candidate-attributable crash.

## Current Automated Evidence

| Check | Command | State | Evidence |
| --- | --- | --- | --- |
| Focused regression | `npx vitest run tests/syntax-theme.test.ts tests/editor.test.ts tests/languages.test.ts` | PASS | 3 files / 43 tests |
| Canonical gate | `npm run check` | PASS | Typecheck; 31 files / 303 tests; build; 1,256 Material icons; Host exports and Client registration with 20 external requires |
| Whitespace and removed-scope audit | `git diff --check` plus repository search for removed font/appearance identifiers | PASS | No whitespace errors; no removed runtime, settings, protocol, UI, or editor-decoration identifiers remain |

## Release Gate

Release work remains outside this request. It requires current automated evidence, authorized local candidate validation, user-confirmed native macOS and Windows acceptance, and a separate explicit release instruction.
