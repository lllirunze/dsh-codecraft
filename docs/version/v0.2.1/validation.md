# DSH CodeCraft v0.2.1 Validation Plan

| Field | Value |
| --- | --- |
| Status | Planned; no v0.2.1 implementation evidence recorded |
| Target version | 0.2.1 |
| Baseline | 0.2.0 |
| Platform | macOS for Python Intelligence; macOS and Windows for base-editor regressions |
| Design | [design.md](design.md) |

## Automated Acceptance

- [ ] Python block headers indent by one configured unit after Enter.
- [ ] Branch clauses align safely without moving incomplete user input.
- [ ] Multiline expressions and closing delimiters remain correctly aligned.
- [ ] Dictionary, slice, annotation, string, comment, lambda, and URL colons do not trigger block indentation.
- [ ] Both 2- and 4-space settings work without rewriting existing files.
- [ ] Tab, Shift+Tab, generic delimiter expansion, save, auto-save, drafts, and conflicts do not regress.
- [ ] Python-specific behavior does not affect other supported languages.
- [ ] Existing Pyright import, cross-file, unsaved-document, environment, restart, and cleanup tests pass.
- [ ] Triple-quote and Docstring tests pass only for P1 features included in the final scope.
- [ ] `npm run check` and `npm pack --dry-run --json` pass.

## Desktop Acceptance

- [ ] Verify Python block, branch, and multiline indentation in DSH Desktop on macOS.
- [ ] Repeat the core scenarios with 2- and 4-space settings.
- [ ] Verify ordinary quotes and triple quotes do not duplicate input or misplace the caret.
- [ ] Confirm semantic completion, manual save, auto-save, native tabs, and workspace switching still work.
- [ ] Confirm Python Intelligence failure does not disable ordinary editing.
- [ ] Quit Desktop and confirm no Pyright process remains.
- [ ] Run the focused base-editor regression on Windows.

## Release Gate

Do not mark this document as passed or publish v0.2.1 until the delivered P0 scope, every applicable P1 item, automated checks, and required Desktop acceptance have recorded evidence.

