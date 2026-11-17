# dsh-codecraft v0.5.6 Validation

## Record

| Field | Value |
| --- | --- |
| Target | `0.5.6` |
| Design | [design.md](design.md) |
| Baseline | `0.5.5` at Git `61313a6245c4cb4dc6c137236009d854527677b1` |
| Status | Automated validation passed; local Desktop application and native acceptance pending |
| Platforms | macOS and Windows |

Only a command that ran successfully against the current relevant code may be marked `PASS`. Automated checks do not prove native DSH behavior. Desktop and platform items remain unchecked until the user reports direct observations.

## Requirement Traceability

| Requirement | Automated evidence | Native evidence |
| --- | --- | --- |
| FR-01 / AT-01 / AT-02 | Manifest and build verification; packed-file inspection | Plugin Manager icon before and after restart on each platform |
| FR-02 / AT-03 | Client registration/build verification | Start-page Files guide appearance and unchanged click behavior |
| FR-03 / AT-04 / AT-05 / AT-06 / AT-07 | File-tab title helper, shared icon resolver, build registration, and regression tests | Multi-tab, rename, move, restore, special-name, unknown-file, and offline checks |
| FR-04 / AT-08 | README reference and packaged asset verification | GitHub rendering review for both README files |

## Focused Automated Checks

- [x] `npx vitest run tests/document-tab-title.test.ts tests/file-icons.test.ts tests/address.test.ts` passed 3 files and 15 tests for representative extensions, exact filenames, unknown files, malformed addresses, multi-tab independence, and renamed/moved paths.
- [x] Client registration coverage in `npm run verify` proved the CodeCraft Files guide has a logo component and retains the `workspace.files` command.
- [x] Build verification proved `package.json.icon` is `assets/favicon.svg`, the 83,581-byte asset is self-contained and below 256 KiB, and both README files reference it.
- [x] `npm run typecheck`, as part of the final `npm run check`, passed the updated DSH structural contracts and SVG import declaration.
- [x] `npm run build`, as part of the final `npm run check`, produced current Host, Client, and declaration artifacts without adding undeclared Client externals.
- [x] `npm run verify`, as part of the final `npm run check`, passed Material Icon Theme 5.40.0 integrity for 1,256 icons, stable plugin identities, slot registrations, and package asset rules.

## Regression and Package Gate

- [x] `npm run check` passed in CI order: typecheck, 32 test files / 317 tests, build, and artifact verification.
- [x] `npm pack --dry-run --ignore-scripts --json` reported `dsh-codecraft@0.5.5`, 103 entries, and included `assets/favicon.svg`, both READMEs, manifest, patch, Host/Client bundles, and declarations. The package version is intentionally unchanged until release management.
- [x] Packed content contains one shared logo and no generated SVG assets under `lib/`.
- [x] `git diff --check` passed and `.gitignore` remains unchanged.

## Local DSH Desktop Candidate Safety Gate

- [x] Candidate recorded as dirty worktree on Git `61313a6245c4cb4dc6c137236009d854527677b1`, package `0.5.5`, DSH CLI/Desktop line `0.2.2-rc.3`, profile `desktop`, with exactly one selected source: `link:../../../Documents/dsh-creator-mode/dsh-codecraft` resolving to this repository.
- [ ] With explicit user authorization, apply exactly one local-link candidate through DSH Plugin Manager and record the mutation receipt.
- [ ] After the required full restart, verify the active `include:codecraft` Host row, Config schema and `packageDir`, Client document/settings/actions/title registrations, and expected source/version.
- [ ] Verify unauthenticated `/codecraft/api` reaches CodeCraft's authentication fence rather than a generic 404.
- [ ] Confirm no new candidate-attributable startup, activation, duplicate-registration, or crash diagnostic.

If local profile mutation is not explicitly authorized, these application and runtime items are `NOT VERIFIED`; they are not waived or inferred from the build.

## Native Acceptance — macOS

- [ ] DSH Desktop starts, opens a workspace, and shows no CodeCraft-related blank page, reload loop, error dialog, or crash.
- [ ] Plugin Manager/configuration displays the formal CodeCraft logo before and after a full restart.
- [ ] The Start-page CodeCraft Files guide displays the same logo; clicking it still opens the Files workspace.
- [ ] Python, Java, HTML, CSS, JavaScript, TypeScript, JSON, Markdown, YAML, XML, and TXT tabs match the same files in the workspace tree.
- [ ] Exact-name mappings, compound extensions, an extensionless file, and an unknown extension match tree behavior and use the existing generic fallback when appropriate.
- [ ] Multiple different file tabs retain their own icons while switching active tabs.
- [ ] Rename with and without an extension change, move, close/reopen, and workspace restoration update or preserve the correct icon.
- [ ] A path containing spaces and Chinese characters renders safely.
- [ ] Offline restart retains brand and installed Material icons without a network dependency.
- [ ] Light/dark themes, narrow/wide windows, and common display scaling do not crop, stretch, or misalign the new icons.
- [ ] Open/edit/Undo/Redo/save/close/reopen, dirty-state display, settings persistence, normal exit, and restart remain correct.

## Native Acceptance — Windows

- [ ] DSH Desktop starts, opens a workspace, and shows no CodeCraft-related blank page, reload loop, error dialog, or crash.
- [ ] Plugin Manager/configuration displays the formal CodeCraft logo before and after a full restart.
- [ ] The Start-page CodeCraft Files guide displays the same logo; clicking it still opens the Files workspace.
- [ ] Python, Java, HTML, CSS, JavaScript, TypeScript, JSON, Markdown, YAML, XML, and TXT tabs match the same files in the workspace tree.
- [ ] Exact-name mappings, compound extensions, an extensionless file, and an unknown extension match tree behavior and use the existing generic fallback when appropriate.
- [ ] Multiple different file tabs retain their own icons while switching active tabs.
- [ ] Rename with and without an extension change, move, close/reopen, and workspace restoration update or preserve the correct icon.
- [ ] A path containing spaces and Chinese characters renders safely with Windows path conventions.
- [ ] Offline restart retains brand and installed Material icons without a network dependency.
- [ ] Light/dark themes, narrow/wide windows, and common display scaling do not crop, stretch, or misalign the new icons.
- [ ] Open/edit/Undo/Redo/save/close/reopen, dirty-state display, settings persistence, normal exit, and restart remain correct.

## Documentation Review

- [x] English and Chinese README headers use the same tracked relative asset and retain badges and language links.
- [x] The normalized design preserves FR-01 through FR-04 and AT-01 through AT-08, failure cases, platform scope, and exclusions.
- [x] `docs/README.md` links both version records and reports automated completion while keeping native acceptance pending.

## Release Gate

Release is blocked by any failed automated/package check, missing asset, unstable package/runtime identity, failed Desktop activation, new attributable crash, or required macOS/Windows acceptance item that is `FAIL`, `BLOCKED`, or `NOT VERIFIED`. Implementation completion does not authorize a version bump, commit, push, tag, npm publication, or GitHub Release.

