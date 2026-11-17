# dsh-codecraft v0.5.6 Validation

## Record

| Field | Value |
| --- | --- |
| Target | `0.5.6` |
| Design | [design.md](design.md) |
| Baseline | `0.5.5` at Git `61313a6245c4cb4dc6c137236009d854527677b1` |
| Status | Automated validation and user-confirmed macOS/Windows native acceptance passed; release authorized |
| Platforms | macOS and Windows |

Only a command that ran successfully against the current relevant code may be marked `PASS`. Automated checks do not prove native DSH behavior. The user reported the complete local Desktop safety and macOS/Windows native acceptance matrix passed on 2026-11-17.

## Requirement Traceability

| Requirement | Automated evidence | Native evidence |
| --- | --- | --- |
| FR-01 / AT-01 / AT-02 | Manifest and build verification; packed-file inspection; scoped Client stylesheet | Package card, Built-in item card/detail, and package detail icon before and after restart on each platform |
| FR-02 / AT-03 | Client registration/build verification | Start-page Files guide appearance and unchanged click behavior |
| FR-03 / AT-04 / AT-05 / AT-06 / AT-07 | File-tab title helper, shared icon resolver, build registration, and regression tests | Multi-tab, rename, move, restore, special-name, unknown-file, and offline checks |
| FR-04 / AT-08 | README reference and packaged asset verification | GitHub rendering review for both README files |

## Focused Automated Checks

- [x] `npx vitest run tests/document-tab-title.test.ts tests/file-icons.test.ts tests/address.test.ts` passed 3 files and 15 tests for representative extensions, exact filenames, unknown files, malformed addresses, multi-tab independence, and renamed/moved paths.
- [x] `npx vitest run tests/branding.test.ts` passed 6 tests for the default 20px logo, the 22/26px size DSH guide capsules pass to registered icons, class merging, CSS URL escaping, and stylesheet logo substitution.
- [x] Client registration coverage in `npm run verify` proved the CodeCraft Files guide has a logo component and retains the `workspace.files` command.
- [x] Build verification proved `package.json.icon` is `assets/favicon.svg`, the 83,581-byte asset is self-contained and below 256 KiB, and both README files reference it.
- [x] `npm run typecheck`, as part of the final `npm run check`, passed the updated DSH structural contracts and SVG import declaration.
- [x] `npm run build`, as part of the final `npm run check`, produced current Host, Client, and declaration artifacts without adding undeclared Client externals.
- [x] `npm run verify`, as part of the final `npm run check`, passed Material Icon Theme 5.40.0 integrity for 1,256 icons, stable plugin identities, slot registrations, and package asset rules. The Client entry also executed against the verification DOM stub; the logo is substituted into the injected stylesheet, so no separate custom-property write is required.

## Regression and Package Gate

- [x] `npm run check` passed in CI order: typecheck, 33 test files / 323 tests, build, and artifact verification.
- [x] The packaged 83,581-byte SVG data URL contains raw attribute quotes; `cssImageUrl` percent-encodes quotes, fragments, backslashes, and newlines, and `codecraftCss` substitutes the escaped URL into the Built-in icon rule, so the CSS `url()` is valid and the frame cannot render empty from malformed URL syntax.
- [x] Final `npm pack --dry-run --ignore-scripts --json` reported `dsh-codecraft@0.5.6`, 103 entries, a 1,005,034-byte archive, and included `assets/favicon.svg`, both READMEs, manifest, patch, Host/Client bundles, and declarations.
- [x] Packed content contains one shared logo and no generated SVG assets under `lib/`.
- [x] `git diff --check` passed and `.gitignore` remains unchanged.

## Local DSH Desktop Candidate Safety Gate

- [x] Candidate behavior at Git `4806e2bf731ff4d58650f08ca7562fc4ae677454`, package `0.5.5`, DSH `0.2.2-rc.3`, profile `desktop`, and source `/Users/lllirunze/Documents/dsh-creator-mode/dsh-codecraft` was recorded before release-only metadata changes.
- [x] The `desktop` profile already used exactly one local link to this repository, so no additional profile mutation was required.
- [x] The user reported the full-restart Host row, Config schema and `packageDir`, Client document/settings/actions/title registrations, and expected source matrix passed.
- [x] The user reported the `/codecraft/api` authentication-fence check passed rather than returning a generic 404.
- [x] The user reported no candidate-attributable startup, activation, duplicate-registration, blank-page, reload-loop, or crash diagnostic.

The release-only metadata update does not change behavior or runtime contracts, so the accepted behavioral matrix remains current; package identity and automated evidence are refreshed before tagging.

## Native Acceptance — macOS

- [x] DSH Desktop starts, opens a workspace, and shows no CodeCraft-related blank page, reload loop, error dialog, or crash.
- [x] Plugin Manager/configuration displays the formal CodeCraft logo before and after a full restart, and the package artwork meets its 48px card frame without clipping the tile border.
- [x] The Built-in plugin settings item card for `dsh-codecraft` and its detail page display the same logo filling the 48px frame, while every other item keeps its own artwork.
- [x] The Start-page CodeCraft Files guide displays the same logo filling its 26px icon box; clicking it still opens the Files workspace.
- [x] Python, Java, HTML, CSS, JavaScript, TypeScript, JSON, Markdown, YAML, XML, and TXT tabs match the same files in the workspace tree.
- [x] Exact-name mappings, compound extensions, an extensionless file, and an unknown extension match tree behavior and use the existing generic fallback when appropriate.
- [x] Multiple different file tabs retain their own icons while switching active tabs.
- [x] Rename with and without an extension change, move, close/reopen, and workspace restoration update or preserve the correct icon.
- [x] A path containing spaces and Chinese characters renders safely.
- [x] Offline restart retains brand and installed Material icons without a network dependency.
- [x] Light/dark themes, narrow/wide windows, and common display scaling do not crop, stretch, or misalign the new icons.
- [x] Open/edit/Undo/Redo/save/close/reopen, dirty-state display, settings persistence, normal exit, and restart remain correct.

## Native Acceptance — Windows

- [x] DSH Desktop starts, opens a workspace, and shows no CodeCraft-related blank page, reload loop, error dialog, or crash.
- [x] Plugin Manager/configuration displays the formal CodeCraft logo before and after a full restart, and the package artwork meets its 48px card frame without clipping the tile border.
- [x] The Built-in plugin settings item card for `dsh-codecraft` and its detail page display the same logo filling the 48px frame, while every other item keeps its own artwork.
- [x] The Start-page CodeCraft Files guide displays the same logo filling its 26px icon box; clicking it still opens the Files workspace.
- [x] Python, Java, HTML, CSS, JavaScript, TypeScript, JSON, Markdown, YAML, XML, and TXT tabs match the same files in the workspace tree.
- [x] Exact-name mappings, compound extensions, an extensionless file, and an unknown extension match tree behavior and use the existing generic fallback when appropriate.
- [x] Multiple different file tabs retain their own icons while switching active tabs.
- [x] Rename with and without an extension change, move, close/reopen, and workspace restoration update or preserve the correct icon.
- [x] A path containing spaces and Chinese characters renders safely with Windows path conventions.
- [x] Offline restart retains brand and installed Material icons without a network dependency.
- [x] Light/dark themes, narrow/wide windows, and common display scaling do not crop, stretch, or misalign the new icons.
- [x] Open/edit/Undo/Redo/save/close/reopen, dirty-state display, settings persistence, normal exit, and restart remain correct.

## Documentation Review

- [x] English and Chinese README headers use the same tracked relative asset and retain badges and language links.
- [x] The normalized design preserves FR-01 through FR-04 and AT-01 through AT-08, failure cases, platform scope, and exclusions.
- [x] `docs/README.md` links both version records and reports automated completion while keeping native acceptance pending.

## Release Gate

The user explicitly authorized the v0.5.6 repository release workflow after reporting the complete native and local Desktop safety matrix passed on 2026-11-17. Release metadata, refreshed automation and package inspection, commit, `master` push, and annotated tag follow the release-management workflow. The user still creates and publishes the GitHub Release manually, which triggers npm publication.

