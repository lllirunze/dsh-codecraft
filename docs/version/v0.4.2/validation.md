# DSH CodeCraft v0.4.2 Validation

| Field | Value |
| --- | --- |
| Target version | 0.4.2 |
| Baseline | 0.4.1 |
| Status | Automated validation passed; native macOS and Windows acceptance pending |
| Design | [design.md](design.md) |

## Evidence Rules

- Check an item only after the named current-revision command ran or the user observed the native behavior.
- Automated tests do not establish native DSH Desktop integration, persistence, Undo presentation, or platform compatibility.
- Native acceptance is independent on macOS and Windows.
- Production or test changes invalidate dependent automated evidence; behavior changes invalidate dependent manual evidence.
- Release remains blocked until automation and native acceptance pass and the user separately requests release work.

## Requirement Traceability

| Requirement | Planned automated evidence | Required Desktop evidence |
| --- | --- | --- |
| HTML-042-01 | Parser-error, mismatch, conservative nesting, optional-close, comment/text boundary cases | Error ranges and no false positive for legal optional closing |
| HTML-042-02 | Duplicate/unsupported attributes, enum values, global/data/aria/boolean boundaries | Severity, reason, exact ranges, and correction disappearance |
| HTML-042-03 | Duplicate/unique IDs and found/missing exact fragment targets | Problem navigation and update after edits |
| HTML-042-04 | Complete-document detection, missing skeleton parts, fragment exclusion | Full page versus fragment behavior |
| HTML-042-05 | Missing/empty `alt`, found/missing label control target | Accessibility warnings and boundaries |
| HTML-042-06 | Fixed deprecated element/attribute table and offline execution | Deprecated warning presentation while offline |
| HTML-042-07 | Lint extension, deterministic analysis, range mapping, current-state list | Wavy ranges, list navigation, multi-tab isolation, stale removal |
| HTML-042-08 | Paired rename plans and void/self-closing/mismatch/name refusal | Preview, confirm, Cancel, exact paired rename, one Undo |
| HTML-042-09 | ID/reference plans and duplicate/conflict/invalid/refusal cases | Exact current-document rename without CSS/JS/cross-file changes |
| HTML-042-10 | Preview data and zero-edit cancellation path | Review affected locations, Cancel, and Confirm |
| HTML-042-11 | Document-identity/staleness guard and one transaction | External edit/conflict refusal, edit-through save safety, and one Undo |
| HTML-042-12 | gate, lifecycle, larger document, and sibling-language regression tests | macOS/Windows, offline, multi-tab, special paths, Python/Java |
| SAVE-042-01 | Edit-through save invocation, in-flight reconciliation, and latest-content follow-up | Type/edit/Undo/Redo and observe immediate saved state and disk content |
| SAVE-042-02 | Version conflict, read-only, deleted-file, and save-failure checks | External edit is not overwritten; failure remains visible |
| SAVE-042-03 | Disk-only initial state and legacy-draft migration tests | Reopen/switch tabs with no restore prompt |
| SAVE-042-04 | Settings and typecheck regressions | AutoSave switch and interval are absent; edits still save unconditionally |
| SAVE-042-05 | Prefix-scoped cleanup test and absence of unload handlers | Normal macOS/Windows quit succeeds without Force Quit |
| SAVE-042-06 | Pure footer-status priority tests | Normal typing remains `In sync`; read-only, conflict, and failure labels remain visible when applicable |

## Current Automated Evidence

| Field | Evidence |
| --- | --- |
| Evidence date | 2026-11-12 |
| Focused save/lifecycle check | `npx vitest run tests/save-queue.test.ts tests/drafts.test.ts tests/document.test.ts tests/settings.test.ts tests/files.test.ts tests/editor.test.ts` -> PASS, 6 files / 72 tests |
| Focused footer-status check | `npx vitest run tests/document-status.test.ts tests/save-queue.test.ts tests/document.test.ts tests/drafts.test.ts` -> PASS, 4 files / 11 tests |
| Canonical gate | `npm run check` -> PASS: typecheck, 22 test files / 238 tests, build, artifact verification |
| Artifact result | Host exports and client registration verified with 11 external requires |
| Native acceptance | NOT VERIFIED on macOS and Windows |

## Native Defect and Retest Record

| Field | Evidence |
| --- | --- |
| Report date | 2026-11-12 |
| Platform | macOS |
| Scenario | Quit DSH Desktop with **Command+Q** while CodeCraft is installed |
| Observed before correction | Application did not terminate normally and required Force Quit |
| Root cause | Cancelling `beforeunload` handlers in both plugin and editor lifecycles could leave the native shell waiting for an unavailable browser confirmation |
| Correction | Removed unload vetoes and draft recovery; every document change now starts the existing checked save path, with later edits queued behind an in-flight save |
| Current native status | NOT VERIFIED — immediate disk writes, tab switching, and macOS/Windows application quit must be tested in DSH Desktop |

## Automated Validation

### Focused diagnostics

- [x] The four-file focused HTML command passes, including `tests/html-diagnostics.test.ts`.
- [x] Every HTML-042-01 through HTML-042-06 rule has positive, negative, and relevant HTML5 boundary coverage.
- [x] Diagnostic rule ID, severity, reason, and range are deterministic.
- [x] Legal optional closing, void elements, empty `alt`, boolean attributes, comments, and non-markup text avoid false positives.
- [x] Diagnostics are owned by the existing HTML assistance compartment, whose disabled state is empty.

### Focused refactoring and renderer contracts

- [x] The four-file focused HTML command passes, including `tests/html-refactoring.test.ts`.
- [x] Paired tag rename changes only uniquely paired tag-name ranges and rejects unsafe structures.
- [x] ID rename changes one unique definition and exact same-document fragment links only.
- [x] Duplicate IDs, new-name collision, invalid names, stale document state, and read-only/conflict apply guards produce zero changes.
- [ ] Preview contains every affected location and replacement; Cancel is a no-op; one transaction is Undoable once. (Plan contents and one-step Undo are automated; UI Cancel/Confirm remains native acceptance.)
- [ ] Problems and preview state remain local to one editor/tab and clean up on disable or teardown.

### Regression gate

- [x] `npm run typecheck` passes through the canonical gate.
- [x] Existing HTML 0.4.0 and 0.4.1 focused tests pass in the four-file focused command and full suite.
- [x] Python and Java regression tests pass in the full suite.
- [x] `npm run check` passes on the final implementation revision.
- [x] `git diff --check` passes.
- [x] Build and artifact verification accept the browser bundle; no Node/Host-only dependency, subprocess, network fetch, or runtime download was added.

## Native DSH Desktop Acceptance

### macOS

- [ ] With a clean CodeCraft tab open, press **Command+Q** and confirm DSH Desktop exits normally without Force Quit.
- [ ] Edit a writable file without pressing Command+S and confirm the disk content updates immediately.
- [ ] While typing normally, confirm the footer stays visually stable as `In sync` with no transient Save button, dot, Saving, or Saved flash.
- [ ] Type rapidly, then Undo and Redo while saving; confirm the final disk content exactly matches the editor and no older write wins.
- [ ] Switch tabs, close the edited tab, reopen the file, and confirm the saved disk content appears with no draft-recovery prompt.
- [ ] Press **Command+Q** immediately after an edit, confirm DSH Desktop exits without Force Quit, then restart and verify the edit is on disk.
- [ ] Confirm the CodeCraft settings page no longer shows an AutoSave switch or interval.
- [ ] Open a full HTML page containing a mismatch, duplicate attribute, invalid `target`, duplicate ID, missing fragment target, missing `alt`, missing label target, and deprecated element; verify each severity/reason/range and Problems navigation.
- [ ] Correct issues and confirm stale entries and waves disappear without changing another tab's results.
- [ ] Open a legal fragment with optional `li`/`p` closing, void elements, `alt=""`, boolean attributes, comments, and text containing `<`; confirm no listed false positives.
- [ ] Rename `<section>…</section>` to `article`: inspect two preview entries, Cancel once with zero change, repeat Confirm, and Undo once to restore both names.
- [ ] Rename a unique `id="profile"` to `account`; confirm exact `href="#profile"` references change while CSS, JavaScript, comments, text, and another file do not.
- [ ] Confirm duplicate source ID, target-name collision, invalid new name, self-closing/void/mismatched tag, read-only state, external disk change, and edits made after preview all refuse with zero partial change.
- [ ] Disable/re-enable HTML assistance and confirm diagnostics/refactoring disappear/return without affecting edit-through saving or native tab behavior.
- [ ] Repeat with paths containing spaces and Chinese characters, multiple tabs, a larger HTML file, and no network; confirm Python and Java remain unchanged.

### Windows

- [ ] Repeat the immediate-save, rapid-edit/Undo/Redo, tab-close/reopen, no-recovery-prompt, settings, and immediate-quit checks from macOS.
- [ ] Repeat the complete diagnostics and legal-boundary matrix.
- [ ] Repeat paired-tag preview/Cancel/Confirm/one-Undo and current-document ID rename.
- [ ] Repeat refusal, stale-preview, external-change, multi-tab, larger-file, disabled-gate, offline, special-path, Python, and Java checks.

## Release Gate

Release is blocked until every applicable automated item has current evidence, the user reports both native platform matrices, no critical diagnostic/refactoring/save-safety defect remains, and the user explicitly requests the separate release workflow. Package versions, changelog, README release claims, commits, pushes, tags, and publication are not part of implementation.
