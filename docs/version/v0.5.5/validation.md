# DSH CodeCraft v0.5.5 Validation Plan

| Field | Value |
| --- | --- |
| Target version | 0.5.5 |
| Baseline | 0.5.4 at `db89bbc780dbe1866f7ae84eaeda9509b604d192` |
| Platforms | DSH Desktop `0.2.2-rc.3` on macOS and Windows |
| Status | Syntax and bracket implementation, automated regression, and user-confirmed native acceptance PASS; release authorized |
| Design | [design.md](design.md) |
| Color guide | [GitHub Default syntax colors](../../guide/github-syntax-colors.md) |

## Evidence rules

Use `PASS`, `FAIL`, `BLOCKED`, `NOT VERIFIED`, or `NOT APPLICABLE` for individual evidence. Automation proves fixed values, source structure, parser coverage, types, and build behavior; it cannot prove native color perception, live DSH rendering, state preservation, or platform compatibility. The user reported the complete native matrix passed on 2026-11-16.

## Current gates

| Gate | State | Evidence |
| --- | --- | --- |
| G0 Scope | PASS | Explicit request adopts GitHub syntax colors plus all bracket shapes while preserving DSH-owned typography and UI |
| G1 Requirements | PASS | `design.md` normalizes `EVR-055-06`, `EVR-055-07`, bracket-only `EVR-055-08`, the supplied palettes, architecture, and exclusions |
| G2 Architecture | PASS | One language-neutral Client palette/mapping reuses the registry, editor pipeline, Lezer tags, and DSH marker; no Host/settings path |
| G3 Implementation | PASS | Pinned syntax/bracket palettes, shared mapping, parser-aware bracket levels, scoped exceptions, registered-language guard, and guide implemented |
| G4 Automated regression | PASS | Focused regression passed 5 files / 79 tests; current `npm run check` passed typecheck, 31 files / 313 tests, build, and verification |
| G4b Local Desktop candidate | PASS | DSH Desktop `0.2.2-rc.3` profile `desktop` uses the linked local repository; the user reported the complete candidate validation passed |
| G5 Native acceptance | PASS | The user reported the complete macOS and Windows Light/Dark acceptance matrix passed on 2026-11-16 |
| G6 Release | PASS | The user explicitly authorized the v0.5.5 repository release workflow on 2026-11-16; GitHub Release publication remains manual |

## Requirement traceability

| Requirement | Automated evidence | Native evidence | State |
| --- | --- | --- | --- |
| `EVR-055-06` | PASS: exact palettes/tag roles, all 17 registered adapter parsers, scoped exception count, editor and language tests | PASS: user reported the complete representative Light/Dark syntax and diagnostic matrix passed | PASS |
| `EVR-055-07` | PASS: DSH marker, CodeCraft scope, no global body rule, existing DSH typography variables | PASS: user reported live switching and state preservation passed on both platforms | PASS |
| `EVR-055-08` | PASS: exact palettes, six-level cycling, invalid pairs, comment/literal exclusion, HTML angles, comparison exclusion, and existing bracket regressions | PASS: user reported the complete bracket, match-feedback, overlap, and platform matrix passed | PASS |

## Automated checklist

- [x] The fixed Light and Dark palettes exactly match the supplied GitHub Default syntax values.
- [x] Common Lezer roles map to one shared `HighlightStyle`; plain variables, punctuation, and operators remain neutral.
- [x] JSON, HTML/XML, Java, and Markdown rules are centralized and parser-backed.
- [x] Every registered language adapter has a representative sample and produces ranges recognized by the shared highlighter.
- [x] The future-language guard compares the test sample set with the complete language registry.
- [x] DSH Light/Dark switching uses the existing scoped marker and leaves DSH typography variables intact.
- [x] Six bracket levels, invalid color, and matching background/border exactly match the supplied GitHub values.
- [x] Round, square, curly, and parser-recognized angle brackets use the shared decoration path.
- [x] Strings, comments, character/attribute values, and regular expressions are excluded; comparison operators are not colored as angle brackets.
- [x] Existing automatic pair insertion, skipping, deletion, wrapping, backtick, and triple-quote behavior remains covered.
- [x] No language directory defines a private palette and no Host, protocol, settings, font, storage, or network path is added.
- [x] The long-lived color guide documents values, semantics, supported languages, extension rules, boundaries, and attribution.
- [x] Existing editor, language, document, save, settings, workspace, intelligence, route, and build regressions pass on the final source.
- [x] `npm run check` passes on the final source revision.
- [x] `git diff --check` reports no whitespace errors after final evidence updates.

## Native acceptance

### macOS

- [x] T055-01: Python, Java, HTML, JSON, Markdown, JavaScript/TypeScript, CSS, YAML, and another registered language show the documented semantic roles in Light mode.
- [x] T055-02: Repeat the same files in Dark mode; foreground, comments, keywords, strings, constants, functions, definitions, properties, tags, and invalid syntax remain readable.
- [x] T055-03: JSON keys are green, HTML/XML tags are green with neutral attribute names and blue values, and ordinary variables are not broadly orange.
- [x] T055-04: Switch Light/Dark with a dirty document; content, dirty state, Undo/Redo, cursor, selection, scrolling, folds, and tab identity remain unchanged.
- [x] T055-05: Diagnostics, Hover, completion, navigation, folding, editing, saving, close/reopen, and restart remain functional.
- [x] T055-05a: Round, square, curly, and HTML/XML angle brackets show six repeating levels; crossed/unmatched pairs use the invalid color and cursor matching uses the documented green background/border.

### Windows

- [x] T055-06: Repeat the representative language and role checks in Light mode.
- [x] T055-07: Repeat the representative language and role checks in Dark mode.
- [x] T055-08: Confirm JSON, HTML/XML, Java, Markdown, and ordinary-variable distinctions match the guide.
- [x] T055-09: Live Light/Dark switching preserves dirty state, Undo/Redo, cursor, selection, scrolling, folds, and tab identity.
- [x] T055-10: Diagnostics, language features, editing, saving, close/reopen, and restart remain functional.
- [x] T055-10a: Repeat the complete bracket-shape, nesting, invalid-pair, and match-feedback checks on Windows.

### Shared boundaries and safety

- [x] T055-11: DSH Desktop's native font and font-size controls still govern CodeCraft and no duplicate CodeCraft controls appear.
- [x] T055-12: DSH page, editor container background, sidebar, workspace tree, tabs, panels, buttons, and other plugins retain native styling.
- [x] T055-13: Chinese comments, Unicode punctuation, symbols, and emoji remain readable through the existing DSH/system font path.
- [x] T055-14: Paths containing spaces and Chinese characters open, edit, save, close, and reopen normally.
- [x] T055-15: Offline operation triggers no theme/font network request and does not change colors or editing behavior.
- [x] T055-16: Main text and primary syntax colors meet the intended readability target against the actual DSH Light/Dark backgrounds; any necessary adaptation is documented before release.
- [x] T055-17: Brackets inside strings/comments remain uncolored, JavaScript comparisons remain ordinary operators, and selection/search/diagnostic overlays remain readable with bracket colors.

## Local Desktop candidate gate

- [x] The `desktop` profile already uses the linked local repository; no additional profile mutation was required.
- [x] Candidate behavior at `36c47ea07c2312e4f5d0b53a7f95dcc2589440d6`, DSH `0.2.2-rc.3`, profile `desktop`, source `/Users/lllirunze/Documents/dsh-creator-mode/dsh-codecraft` was recorded before release metadata changes.
- [x] The user reported the complete restart and native candidate matrix passed.
- [x] The user reported the complete runtime registration and route matrix passed.
- [x] The user reported no activation failure, blank page, reload loop, duplicate registration, or candidate-attributable crash.

## Current automated evidence

| Check | Command | State | Evidence |
| --- | --- | --- | --- |
| Focused syntax/bracket/editor/language regression | `npx vitest run tests/syntax-theme.test.ts tests/editor.test.ts tests/languages.test.ts tests/java-lightweight.test.ts tests/python-docstrings.test.ts` | PASS | 5 files / 79 tests; palette, bracket behavior, all 17 adapters, Java, and Python covered |
| Type contracts | `npm run typecheck` | PASS | Shared palette, language-scoped overrides, theme composition, and tests compile under strict TypeScript |
| Canonical gate | `npm run check` | PASS | v0.5.5 metadata; typecheck; 31 files / 313 tests; build; 1,256 Material icons; Host exports and Client registration with 20 external requires |
| Package inspection | `npm pack --dry-run --ignore-scripts --json` | PASS | `dsh-codecraft@0.5.5`; 100 files; 871,111-byte archive; expected Host and Client entries included |
| Scope and whitespace audit | `git diff --check` plus private-color search under `src/client/languages/` | PASS | No whitespace errors and no language-owned color literals or syntax/bracket variables |

## Release gate

The user explicitly authorized the v0.5.5 repository release workflow after reporting the complete native matrix passed. Release metadata, canonical automation, package inspection, commit, `master` push, and annotated tag follow the release-management workflow. The user still creates and publishes the GitHub Release manually, which triggers npm publication.
