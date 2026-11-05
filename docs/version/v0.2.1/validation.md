# DSH CodeCraft v0.2.1 Validation Plan

| Field | Value |
| --- | --- |
| Status | Planned; no v0.2.1 implementation evidence recorded |
| Target version | 0.2.1 |
| Baseline | 0.2.1-rc.0 Windows compatibility preview |
| Platform | macOS and Windows for Python Intelligence and editor regressions |
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
- [ ] The v0.2.1-rc.0 Windows platform, path, environment, launch, and lifecycle tests remain green.
- [ ] Triple-quote and Docstring tests pass only for P1 features included in the final scope.
- [ ] `npm run check` and `npm pack --dry-run --json` pass.

## Desktop Acceptance

- [ ] Verify Python block, branch, and multiline indentation in DSH Desktop on macOS and Windows.
- [ ] Repeat the core scenarios with 2- and 4-space settings.
- [ ] Verify ordinary quotes and triple quotes do not duplicate input or misplace the caret.
- [ ] Confirm semantic completion, manual save, auto-save, native tabs, and workspace switching still work.
- [ ] Confirm Python Intelligence failure does not disable ordinary editing.
- [ ] Quit Desktop and confirm no Pyright process remains.
- [ ] On Windows, repeat cross-file completion, `.venv` discovery, a path containing spaces, and Pyright teardown from the rc.0 acceptance plan.

## Release Gate

Do not mark this document as passed or publish v0.2.1 until the delivered P0 scope, every applicable P1 item, automated checks, required Desktop acceptance on both platforms, and the inherited rc.0 Windows compatibility scenarios have recorded evidence.

