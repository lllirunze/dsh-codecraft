# DSH CodeCraft v0.2.1 Validation Plan

| Field | Value |
| --- | --- |
| Status | Passed |
| Target version | 0.2.1 |
| Baseline | 0.2.1-rc.0 Windows compatibility preview |
| Platform | macOS and Windows for Python Intelligence and editor regressions |
| Design | [design.md](design.md) |

## Automated Acceptance

- [x] Python block headers indent by one configured unit after Enter.
- [x] Branch clauses align safely without moving incomplete user input.
- [x] Multiline expressions and closing delimiters remain correctly aligned.
- [x] Dictionary, slice, annotation, string, comment, lambda, and URL colons do not trigger block indentation.
- [x] Both 2- and 4-space settings work without rewriting existing files.
- [x] Tab, Shift+Tab, generic delimiter expansion, save, auto-save, drafts, and conflicts do not regress.
- [x] Python-specific Enter behavior is registered only for Python adapters.
- [x] Existing Pyright import, cross-file, unsaved-document, environment, restart, and cleanup tests pass.
- [x] The v0.2.1-rc.0 Windows platform, path, environment, launch, and lifecycle tests remain green.
- [x] Existing triple-quote behavior passes; Docstring generation is excluded from the delivered scope.
- [x] `npm run check` and `npm pack --dry-run --json` pass.

## Desktop Acceptance

- [x] Verify Python block, branch, and multiline indentation in DSH Desktop on macOS and Windows.
- [x] Repeat the core scenarios with 2- and 4-space settings.
- [x] Verify ordinary quotes and triple quotes do not duplicate input or misplace the caret.
- [x] Confirm semantic completion, manual save, auto-save, native tabs, and workspace switching still work.
- [x] Confirm Python Intelligence failure does not disable ordinary editing.
- [x] Quit Desktop and confirm no Pyright process remains.
- [x] On Windows, repeat cross-file completion, `.venv` discovery, a path containing spaces, and Pyright teardown from the rc.0 acceptance plan.

## Release Gate

Do not mark this document as passed or publish v0.2.1 until the delivered P0 scope, every applicable P1 item, automated checks, required Desktop acceptance on both platforms, and the inherited rc.0 Windows compatibility scenarios have recorded evidence.

## Recorded Automated Evidence

Recorded on 2026-11-05 from macOS:

- `npm run check` passed strict type checking, 13 Vitest files with 116 tests, the production build, and package verification.
- Python tests cover block headers, nested and incomplete syntax, every required branch family, expressions containing colons, containers, closing delimiters, multiline strings, and both indentation widths.
- Existing editor, save, draft, conflict, Pyright, Windows platform-policy, environment, lifecycle, and packaging regressions remain green.
- `npm pack --dry-run --json` produced `dsh-codecraft@0.2.1` with 48 package entries.

## Recorded Desktop Evidence

Accepted on 2026-11-05 on macOS and Windows:

- Python block, branch, multiline-expression, and closing-delimiter indentation passed with both supported indentation widths.
- Quotes, semantic completion, manual and automatic saving, native tabs, and workspace switching passed regression testing.
- Python Intelligence failure isolation and clean Pyright teardown passed.
- Windows cross-file completion, virtual-environment discovery, paths containing spaces, and lifecycle behavior remained compatible with the v0.2.1-rc.0 baseline.

