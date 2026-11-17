# dsh-codecraft v0.5.7 Validation

## Record

| Field | Value |
| --- | --- |
| Target | `0.5.7` |
| Design | [design.md](design.md) |
| Baseline | `0.5.6` at Git `2c9e6fc89a5c048786f0dc5549f3c913054ee51b` |
| Status | Automated validation passed; native acceptance pending |
| Platforms | macOS and Windows |

Only checks actually run against the current relevant code may be marked `PASS`. Automated checks do not prove native DSH behavior. Every new item starts unchecked.

## Requirement Traceability

| Requirement | Automated evidence | Native evidence |
| --- | --- | --- |
| I18N-01 / I18N-07 | Existing namespace registration, lifecycle, bundle, and dependency checks | Startup, locale switching, offline restart, and no duplicate registration |
| I18N-02 | Catalog module structure and exact composed key-set checks | Chinese and English surfaces retain complete copy |
| I18N-03 | Typecheck and typed mapping coverage | No visible fallback key on representative surfaces |
| I18N-04 | Key and placeholder parity tests | Representative interpolation values render correctly in each locale |
| I18N-05 | API fallback and plain-language-label tests | Transport failure and plain-text status follow active locale |
| I18N-06 | Focused tests plus full repository regression | Existing edit/save/workspace/settings/language behavior remains unchanged |

## Focused Automated Checks

- [x] `tests/locales.test.ts` proved the English and Chinese composed catalogs contain exactly the same keys.
- [x] `tests/locales.test.ts` proved every matching message contains the same unique `{placeholder}` set.
- [x] Catalog-domain coverage proved each language composes four non-overlapping modules and the old monolithic source was removed.
- [x] `npm run typecheck` accepted every mapped key and the focused compile-time assertion rejects a non-catalog key at the CodeCraft translation boundary.
- [x] `tests/locales.test.ts` proved known network and malformed-response failures resolve through locale keys while unknown Host details retain a safe fallback.
- [x] `tests/languages.test.ts` proved plain-text adapters expose `language.plain`; the renderer translates that key during render instead of storing localized text.
- [x] Source/build verification retained the `sidebarCodeCraft` registration and existing lifecycle-owned disposer.
- [x] `npx vitest run tests/locales.test.ts tests/languages.test.ts tests/settings-layout.test.ts tests/settings.test.ts tests/workspace-navigation.test.ts` passed 5 files and 40 tests.

## Regression and Package Gate

- [x] `npm run typecheck`, as part of the final `npm run check`, passed.
- [x] `npm test`, as part of the final `npm run check`, passed 34 files and 327 tests.
- [x] `npm run build`, as part of the final `npm run check`, produced current Host, Client, and declaration artifacts.
- [x] `npm run verify`, as part of the final `npm run check`, verified Material Icon Theme 5.40.0 with 1,256 icons and Client registration with 22 external requires.
- [x] `npm run check` passed in canonical CI order against the final runtime and test code.
- [x] `npm pack --dry-run --ignore-scripts --json` reported unchanged `dsh-codecraft@0.5.6`, 114 entries, and included the manifest, patch, Host/Client entries and declarations, protocol declaration, READMEs, changelog, license, and required assets.
- [x] `git diff --check` passed.
- [x] `package.json`, `package-lock.json`, `CHANGELOG.md`, and `.gitignore` remain unchanged.

## Local DSH Desktop Candidate Safety Gate

- [ ] Record candidate Git SHA and dirty-worktree state, package version, DSH version, platform/profile, and expected source.
- [ ] Confirm Plugin Manager reports one enabled CodeCraft source at the expected local path/version.
- [ ] After the required full restart, confirm Host row, Config schema/`packageDir`, Client registrations, and route authentication fence.
- [ ] Confirm no candidate-attributable startup error, duplicate registration, blank page, reload loop, or crash.

Profile mutation is not authorized by this request. If the existing local link is not already the expected source, report application as `BLOCKED` rather than modifying the Desktop profile.

## Native Acceptance — macOS

- [ ] DSH Desktop starts and restarts normally with no CodeCraft activation error or crash.
- [ ] Switching DSH between Simplified Chinese and English updates Explorer, settings, editor notices/status, HTML tools, and dialog copy consistently.
- [ ] A `.txt` or unknown text file shows the localized plain-text label in each language without stale copy after switching.
- [ ] Representative interpolation values (cursor, indentation, selected count, icon count, and HTML rename count) render correctly in both languages.
- [ ] A simulated/offline transport failure shows the active-language fallback and does not expose an untranslated key.
- [ ] Unknown Host or external diagnostics remain contained and do not break the surrounding localized UI.
- [ ] Open/edit/Undo/Redo/save/close/reopen and dirty/conflict handling remain unchanged.
- [ ] Explorer create/rename/copy/move/delete, settings persistence, Python/Java/HTML feature gates, and normal exit remain unchanged.
- [ ] Paths containing spaces and Chinese characters render safely in both locales.
- [ ] Offline restart loads all catalogs and existing features without network localization requests.

## Native Acceptance — Windows

- [ ] DSH Desktop starts and restarts normally with no CodeCraft activation error or crash.
- [ ] Switching DSH between Simplified Chinese and English updates Explorer, settings, editor notices/status, HTML tools, and dialog copy consistently.
- [ ] A `.txt` or unknown text file shows the localized plain-text label in each language without stale copy after switching.
- [ ] Representative interpolation values (cursor, indentation, selected count, icon count, and HTML rename count) render correctly in both languages.
- [ ] A simulated/offline transport failure shows the active-language fallback and does not expose an untranslated key.
- [ ] Unknown Host or external diagnostics remain contained and do not break the surrounding localized UI.
- [ ] Open/edit/Undo/Redo/save/close/reopen and dirty/conflict handling remain unchanged.
- [ ] Explorer create/rename/copy/move/delete, settings persistence, Python/Java/HTML feature gates, and normal exit remain unchanged.
- [ ] Paths containing spaces and Chinese characters render safely with Windows path conventions.
- [ ] Offline restart loads all catalogs and existing features without network localization requests.

## Documentation Review

- [x] `design.md` covers every approved requirement, negative case, architecture boundary, and exclusion.
- [x] `validation.md` maps every requirement to automated and native evidence without claiming unrun checks.
- [x] `docs/README.md` links both v0.5.7 records and describes the release as an i18n architecture refactor without feature additions.

## Release Gate

Release is out of scope. After implementation and regression pass, native DSH Desktop acceptance remains required. Version metadata, changelog, commit, push, tag, npm publication, and GitHub Release publication require a later explicit release request and the `release-management` workflow.

