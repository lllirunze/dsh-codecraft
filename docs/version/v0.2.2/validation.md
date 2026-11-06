# DSH CodeCraft v0.2.2 Validation Plan

| Field | Value |
| --- | --- |
| Status | Automated validation passed; macOS and Windows Desktop acceptance pending |
| Target version | 0.2.2 |
| Baseline | 0.2.1 |
| Platforms | macOS and Windows |
| Design | [design.md](design.md) |

## Evidence Rules

- Leave an item unchecked until the matching command or native Desktop scenario has passed on the v0.2.2 build.
- Record a reproduced failure and regression test for every P1 change.
- Do not treat mocked platform tests as native Windows or macOS acceptance.
- Record failures honestly; a working editor with unavailable intelligence is valid degradation evidence, not a successful intelligence test.

## Automated Acceptance

### Lifecycle and recovery

- [x] One workspace reuses one initialized session across multiple Python documents.
- [x] Closing one of several documents keeps the shared session alive.
- [x] Closing the final document removes and disposes only that workspace session.
- [x] A status-only probe cannot leave an unbounded idle process.
- [x] Plugin disposal closes documents, sends bounded shutdown/exit, and terminates when graceful shutdown stalls.
- [x] One transport failure performs at most one automatic recovery attempt and replays current documents once.
- [x] Repeated initialization, transport, or replay failure settles as unavailable without a restart loop.
- [x] Cancellation and stale-request failures do not trigger recovery.

### Completion concurrency

- [x] A document change aborts the older browser completion context.
- [x] Host request abandonment reaches the LSP request where the request lifecycle supports cancellation.
- [x] An in-flight cancelled LSP request sends `$/cancelRequest` and releases its pending entry.
- [x] A late result from an older revision is discarded.
- [x] A late result from a replaced tab generation is discarded.
- [x] Results from one workspace cannot appear in another workspace.
- [x] Completion edits reject invalid or overlapping ranges and preserve valid snippets/additional edits.

### Document and platform behavior

- [x] `didOpen`, full-text `didChange`, replacement, replay, and `didClose` maintain URI, generation, and revision ownership.
- [x] Save and auto-save do not regress synchronization or bypass conflict-safe writes.
- [x] Bundled Pyright produces real member and cross-file completion from unsaved content.
- [x] Explicit interpreters, `.venv`/`venv`, PATH fallback, and custom server validation retain existing behavior.
- [x] Paths with spaces and Unicode pass; Windows path tests include drive-letter and backslash behavior.
- [x] Public errors use stable reasons and do not expose source, environment values, or unnecessary private paths.

### Editor regressions

- [x] Python block, branch, multiline-expression, and closing-delimiter indentation pass at two and four spaces.
- [x] Dictionary, slice, annotation, string, comment, lambda, and URL colons remain safe.
- [x] Ordinary and triple quotes, Tab/Shift+Tab, Undo, local completion, folding, and syntax highlighting pass.
- [x] Manual save, auto-save, drafts, external-change detection, and conflict handling pass.
- [x] Non-Python documents do not start Python Intelligence or receive Python-specific behavior.

### Google Style Docstring generation

- [x] Typing `"""` alone does not generate a template; generation occurs only when Enter is pressed inside the new quote pair.
- [x] Enter generates a template only in the direct first-statement position of a function, async function, method, or class body.
- [x] Blank and comment-only lines before the quote retain eligibility, while any real preceding statement disables generation.
- [x] Module scope, assignments, arguments, containers, annotations, nested blocks, lambdas, comprehensions, later statements, ambiguous syntax, and existing Docstrings preserve ordinary triple-quote behavior.
- [x] Raw, byte, and f-prefixed triple-quoted strings do not trigger generation.
- [x] Triple single quotes remain normal string input and do not trigger generation.
- [x] Parameters appear in signature order, including positional-only, keyword-only, variadic, defaulted, and annotated forms.
- [x] Reliably identified `self` and `cls` parameters are omitted.
- [x] `Returns` appears only for a reliably parsed non-`None` annotation.
- [x] `Yields` appears only for a reliably identified generator.
- [x] Classes receive a summary without invented attributes, exceptions, or behavior.
- [x] Generated content uses the selected two- or four-space indentation and does not disturb surrounding code.
- [x] Summary and entry placeholders follow a stable navigation order.
- [x] One Undo removes the complete generated template and restores the original input.
- [x] Existing `'''` and `"""` pairing, Enter behavior, raw strings, and f-strings do not regress.

## Native DSH Desktop Acceptance

Run the stable local build with a cold DSH Desktop start on both supported platforms.

### macOS

- [ ] Open multiple Python tabs in one workspace and confirm semantic completion remains responsive.
- [ ] Rapidly type, delete, switch tabs, and switch workspaces without stale completion appearing.
- [ ] Exercise two- and four-space Python indentation and triple quotes.
- [ ] Generate function, method, async-function, generator, and class Google Style Docstrings; verify placeholders and one-step Undo.
- [ ] Confirm manual save, auto-save, drafts, and conflict handling.
- [ ] Simulate unavailable Pyright and confirm normal editing and saving continue.
- [ ] Close tabs, unload the plugin, and quit DSH; confirm no Pyright process remains.

### Windows

- [ ] Repeat the multi-tab, rapid-edit, tab-switch, and workspace-switch scenarios.
- [ ] Verify bundled Pyright, `.venv\\Scripts\\python.exe`, and cross-file completion.
- [ ] Open a workspace whose path contains spaces and non-ASCII characters.
- [ ] Exercise two- and four-space Python indentation and triple quotes.
- [ ] Generate function, method, async-function, generator, and class Google Style Docstrings; verify placeholders and one-step Undo.
- [ ] Confirm manual save, auto-save, drafts, and conflict handling.
- [ ] Simulate unavailable Pyright and confirm normal editing and saving continue.
- [ ] Close tabs, unload the plugin, and quit DSH; confirm no Pyright process remains.

## Packaging and Documentation

- [x] `npm run check` passes type checking, all Vitest tests, production build, and artifact verification.
- [x] `npm pack --dry-run --json --ignore-scripts` contains the expected v0.2.2 package and no source-only design import.
- [ ] `package.json`, `package-lock.json`, `CHANGELOG.md`, tag, and Release metadata use the same final version.
- [x] README claims, module conventions, design scope, and validation evidence agree.
- [x] `git diff --check` passes.

## P1 Fix Evidence

For each evidence-gated change, record:

| Item | Reproduction | Regression test | Platforms | Result |
| --- | --- | --- | --- | --- |
| None selected | — | — | — | — |

## Release Gate

Do not publish v0.2.2 while any applicable P0, native-platform, packaging, or documentation item remains unchecked. P1 candidates that are not reproduced must remain out of the implementation, changelog, and Release notes.

## Recorded Automated Evidence

Recorded on 2026-11-07 from macOS:

- `npm run check` passed strict type checking, 14 Vitest files with 152 tests, the production build, and artifact verification.
- The suite covers guarded Docstring generation, placeholder navigation, one-step Undo, document revisions, tab generations, workspace isolation, request cancellation, bounded recovery, idle-session retirement, stable public errors, Python indentation, saving, drafts, conflicts, environment discovery, and real Pyright completion.
- `npm pack --dry-run --json --ignore-scripts` produced `dsh-codecraft@0.2.2` with 49 package entries, including the Docstring declaration output.
- Native macOS and Windows DSH Desktop acceptance remains pending and is intentionally unchecked.
