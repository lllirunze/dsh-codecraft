# DSH CodeCraft v0.5.3 Validation Plan

| Field | Value |
| --- | --- |
| Target version | 0.5.3 |
| Baseline | 0.5.2 (`v0.5.2`, `c9c95db`) |
| Platforms | DSH Desktop on macOS and Windows |
| Status | INCOMPLETE; automated regression passed, local Desktop candidate and native acceptance not verified |
| Design | [design.md](design.md) |

## Evidence Rules

Use only `PASS`, `FAIL`, `BLOCKED`, `NOT VERIFIED`, and `NOT APPLICABLE` for individual evidence. A multi-check gate may be `INCOMPLETE` when one or more required items are blocked or not verified. `PASS` requires an executed command or a user-observed native result against the current candidate. Automation does not prove Desktop behavior, restart persistence, platform compatibility, or visual interaction.

Checklist items are checked only for evidence actually produced. Production or test changes invalidate affected automated evidence. Package, dependency, entry-point, build, patch, or metadata changes invalidate package and Desktop-candidate identity. Replacing loaded Host or Client code requires a full DSH Desktop restart.

## Current Gate Record

| Gate | State | Evidence |
| --- | --- | --- |
| G0 Scope | PASS | Planning source fixes v0.5.3, macOS/Windows, FILE-053-01 through FILE-053-06, and explicit exclusions |
| G1 Requirements | PASS | English `design.md` and this planned evidence record preserve all requirement and acceptance identifiers |
| G2 Architecture | PASS | User selected direct replacement; implementation uses the public action slot plus one exact rc.3 `data-textpreview-path` compatibility marker without DOM traversal or unpublished imports |
| G3 Implementation | PASS | Explorer recovery, three-node projection, lazy menu navigation, native opening, invalidation, localization, and focused tests are present |
| G4 Automated regression | PASS | Focused regression, `npm run check` (29 files / 292 tests), build verification, and current 0.5.2 package inspection passed |
| G4b Local Desktop candidate | NOT VERIFIED | Profile mutation has not been authorized; candidate application, restart, runtime registration, and path replacement are unobserved |
| G5 Native acceptance | NOT VERIFIED | Requires a complete candidate and user-observed macOS and Windows results |
| G6 Release | NOT APPLICABLE | Release was not requested and earlier gates are incomplete |

## Requirement Traceability

| Requirement | Planned source evidence | Planned Desktop evidence | Current state |
| --- | --- | --- | --- |
| FILE-053-01 | Error classification and disconnected-view tests | T-053-01, T-053-03, T-053-06 | PASS automated; NOT VERIFIED native |
| FILE-053-02 | Abort/generation implementation plus workspace, route, document, and save regression | T-053-02, T-053-04, T-053-05, T-053-07, T-053-08 | PASS automated; NOT VERIFIED native |
| FILE-053-03 | Projection tests and bundled unique replacement registration | T-053-09 through T-053-13 | PASS automated; NOT VERIFIED native layout |
| FILE-053-04 | Sorting/projection tests, lazy API integration, keyboard implementation, and route boundaries | T-053-14 through T-053-21 | PASS automated; NOT VERIFIED native interaction |
| FILE-053-05 | Existing document relocation, native opening, save/conflict, and workspace regression | T-053-22 through T-053-26 | PASS automated; NOT VERIFIED native interaction |
| FILE-053-06 | Focused suite, canonical gate, package inspection, and full regression | T-053-27 through T-053-30 on macOS and Windows | PASS automated; NOT VERIFIED on either platform |

## Architecture Boundary Verification

- [x] Record the user-approved direct replacement and exact supported Host version in `design.md`.
- [ ] Confirm in DSH Desktop that the implementation renders one breadcrumb rather than a duplicate path.
- [x] Confirm the adapter is limited to the public action slot and exact `data-textpreview-path` marker, without DOM traversal, internal React state, or unpublished imports.
- [x] Confirm stable package, bundle, Host, Client, preview, route, and settings identities remain unchanged.
- [x] Confirm Client code imports no Node API and Host code imports no React, CodeMirror, or DOM object.

## Focused Automated Plan

- [x] Breadcrumb projection covers root files, one and two directories, deep paths, Chinese/space names, Windows separators, invalid parent segments, and workspace-root labels.
- [x] Explorer connection classification distinguishes permission/missing-path failures, network failures, and ended Sessions.
- [ ] Refresh permits one effective request, validates a usable root result, discards stale Session/workspace generations, and remains manually retryable after failure.
- [ ] Refresh never reloads the window, closes tabs, resets language services, forces a save, or alters dirty document content.
- [ ] Menu node clicks choose the specified directory context; parent navigation stops at root; folders browse in place and files use native opening.
- [ ] Menu listing is one-directory-only, directory-first, naturally sorted, icon-enabled, and has loading, empty, failure, and retry states.
- [ ] Menu keyboard behavior covers Arrow keys, Enter, Escape, repeated-node toggle, outside click, and focus restoration.
- [ ] Stale menu results are aborted or discarded after a newer node, tab, workspace, close, or teardown event.
- [ ] File rename, ancestor move, deletion, and workspace invalidation refresh or clear breadcrumb/menu state through existing synchronization paths.
- [ ] Existing-tab activation does not create a duplicate tab and navigation does not mutate the current dirty buffer.
- [x] Host workspace-list tests retain canonical root, traversal, symlink, missing, permission, and malformed-input boundaries.
- [x] Existing workspace operation, save/conflict, Material icon, Python, Java, and HTML full regression suites pass.

## Acceptance Matrix

### Disconnected state and recovery

- [ ] T-053-01: a disconnected file-management Session shows the refined icon, copy, and `Refresh File Management` action.
- [ ] T-053-02: a successful refresh obtains the current workspace root state and restores one clean Explorer view.
- [ ] T-053-03: a failed refresh shows concise failure feedback and retains manual retry.
- [ ] T-053-04: repeated activation during refresh produces at most one effective request.
- [ ] T-053-05: a workspace switch during refresh prevents the old result from replacing the current workspace.
- [ ] T-053-06: an ended Session remains clearly identified, provides the centered refresh action, and is presented as recovered only after the same Session id returns a valid workspace root.
- [ ] T-053-07: refresh with an unsaved editor buffer preserves the complete draft without forcing a save.
- [ ] T-053-08: refresh does not reload DSH Desktop, change another page or Session, or terminate the Host.

### Three-node breadcrumb and menu

- [ ] T-053-09: a root file shows `workspace > file`.
- [ ] T-053-10: `workspace/src/file` shows `workspace > src > file`.
- [ ] T-053-11: `workspace/src/components/file` shows `src > components > file`.
- [ ] T-053-12: deeper paths show only the final three real nodes with the file at the right.
- [ ] T-053-13: switching the active tab immediately replaces or clears the previous breadcrumb.
- [ ] T-053-14: clicking the file node lists its containing directory.
- [ ] T-053-15: clicking a directory lists its siblings from the parent; clicking root lists root contents.
- [ ] T-053-16: selecting a folder changes only the menu directory and leaves the active file unchanged.
- [ ] T-053-17: selecting a file opens or activates the correct native tab, closes the menu, and updates the breadcrumb.
- [ ] T-053-18: parent navigation reaches but never crosses the workspace root, then permits entry into another branch.
- [ ] T-053-19: repeated names and paths containing Chinese characters or spaces resolve by real path identity.
- [ ] T-053-20: empty and failed directories show an accurate state and safe close/retry actions.
- [ ] T-053-21: Escape, outside click, Arrow keys, and Enter close, move focus, and choose correctly.

### State synchronization and platform regression

- [ ] T-053-22: navigating away from a dirty file follows existing semantics and loses no content.
- [ ] T-053-23: choosing a file already open activates its existing tab instead of duplicating it.
- [ ] T-053-24: file or ancestor rename/move updates breadcrumb and menu paths consistently with the Explorer.
- [ ] T-053-25: deletion, workspace replacement, or lost access removes or marks a stale path and cannot navigate it as valid.
- [ ] T-053-26: switching tab/workspace during a menu request prevents cross-context results.
- [ ] T-053-27: macOS light and dark themes render the disconnected view, breadcrumb, menu, and icons correctly.
- [ ] T-053-28: Windows light and dark themes render the disconnected view, breadcrumb, menu, and icons correctly.
- [ ] T-053-29: Python, Java, and HTML intelligence, saving, tabs, and settings do not regress on either platform.
- [ ] T-053-30: v0.5.0 operations/state synchronization and v0.5.1 icons do not regress on either platform.

## Canonical Automated and Package Gate

- [x] Run the smallest new workspace-navigation and Explorer-state Vitest files first and record exact file/test counts.
- [x] Run affected workspace, route, document, save-queue, and icon regression files after the final source change.
- [x] Run `npm run check` and record typecheck, full test count, build, and verification results.
- [ ] Run `npm pack --dry-run --ignore-scripts --json` and confirm `dsh-codecraft@0.5.3` only after release metadata is authorized and finalized.
- [x] Confirm the current 0.5.2 implementation artifact contains `package.json`, `cordis.patch.yml`, Host/Client entries and declarations, protocol declarations, README files, changelog, notices, license, and all newly required declarations.
- [x] Confirm no stable identity, undeclared Client external, unpublished DSH import, or accidental generated-source edit was introduced.

## Automated Evidence

| Check | Command | Status | Evidence |
| --- | --- | --- | --- |
| Focused workspace UI regression | `npx vitest run tests/workspace-navigation.test.ts tests/workspace-sync.test.ts tests/routes.test.ts` | PASS | 3 files, 32 tests; includes ended-Session refresh presentation and 11px breadcrumb/action typography parity |
| Canonical gate | `npm run check` | PASS | Typecheck; 29 files / 292 tests; build; 1,256 Material icons; Host exports and Client registration with 20 external requires |
| Package inspection | `npm pack --dry-run --ignore-scripts --json` | PASS | Current implementation identity `dsh-codecraft@0.5.2`; 98 files; 877,432 bytes packed; required runtime files and new workspace declarations present |

The package still reports 0.5.2 because ordinary feature implementation does not change release metadata. Final 0.5.3 identity evidence remains unchecked and must be refreshed through release management after native acceptance.

## Local DSH Desktop Candidate Gate

Profile mutation requires separate explicit authorization and must use DSH Plugin Manager.

- [ ] Record candidate Git SHA and package version, DSH Desktop version/build, platform/architecture, profile, expected installation source, and absolute repository path.
- [ ] Confirm exactly one CodeCraft source is selected and no npm/local-link conflict exists.
- [ ] Apply the candidate through DSH Plugin Manager and retain its receipt.
- [ ] Fully restart DSH Desktop after replacing Host or Client code.
- [ ] Confirm Plugin Manager reports installed, enabled, running, expected source, and expected version.
- [ ] Confirm Host row `include:codecraft`, Config schema, and `packageDir` resolve from the expected source.
- [ ] Confirm Client preview, settings, Explorer, dialogs, native menus, HTML action, and approved breadcrumb integration register exactly once.
- [ ] Confirm unauthenticated `/codecraft/api` reaches the structured authentication fence rather than a generic 404.
- [ ] Confirm no activation failure, blank page, reload loop, unhandled rejection, duplicate registration, or candidate-attributable crash.
- [ ] Confirm normal startup, open/edit/save, settings persistence, normal exit, and restart before the full matrix.

## Release Gate

Release is blocked until the scoped document-path replacement is observed in the target DSH Desktop, every mandatory T-053 case has required evidence, both platform matrices are complete, final 0.5.3 package/activation identity is current, and no serious startup, data-loss, save, path-boundary, stale-result, teardown, or regression defect remains.

Passing automation will not authorize a release. Commit, push, tag, GitHub Release handoff, and npm publication require the separate release-management workflow after user-confirmed native acceptance.

