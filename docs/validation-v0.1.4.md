# DSH CodeCraft v0.1.4 Validation Record

| Field | Value |
| --- | --- |
| Status | Automated validation passed; Desktop regression pending |
| Recorded | 2026-11-04 |
| Target | macOS and Windows, DSH Desktop `0.2.1-rc.5` |
| Design | [design-v0.1.4.md](design-v0.1.4.md) |

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

Complete these checks before publishing `v0.1.4`:

- [ ] Confirm **Settings → CodeCraft → Indentation** shows fixed spaces and two/four-space choices.
- [ ] Confirm two spaces is the safe default and the selected width survives a Desktop restart.
- [ ] Change the width while a file is open and confirm subsequent edits use it without changing existing text.
- [ ] Confirm Enter inherits indentation, expands `{}`, `[]`, and `()`, and indents after an unmatched opener.
- [ ] Confirm a closing delimiter on a blank indented line aligns with its opener without duplication.
- [ ] Confirm Tab and Shift+Tab align irregular single-line indentation in both width modes.
- [ ] Confirm forward and backward multiline selections preserve their range, skip blank lines, and undo in one step.
- [ ] Confirm auto save, `Cmd+S` on macOS, `Ctrl+S` on Windows, drafts, conflicts, folding, search, and syntax highlighting do not regress.
- [ ] Confirm CodeCraft and `dsh-better-sidebar` can remain enabled together.
- [ ] Confirm removing CodeCraft restores native file previews.

Unexpected file rewrites, tab-character insertion, silent overwrite, draft loss, or a Desktop startup failure blocks the release.
