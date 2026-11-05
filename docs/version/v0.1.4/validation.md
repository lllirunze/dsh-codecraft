# DSH CodeCraft v0.1.4 Validation Record

| Field | Value |
| --- | --- |
| Status | Automated validation and macOS Desktop acceptance passed |
| Recorded | 2026-11-04 |
| Target | macOS and Windows, DSH Desktop `0.2.1-rc.5` |
| Design | [design.md](design.md) |

## Automated Result

The complete repository check passes:

```bash
npm run check
```

Validation covers strict TypeScript compilation, 74 Vitest tests across eight files, Host and client builds, declaration generation, and package-output verification.

The v0.1.4 tests verify:

- default, valid, and malformed two- or four-space settings;
- accepted nested DSH mutations for indentation width;
- next and previous boundaries for aligned and irregular indentation;
- single-line indentation and insertion inside code content;
- multiline per-line alignment, blank-line preservation, column-zero endpoints, selection mapping, and one-step undo;
- inherited indentation, unmatched opener indentation, and empty `{}`, `[]`, and `()` expansion;
- closing delimiter alignment with an existing opener;
- live two-to-four-space reconfiguration without modifying historical file text.

Existing coverage continues to protect bracket pairing, auto save, manual save state, drafts, external-change conflicts, safe filesystem writes, authenticated routes, language selection, and native DSH registration.

## Manual Desktop Regression

The macOS acceptance pass completed the following checks:

- [x] Confirm **Settings → CodeCraft → Indentation** shows fixed spaces and two/four-space choices.
- [x] Confirm two spaces is the safe default and the selected width survives a Desktop restart.
- [x] Change the width while a file is open and confirm subsequent edits use it without changing existing text.
- [x] Confirm Enter inherits indentation, expands `{}`, `[]`, and `()`, and indents after an unmatched opener.
- [x] Confirm a closing delimiter on a blank indented line aligns with its opener without duplication.
- [x] Confirm Tab and Shift+Tab align irregular single-line indentation in both width modes.
- [x] Confirm forward and backward multiline selections preserve their range, skip blank lines, and undo in one step.
- [x] Confirm auto save, `Cmd+S`, drafts, conflicts, folding, search, and syntax highlighting do not regress on macOS.
- [x] Confirm CodeCraft and `dsh-better-sidebar` can remain enabled together.
- [x] Confirm removing CodeCraft restores native file previews.
- [ ] Repeat the focused native regression on Windows, including `Ctrl+S`.

Unexpected file rewrites, tab-character insertion, silent overwrite, draft loss, or a Desktop startup failure blocks the release.
