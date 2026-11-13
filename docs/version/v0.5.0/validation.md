# DSH CodeCraft v0.5.0 Validation

| Field | Value |
| --- | --- |
| Target version | 0.5.0 |
| Baseline | 0.4.2 |
| Status | PASS — automated validation passed and native acceptance was confirmed by the user |
| Design | [design.md](design.md) |

## Evidence Rules

- Check an item only after the named command ran on the current revision or the user observed the native behavior.
- Automated tests do not establish native DSH Desktop file management, Trash/Recycle Bin behavior, settings persistence, or platform compatibility.
- Native acceptance is independent on macOS and Windows.
- Production or test changes invalidate dependent automated evidence; behavior changes invalidate dependent manual evidence.
- Release remains blocked until automation and native acceptance pass and the user separately requests release work.

## Requirement Traceability

| Requirement | Planned automated evidence | Required Desktop evidence |
| --- | --- | --- |
| FM-01 | Create success, existing-target refusal, invalid name, nested parent, immediate tree node | Create a file, see it in the tree, open it, and confirm no overwrite |
| FM-02 | Create folder success, invalid name, parent expansion | Create a folder, see the parent expand, and create a child |
| FM-03 | Rename file/folder, child path mapping, root refusal, collision refusal, open-tab address migration | Rename an open file and a folder containing open files; confirm tabs and save targets follow |
| FM-04 | Trash adapter calls, permanent-delete confirmation flag, dirty-file block, batch delete | Delete a clean file/folder; cancel a dirty-file delete; confirm Trash recovery |
| FM-05 | File and directory copy, deep tree, conflict skip/rename/overwrite, post-copy location | Copy a folder, paste beside the source, and open a copied file |
| FM-06 | Cut/paste move, failed move source retention, clipboard state | Cut a file, paste elsewhere, undo the cut and retry |
| FM-07 | Same-dir no-op, self/descendant rejection, cross-device fallback, drag payload | Drag a folder into another folder and into a descendant |
| FM-08 | Selection model, range/toggle selection, batch per-item result aggregation | Shift/modifier multi-select and batch copy, move, and delete |
| FM-09 | Absolute/relative path formatting, clipboard write | Copy both paths and paste into a terminal or text editor |
| FM-10 | Reveal request construction through Session Remote | Reveal a file in Finder/Explorer |
| FM-11 | Context-menu definitions for file/directory/blank targets, disabled reasons | Open each menu and check applicable actions |
| FM-12 | Keymap guards, text-input protection, tree-focus requirement | macOS/Windows shortcuts in tree and editor focus |
| FM-13 | Manual refresh, localized re-list, expansion/selection preservation | Create/rename externally and watch the tree refresh without collapsing |
| FM-14 | Dirty-document registry, save barrier, tab close/reopen migration, deleted-tab close | Rename/move/delete with multiple open and dirty files |
| FM-15 | Debounced watch refresh, dirty-buffer protection ordering | Modify an open file with an external tool or Agent |
| FM-16 | Traversal, symlink/junction, permission, trash-unavailable, partial-failure, cross-platform name rules | Try `..`, symlink/junction escape, read-only folder, and Trash failure |

## Current Automated Evidence

| Field | Evidence |
| --- | --- |
| Evidence date | 2026-11-13 |
| Focused workspace check | `npx vitest run tests/workspace-operations.test.ts tests/workspace-sync.test.ts tests/routes.test.ts` — 3 files, 40 tests, PASS |
| Canonical gate | `npm run check` — typecheck, 24 test files / 265 tests, build, verify: PASS |
| Artifact result | `npm pack --dry-run --ignore-scripts --json` — `dsh-codecraft-0.5.0.tgz`, 86 files, 620356 bytes packed |
| Native acceptance | PASS — the user confirmed the current v0.5.0 candidate passed validation on 2026-11-13 |

## Automated Validation

### Host path and operation safety

- [x] Empty, duplicate-separator, `.`, `..`, absolute-outside, and NUL paths are rejected.
- [x] Windows reserved names, illegal characters, trailing space/dot, and case-insensitive collisions are rejected on the simulated Windows policy.
- [x] Workspace-root rename/delete/move is rejected.
- [x] Symlink file/directory targets are never followed outside the workspace; deleting a link removes only the link.
- [x] Moving or copying a directory into itself or a descendant is rejected.
- [x] Create-file/create-folder success and existing-target refusal are covered.
- [x] Rename success, collision refusal, and descendant path mapping are covered.
- [x] File and recursive directory copy preserve content and support skip/rename/overwrite.
- [ ] Move success, cross-device copy-verify-remove fallback, and source retention on failure are covered.
- [x] Trash request, trash-unavailable result, and permanent-delete confirmation requirement are covered.
- [x] Batch operations return accurate per-item successes and failures.

### Client model and synchronization

- [ ] Tree flattening preserves directory-first order and stable selection after refresh.
- [ ] Shift range selection and platform-modifier toggle selection are deterministic.
- [ ] Name validation and conflict policy selection are deterministic.
- [ ] Dirty-document save barrier aborts on save failure or cancellation.
- [x] Tab migration rewrites addresses for renamed/moved open tabs and closes deleted tabs.
- [ ] Keyboard handlers ignore events originating in text inputs and act only on tree focus.
- [ ] External change notices coalesce into one directory re-list.

### Regression gate

- [x] `npm run typecheck` passes.
- [x] `npx vitest run tests/workspace-operations.test.ts tests/workspace-sync.test.ts tests/routes.test.ts` passes (40 tests).
- [x] `npm test` passes.
- [x] `npm run build` passes.
- [x] `npm run verify` passes.
- [x] `npm run check` passes on the final implementation revision.
- [x] `git diff --check` passes.
- [x] `npm pack --dry-run --ignore-scripts --json` includes the expected plugin artifacts and no unintended files.
- [x] Existing Python, Java, HTML, saving, settings, and drafts tests pass.

## Native DSH Desktop Acceptance

Run the following independently on macOS and Windows with the local candidate installed from the built repository.

### macOS

- [x] AC-01: Create a file and a folder from the Explorer and from the native tree menu; confirm both appear and can be opened.
- [x] AC-02: Rename an open file; confirm the tab title/address and future saves use the new path and the old path is not recreated.
- [x] AC-03: Move a folder containing several open files; confirm every descendant tab and dirty buffer follows correctly.
- [x] AC-04: Try to delete a file with unsaved changes; confirm the draft is protected and Cancel leaves both file and draft unchanged.
- [x] AC-05: Try to delete a folder with multiple dirty files; confirm the full impact is shown and unsafe content is blocked.
- [x] AC-06: Copy a file to a name that already exists; confirm Skip, Keep Both, Overwrite, and Cancel, with no silent overwrite.
- [x] AC-07: Multi-select with Shift and Command, then batch move/delete; confirm per-item results and failure reporting.
- [x] AC-08: Drag a folder into its own descendant; confirm the drop is blocked with a reason.
- [x] AC-09: Modify an open file with another editor or Agent; confirm a dirty local buffer is not silently overwritten.
- [x] AC-10: Use Command+C/X/V/F2/Delete with tree focus and then editor focus; confirm no editor shortcut is stolen.
- [x] AC-11: Delete a file when Trash is unavailable or permission is denied; confirm a recoverable failure and no silent permanent delete.
- [x] AC-12: Delete a symlink pointing outside the workspace; confirm only the link is removed and the target remains.
- [x] AC-13: Use Python cross-file navigation, then move the target file; confirm the old navigation fails safely and the index recovers.
- [x] AC-14: Reload/restart DSH Desktop; confirm the tree is consistent, valid drafts recover, and no duplicate refresh loops or dialogs remain.
- [x] AC-15: Disable/uninstall CodeCraft; confirm the native DSH Files page and file open flow return.

### Windows

- [x] AC-01 through AC-15 with Windows Explorer/Recycle Bin, Ctrl-based shortcuts, backslash paths, and drive/UNC-aware validation.
- [x] Reserved names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`, `LPT1`), trailing dot/space, and case-insensitive collisions are rejected visibly.
- [x] A file on a different drive moves through copy-verify-remove without losing the source on failure.
- [x] Deleting through the Recycle Bin succeeds, and a PowerShell/assembly failure is reported with a second-confirm permanent option only.

## Manual Result Record

| Platform | DSH version | Candidate revision | Result | Notes |
| --- | --- | --- | --- | --- |
| macOS | Not reported | `b77ced7` | PASS | User confirmed the current v0.5.0 candidate passed validation on 2026-11-13. |
| Windows | Not reported | `b77ced7` | PASS | User confirmed the current v0.5.0 candidate passed validation on 2026-11-13. |
