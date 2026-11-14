# DSH CodeCraft v0.5.2 Validation Plan

| Field | Value |
| --- | --- |
| Target version | 0.5.2 |
| Baseline | 0.5.1 (`v0.5.1` tag `9fa96ac`) |
| Target Host | DSH Desktop / DeepSeek Harness `0.2.2-rc.3` |
| Status | PASS; automated, local Desktop candidate, macOS, and Windows validation complete |
| Design | [design.md](design.md) |
| Compatibility record | [../../compatibility/dsh-0.2.2-rc.3.md](../../compatibility/dsh-0.2.2-rc.3.md) |

## Evidence Rules

Use only `PASS`, `FAIL`, `BLOCKED`, `NOT VERIFIED`, and `NOT APPLICABLE` for individual evidence. `PASS` requires an executed command or an observed native result against the current candidate. Automated checks do not prove Desktop behavior, restart persistence, plugin-manager state, OS integration, or the other platform. Any relevant production, test, build, manifest, dependency, or release-metadata change invalidates dependent evidence.

Native checklist items are checked from the user's explicit confirmation that the complete prescribed validation passed. They represent user-observed acceptance, not agent-observed GUI evidence. The accepted behavior candidate is commit `41eae16ae7ac21c49fe0e81a578233cdc3773009`; the subsequent `0.5.2` metadata-only finalization does not change runtime behavior and refreshes automated/package identity separately.

## Requirement Traceability

| Requirement | Automated/source evidence | DSH Desktop evidence | Current state |
| --- | --- | --- | --- |
| COMPAT-052-01 | Git/tag identity, manifest and patch inspection | Running Host/Desktop build, OS/architecture, profile, source, active state | PASS |
| COMPAT-052-02 | Exact upstream tag source audit and focused contract/build checks | Native behavior for every used integration surface | PASS |
| COMPAT-052-03 | Final manifest/README/changelog consistency and packed manifest | Plugin Manager compatibility preflight and installed candidate identity | PASS |
| COMPAT-052-04 | Registration, route fence, teardown, fallback, and build verification | Install/load, disable/remove fallback, startup, exit, restart, controlled failure | PASS |
| COMPAT-052-05 | Existing focused and full regression suites | Editing, saving, workspace, icons, settings, languages, menu/tab/lifecycle matrix | PASS |
| COMPAT-052-06 | `npm run check` plus package inspection | Independent macOS and Windows records | PASS |
| COMPAT-052-07 | Compatibility record structure and documentation links | Final verdicts, failures/retests, release decision | PASS |

## Source and Dependency Audit

- [x] Record CodeCraft baseline commit, target candidate commit, package version, worktree status, and exact DSH tag commit.
- [x] Record the target DSH root Node.js requirement separately from CodeCraft's independent Node.js engine.
- [x] Compare `package.json`, `cordis.patch.yml`, Host injections, Client injections, stable ids, route, exports, and externals.
- [x] Verify document preview metadata/body contracts and native tab lifecycle inputs.
- [x] Verify sidebar tab, Explorer body/title, guide, dialog, document-action, and settings slots.
- [x] Verify context-menu file/directory targets, abortable resolution, action behavior, and cleanup.
- [x] Verify Config form reads/writes, served-namespace lifecycle, and malformed-settings fallback.
- [x] Verify Session path open/reveal and authenticated Host route contracts.
- [x] Record unused upstream features as no direct impact rather than adding compatibility code.
- [x] Assign a final `Unchanged`, `Compatible`, `Adapted`, or `Blocked` verdict to every integration surface.

## Focused Automated Checks

- [x] Build registration loads exactly one Client module and one preview/Explorer/settings/menu contribution set on macOS and Windows stubs.
- [x] Host registration owns one exact authenticated route and disposes Python Intelligence with the route.
- [x] Settings validation and persistence adapters retain accepted values and safe defaults for malformed values.
- [x] Workspace operations reject traversal, unsafe names, destructive self/descendant moves, and stale dirty-document mutations.
- [x] Workspace controller synchronizes open tabs, save targets, navigation, refresh, and external filesystem changes.
- [x] Save/conflict tests preserve dirty content and reject stale disk writes.
- [x] Python service startup, completion, navigation, cancellation, bounded recovery, and repeated teardown pass.
- [x] HTML and Java existing assistance remains isolated and ordinary editing survives disabled/error states.
- [x] Material icon default, installed, tampered, offline, mapping, and fallback behavior passes.
- [x] Native menu and overlay call sites use DSH/CodeMirror ownership and contain no private DOM positioning adapter.

## Automated and Package Gate

- [x] Run the justified focused Vitest files and record exact file/test counts.
- [x] Run `npm run check` after the last relevant source or test change.
- [x] Run `npm pack --dry-run --ignore-scripts --json` after the last build and confirm package identity and required files.
- [x] Confirm the packed artifact contains `package.json`, `cordis.patch.yml`, Host/Client entry points and declarations, protocol declarations, README files, changelog, notice, and license.
- [x] Confirm the package contains no undeclared Client external, Material SVG asset, stale build, or changed stable identity.
- [x] After final release metadata, rerun the canonical gate and package inspection because identity evidence becomes stale.

## Automated Evidence

| Check | Command | Status | Evidence |
| --- | --- | --- | --- |
| Upstream exact-tag delta | `git diff dsh-v0.2.2-rc.2..dsh-v0.2.2-rc.3` in the official DSH checkout | PASS | Target commit `38a6a5c965aa99ab525161efb7cc5cf1fe62fced`; consumed package source unchanged; Windows updater and unrelated import/left-sidebar surfaces changed |
| Focused compatibility regression | `npx vitest run tests/routes.test.ts tests/settings.test.ts tests/document.test.ts tests/save-queue.test.ts tests/workspace-operations.test.ts tests/workspace-sync.test.ts tests/material-icon-client.test.ts tests/material-icons.test.ts tests/python-intelligence.test.ts tests/html-editing.test.ts tests/java-lightweight.test.ts` | PASS | 11 files, 107 tests |
| Focused build/integration verification | `npm run build && npm run verify` | PASS | Build completed; 1,256 Material icons verified; Host exports and Client registration verified with 18 externals |
| Canonical gate | `npm run check` | PASS | Typecheck; 28 files / 284 tests; build; icon and Host/Client integration verification |
| Package inspection | `npm pack --dry-run --ignore-scripts --json` | PASS | Final `dsh-codecraft@0.5.2`; 95 files; 871,776 bytes packed; 3,358,910 bytes unpacked; all required files present; zero SVGs |

All automated evidence was refreshed after selecting rc.3 and again after finalizing the v0.5.2 release metadata. The metadata-only version finalization does not change the runtime contract, so the user's earlier native behavioral acceptance remains applicable.

## Local DSH Desktop Candidate Gate

The user confirmed that the complete local candidate gate passed on the prescribed Desktop profile and DSH Desktop `0.2.2-rc.3` candidate. The accepted source was the local repository candidate at `41eae16ae7ac21c49fe0e81a578233cdc3773009`; all native results below are user-confirmed.

- [x] Record candidate Git SHA and package version, DSH Host/Desktop version and build, platform/architecture, profile, installation source, and expected absolute path.
- [x] Back up or use an isolated test profile/workspace without hand-editing profile files.
- [x] Confirm exactly one CodeCraft source is selected and no npm/local-link conflict exists.
- [x] Apply the candidate through DSH Plugin Manager and retain the receipt.
- [x] Fully restart Desktop after replacing Host or Client code.
- [x] Confirm Plugin Manager reports installed, enabled, running, expected source, and expected version.
- [x] Confirm Host row `include:codecraft`, Config schema, and `packageDir` resolve from the expected source.
- [x] Confirm Client preview, settings, Explorer body/title, dialog, native menu, and HTML action registrations occur once.
- [x] Confirm unauthenticated `/codecraft/api` reaches the structured authentication fence rather than a generic 404.
- [x] Confirm no activation failure, blank page, reload loop, unhandled rejection, or candidate-attributable crash.
- [x] Disable or remove CodeCraft through Plugin Manager and confirm native DSH previews and core pages remain usable; then restore only with authorization.

## Native Acceptance Matrix

Run independently on macOS and Windows against the same final candidate and DSH Desktop `0.2.2-rc.3`. For every case record case id, OS/architecture, actual Host/Desktop build, candidate version/SHA, steps, expected result, observed result, evidence link, date, and status.

### Startup and lifecycle

- [x] macOS: install/load state, startup, normal exit, restart, settings page, and native fallback after disable/remove.
- [x] Windows: install/load state, startup, normal exit, restart, settings page, and native fallback after disable/remove.
- [x] Windows: use the supported in-app updater from an eligible earlier official build to rc.3; confirm installation replacement completes, Desktop automatically reopens, and the expected CodeCraft source and enabled/running state remain intact.
- [x] Both: repeated tab open/switch/close/reopen and workspace switch leave no stale body, process, listener, dialog, or duplicate registration.
- [x] Both: a controlled optional-service failure remains contained and ordinary Desktop navigation, editing, and saving remain usable.

### Editing and data safety

- [x] Both: open representative source/text extensions from Workspace Files in native tabs.
- [x] Both: type, delete, Undo/Redo, search, comments, indentation, brackets/quotes, syntax highlighting, and immediate save.
- [x] Both: read-only, external modification, save failure, conflict, close/reopen, and newer-disk-content protection.
- [x] Both: paths containing spaces, Chinese characters, mixed case, and Unicode remain safe.

### Workspace, icons, settings, and UI placement

- [x] Both: create, rename, copy, cut/paste, move, drag/drop, multi-select, delete, refresh, and dirty-tab/path synchronization.
- [x] macOS: Finder reveal and Trash behavior.
- [x] Windows: Explorer reveal, Recycle Bin behavior, and backslash paths.
- [x] Both: default and installed icons, folders expanded/collapsed, light/dark themes, offline restart, and unmatched fallbacks.
- [x] Both: settings render, toggle, persist after restart, and tolerate disabled optional features.
- [x] Both: file tree search/scroll, long context menus, page zoom, completion, Hover, dialogs, native tab controls, and Plugins page remain aligned and clickable.

### Language regression

- [x] Both: Python Intelligence starts or reports a contained unavailable state; status, completion, Hover, navigation, unsaved synchronization, close, and restart behave correctly.
- [x] Both: existing HTML completion, diagnostics, navigation, formatting, refactoring, and native browser preview remain within their documented scope.
- [x] Both: existing Java lightweight completion, snippets, Structured Javadoc, and live feature switch remain within their documented scope.
- [x] Both: disabling Python/HTML/Java optional assistance never disables ordinary editing or saving.

## Compatibility Record and Release Gate

- [x] Complete `docs/compatibility/dsh-0.2.2-rc.3.md` with final non-`Blocked` verdicts and exact changes or the evidence-backed statement `No runtime code changes required`.
- [x] Record that no failed native case or corrective runtime change was reported.
- [x] After both platform matrices pass, update package/lockfile version, DSH engine range, validated-release map, README files, changelog, and package identity through the release workflow.
- [x] Confirm no unresolved serious regression, data loss, startup failure, save failure, path desynchronization, or compatibility blocker remains.
- [x] Obtain a separate explicit release request before commit, push, tag, GitHub Release handoff, or npm publication.

