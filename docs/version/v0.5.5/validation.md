# DSH CodeCraft v0.5.5 Validation Plan

| Field | Value |
| --- | --- |
| Target version | 0.5.5 |
| Baseline | 0.5.4 at `db89bbc780dbe1866f7ae84eaeda9509b604d192` |
| Platforms | DSH Desktop `0.2.2-rc.3` on macOS and Windows |
| Status | Syntax and bracket implementation plus automated regression PASS; native acceptance pending |
| Design | [design.md](design.md) |
| Color guide | [GitHub Default syntax colors](../../guide/github-syntax-colors.md) |

## Evidence rules

Use `PASS`, `FAIL`, `BLOCKED`, `NOT VERIFIED`, or `NOT APPLICABLE` for individual evidence. Automation proves fixed values, source structure, parser coverage, types, and build behavior; it cannot prove native color perception, live DSH rendering, state preservation, or platform compatibility. Native items remain unchecked until reported from the applied final candidate.

## Current gates

| Gate | State | Evidence |
| --- | --- | --- |
| G0 Scope | PASS | Explicit request adopts GitHub syntax colors plus all bracket shapes while preserving DSH-owned typography and UI |
| G1 Requirements | PASS | `design.md` normalizes `EVR-055-06`, `EVR-055-07`, bracket-only `EVR-055-08`, the supplied palettes, architecture, and exclusions |
| G2 Architecture | PASS | One language-neutral Client palette/mapping reuses the registry, editor pipeline, Lezer tags, and DSH marker; no Host/settings path |
| G3 Implementation | PASS | Pinned syntax/bracket palettes, shared mapping, parser-aware bracket levels, scoped exceptions, registered-language guard, and guide implemented |
| G4 Automated regression | PASS | Focused regression passed 5 files / 79 tests; `npm run check` passed typecheck, 31 files / 311 tests, build, and verification |
| G4b Local Desktop candidate | NOT VERIFIED | Applying the candidate requires explicit profile-mutation authorization |
| G5 Native acceptance | NOT VERIFIED | Independent macOS and Windows Light/Dark acceptance is pending |
| G6 Release | NOT APPLICABLE | Publication was not requested |

## Requirement traceability

| Requirement | Automated evidence | Native evidence | State |
| --- | --- | --- | --- |
| `EVR-055-06` | PASS: exact palettes/tag roles, all 17 registered adapter parsers, scoped exception count, editor and language tests | Representative syntax/diagnostic checks in both appearances | NOT VERIFIED |
| `EVR-055-07` | PASS: DSH marker, CodeCraft scope, no global body rule, existing DSH typography variables | Live switching and state preservation on both platforms | NOT VERIFIED |
| `EVR-055-08` | PASS: exact palettes, six-level cycling, invalid pairs, comment/literal exclusion, HTML angles, comparison exclusion, and existing bracket regressions | Native bracket colors, match feedback, overlap, and platform rendering | NOT VERIFIED |

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

- [ ] T055-01: Python, Java, HTML, JSON, Markdown, JavaScript/TypeScript, CSS, YAML, and another registered language show the documented semantic roles in Light mode.
- [ ] T055-02: Repeat the same files in Dark mode; foreground, comments, keywords, strings, constants, functions, definitions, properties, tags, and invalid syntax remain readable.
- [ ] T055-03: JSON keys are green, HTML/XML tags are green with neutral attribute names and blue values, and ordinary variables are not broadly orange.
- [ ] T055-04: Switch Light/Dark with a dirty document; content, dirty state, Undo/Redo, cursor, selection, scrolling, folds, and tab identity remain unchanged.
- [ ] T055-05: Diagnostics, Hover, completion, navigation, folding, editing, saving, close/reopen, and restart remain functional.
- [ ] T055-05a: Round, square, curly, and HTML/XML angle brackets show six repeating levels; crossed/unmatched pairs use the invalid color and cursor matching uses the documented green background/border.

### Windows

- [ ] T055-06: Repeat the representative language and role checks in Light mode.
- [ ] T055-07: Repeat the representative language and role checks in Dark mode.
- [ ] T055-08: Confirm JSON, HTML/XML, Java, Markdown, and ordinary-variable distinctions match the guide.
- [ ] T055-09: Live Light/Dark switching preserves dirty state, Undo/Redo, cursor, selection, scrolling, folds, and tab identity.
- [ ] T055-10: Diagnostics, language features, editing, saving, close/reopen, and restart remain functional.
- [ ] T055-10a: Repeat the complete bracket-shape, nesting, invalid-pair, and match-feedback checks on Windows.

### Shared boundaries and safety

- [ ] T055-11: DSH Desktop's native font and font-size controls still govern CodeCraft and no duplicate CodeCraft controls appear.
- [ ] T055-12: DSH page, editor container background, sidebar, workspace tree, tabs, panels, buttons, and other plugins retain native styling.
- [ ] T055-13: Chinese comments, Unicode punctuation, symbols, and emoji remain readable through the existing DSH/system font path.
- [ ] T055-14: Paths containing spaces and Chinese characters open, edit, save, close, and reopen normally.
- [ ] T055-15: Offline operation triggers no theme/font network request and does not change colors or editing behavior.
- [ ] T055-16: Main text and primary syntax colors meet the intended readability target against the actual DSH Light/Dark backgrounds; any necessary adaptation is documented before release.
- [ ] T055-17: Brackets inside strings/comments remain uncolored, JavaScript comparisons remain ordinary operators, and selection/search/diagnostic overlays remain readable with bracket colors.

## Local Desktop candidate gate

- [ ] Obtain explicit authorization before applying the local repository through DSH Plugin Manager.
- [ ] Record candidate identity, package version, DSH version, profile, and exact source.
- [ ] Fully restart DSH Desktop after replacing Client code.
- [ ] Confirm one enabled/running CodeCraft source, expected Client registrations, and the authenticated route fence.
- [ ] Confirm no activation failure, blank page, reload loop, duplicate registration, or candidate-attributable crash.

## Current automated evidence

| Check | Command | State | Evidence |
| --- | --- | --- | --- |
| Focused syntax/bracket/editor/language regression | `npx vitest run tests/syntax-theme.test.ts tests/editor.test.ts tests/languages.test.ts tests/java-lightweight.test.ts tests/python-docstrings.test.ts` | PASS | 5 files / 79 tests; palette, bracket behavior, all 17 adapters, Java, and Python covered |
| Type contracts | `npm run typecheck` | PASS | Shared palette, language-scoped overrides, theme composition, and tests compile under strict TypeScript |
| Canonical gate | `npm run check` | PASS | Typecheck; 31 files / 311 tests; build; 1,256 Material icons; Host exports and Client registration with 20 external requires |
| Scope and whitespace audit | `git diff --check` plus private-color search under `src/client/languages/` | PASS | No whitespace errors and no language-owned color literals or syntax/bracket variables |

## Release gate

Release remains outside this request. It requires current canonical automation, authorized local candidate validation, user-confirmed macOS and Windows acceptance, and a separate explicit release instruction.
