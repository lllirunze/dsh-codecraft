# dsh-codecraft v0.5.8 Validation Plan

| Field | Value |
| --- | --- |
| Status | Automated checks and user-reported native acceptance passed; release authorized |
| Target | `0.5.8` |
| Baseline | `0.5.7` at Git `68c7c275b7fff8455bdb8ee9f087f2989f75be8f` |
| Design | [design.md](design.md) |
| Platforms | DSH Desktop on macOS and Windows |

Use `PASS`, `FAIL`, `BLOCKED`, `NOT VERIFIED`, or `NOT APPLICABLE` for each executed check. An unchecked item is planned, not a pass. Record exact commands, exit codes, test counts, candidate SHA/version, DSH version, and observed platform results when work occurs. Automation cannot establish native Desktop behavior.

## Current implementation evidence

- `PASS` — After the version-only metadata update, `npm run check` exited 0: i18n check covered eight catalogs with 300 keys each; typecheck passed; Vitest passed 34 files and 330 tests; build and artifact verification passed, including 22 Client externals.
- `PASS` — `npm pack --dry-run --ignore-scripts --json` exited 0 and reported `dsh-codecraft@0.5.8`, 153 files, 1,126,305 bytes, all eight `locale/*.json` metadata files, Host/Client entries, manifest, and bundle patch.
- `PASS` — `git diff --check` exited 0. `dsh --version` reported `0.2.2-rc.5` for the installed CLI. This is not a Desktop activation receipt.
- `PASS` — On 2026-11-19 the user reported that the complete v0.5.8 acceptance passed. This is a user-reported result for both platform matrices and the translation review; no individual screenshots, logs, or device details were supplied.
- `PASS` — On 2026-11-19, after the version-only `0.5.8` metadata update, the user explicitly confirmed that the local Desktop safety checks in the follow-up question passed: one enabled local CodeCraft source, full restart, Host/Config/`packageDir`, Client registrations, `/codecraft/api` authentication fence, no new crash, and startup/open smoke. The user supplied no individual logs or receipt text.
- `PASS` — The local `desktop` profile currently points to one `link:/Users/lllirunze/Documents/dsh-creator-mode/dsh-codecraft` package and one `codecraft` bundle row. Local `dsh --version` returned `0.2.2-rc.5`; no DSH compatibility or CLI version change is included in this release.
- `NOT APPLICABLE` — The exact Windows DSH CLI version is outside the approved v0.5.8 scope by the user's explicit direction; Windows native behavior was included in the user's complete acceptance report.

## Requirement traceability

| Requirements | Planned automated evidence | Planned native evidence |
| --- | --- | --- |
| I18N-058-01, I18N-058-09, I18N-058-11 | Locale service contract, subscription/registration teardown, unknown-language and failure tests | Live switch, reopen/restart, dialogs, menus, dirty editor and async operation |
| I18N-058-02, I18N-058-03, I18N-058-13 | Eight-resource key/placeholder/control-character checks and reviewed literal inventory | All CodeCraft-owned surfaces in each language |
| I18N-058-04, I18N-058-05, I18N-058-06, I18N-058-07, I18N-058-08 | Focused renderer, workspace, settings, installation, and intelligence tests | Editor, file actions, settings, installation, diagnostics |
| I18N-058-10 | Interpolation, plural, escaping, and displayed-number tests | Names/paths with Unicode, counts, no raw tokens |
| I18N-058-12 | DSH metadata contract and package asset inspection | Plugin Manager description/detail in supported locales |
| I18N-058-14 | UI/accessibility tests and translation review record | Narrow window, keyboard, focus, screen-reader names |
| I18N-058-15 | `npm run check`, pack inspection, current revision identity | Independent macOS and Windows matrices |
| FIX-058-01 | Metadata schema, eight descriptions, package assets | Installed-plugin introduction follows all eight DSH locales |
| FIX-058-02 | Catalog assertion for concise Material Icons hint | Help text shows only on-demand download wording; installation states remain usable |
| FIX-058-03 | Settings render and persistence tests for row removal and numeric options | No indentation-character row; bare `2` etc.; saved width and editing unchanged |
| FIX-058-04 | Catalog and settings tests for parallel Python/Java/HTML title and description structure | Titles and explanations are consistent, truthful, readable in each locale |
| FIX-058-05 | Explorer state tests for disconnected, reconnecting, connected, and no-workspace cases | Ordinary localized no-session view replaces Retry page; Explorer restores on reconnection |

## Contract and catalog checks

- [ ] Verify exact compatible DSH Desktop locale and metadata APIs against the candidate; document any unsupported mandatory contract before implementation.
- [ ] Complete a source-to-key inventory of all CodeCraft-owned visible strings and a justified exclusion list.
- [ ] Run `npm run check:i18n`: eight importable catalogs, exact keys and placeholders, no duplicate/empty/corrupt values, reviewed hard-coded-string exceptions, and build/package assets.
- [ ] Test missing key, invalid resource, unsupported host locale, service initialization failure, and readable English fallback with diagnostic key/locale.
- [ ] Test safe interpolation, Unicode paths, complex plural cases, technical identifiers, and no raw `{name}`, `undefined`, or `[object Object]` output.
- [ ] Test locale switching with the same editor instance, dirty content, cursor, selection, Undo/Redo, settings values, active dialog target, and pending async operation.
- [ ] Test registration disposal/reentry and no duplicate menu, notification, or locale listener.
- [x] User reports the complete eight-language acceptance and translation review passed on 2026-11-19; individual review artifacts were not supplied.
- [ ] Verify installed-plugin CodeCraft introduction uses localized package metadata in all eight languages, including after locale switch and Desktop restart.
- [ ] Verify Material Icons help copy contains only the on-demand download statement, while installation progress, failure, and retry controls still work.
- [ ] Verify the indentation-character row is absent, width options show numerals only, and selected/stored width still controls future edits without rewriting existing files.
- [ ] Verify Python, Java, and HTML master-switch titles and descriptions share a consistent pattern in every locale and accurately describe each feature's scope.
- [ ] Verify the Explorer Retry/refresh page is absent during a disconnected or ended session; the ordinary no-session message is shown, including exact Chinese copy `当前会话尚未连接。`, and the normal tree returns after reconnection. A connected session without a workspace remains distinguishable.

## Regression and package gate

- [ ] Run focused Vitest files for catalog, Client lifecycle, settings, workspace, editor, language assistance, and metadata changes; record exact files and counts.
- [ ] Run `npm run check` on final code and record typecheck, test count, build, and verification results.
- [ ] Run `npm pack --dry-run --ignore-scripts --json`; record package name/version, tarball entries, and all eight UI and supported metadata resources.
- [ ] Verify offline startup and locale switching require no catalog network request.
- [ ] Run `git diff --check` and confirm docs and user-facing release claims match actual evidence.

## Local DSH Desktop candidate safety gate

- [x] Candidate behavior is Git `b46fbb8ef68b218a0e9efb666d9ba43dfbbb43cc`, with release-only package metadata `0.5.8`, profile `desktop`, and the local link above; the user confirmed the post-version-update smoke passed.
- [x] User confirmed one enabled local CodeCraft source and a full Desktop restart after the version-only metadata update; no receipt text was supplied.
- [x] User confirmed Host row, Config, `packageDir`, Client registrations, authenticated route fence, startup/open smoke, and no fresh activation error/crash/duplicate registration; no individual logs were supplied.

## Native acceptance: perform separately on macOS and Windows

For **each** platform, the intended matrix covers `zh`, `en`, `ja`, `es`, `fr`, `de`, `ru`, and `pt`. The user reported the complete matrix passed, without individual case observations.

- [x] User reports complete macOS and Windows eight-language native acceptance on 2026-11-19, including the change-specific and existing-function matrices. Individual case observations were not supplied.

## Release gate

Release remains blocked until all `I18N-058-01` through `I18N-058-15` and `FIX-058-01` through `FIX-058-05` have evidence, eight complete translations are reviewed, `npm run check` and package inspection pass on the final revision, candidate activation is safe, and both native platform matrices pass. Metadata/version/tag/Release work requires a separate explicit release request.
