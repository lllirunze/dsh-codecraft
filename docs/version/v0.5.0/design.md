# DSH CodeCraft v0.5.0 Workspace File Management Design

| Field | Value |
| --- | --- |
| Status | Implemented; automated validation passed; native acceptance pending |
| Target version | 0.5.0 |
| Baseline | 0.4.2 |
| Release type | Minor feature release |
| Platforms | macOS and Windows |
| Scope | Explorer file management and its Client state synchronization inside one DSH Session workspace |

## Purpose

v0.5.0 adds the ordinary file-management loop that an IDE Explorer provides to DSH's workspace file browsing: create, rename, copy, cut/paste, move, delete, multi-select, drag-and-drop, path copy, reveal, refresh, and the state synchronization that keeps every one of those operations safe for open tabs and unsaved editor buffers.

The version deliberately does not become a general IDE. It adds no terminal, Git surface, symbol refactor, session management, full-text index, remote filesystem, Material icon theme, or general filesystem Undo. The authoritative requirements are [`docs/planning/dsh-codecraft-v0.5.0-requirements.md`](../../planning/dsh-codecraft-v0.5.0-requirements.md); every `FM-*` item there is mandatory, and file management and state synchronization ship together.

## Current Baseline

v0.4.2 already supplies the CodeCraft editor body, edit-through version-checked Host saving, Python/Java/HTML language services, native DSH document tabs, and one authenticated Host route (`/codecraft/api`). DSH 0.2.2 provides a native read-only workspace tree, native file tabs, a public context-menu service, a public right-sidebar tab-type registry, and a read-only `workspaceFiles` Remote namespace. It does not provide filesystem mutation, multi-select, rename, or drag-and-drop.

## Required Scope

| ID | Required behavior | Negative and failure behavior |
| --- | --- | --- |
| FM-01 | Create a file with a validated name, create it without overwriting, and reveal/locate it in the tree | Existing target, empty/invalid name, or a directory target fails without changing anything |
| FM-02 | Create a folder, validate the name, and expand the parent so the new folder is visible | Existing target or invalid name fails visibly |
| FM-03 | Rename a file or folder and update every affected child path, tab address, and draft/save target | Existing target, invalid name, workspace-root rename, or unsafe symlink case is rejected |
| FM-04 | Delete files and folders, preferring the system Trash, after resolving unsaved editor content | Dirty content blocks until saved or cancelled; trash failure never silently becomes permanent delete |
| FM-05 | Copy files and complete directories, then locate the copy | Name conflicts require an explicit decision; directory merging is not implicit |
| FM-06 | Cut and paste a move inside the workspace, keeping the source on failure | A failed move leaves the source and a usable cut state; invalid targets are rejected before mutation |
| FM-07 | Move to a target directory, including drag-and-drop, and reject moving a directory into itself or a descendant | Cross-volume moves copy, verify, then remove; source loss is never accepted |
| FM-08 | Multi-select with Shift and the platform modifier, then batch copy/move/delete | Per-item results are reported; one failure does not hide successes or rewrite them as failures |
| FM-09 | Copy the absolute path and the workspace-relative path | Copy uses the clipboard only and never mutates the filesystem |
| FM-10 | Reveal in Finder or Windows Explorer through DSH's public Session Remote | Unsupported reveal reports a recoverable failure |
| FM-11 | Context menus for files, folders, and blank tree space | Actions are omitted or disabled with a reason when not applicable |
| FM-12 | OS-compatible keyboard interaction without stealing editor shortcuts | Tree shortcuts only act while the tree owns focus; text inputs never trigger file deletion |
| FM-13 | Manual refresh and automatic refresh after operations while preserving expansion and selection | Refresh is localized to changed directories and never clears valid tree state |
| FM-14 | Keep tree, open tabs, drafts, editor save targets, and language services consistent | A tab is never left editable while saving to a removed or moved path |
| FM-15 | Detect external changes from other tools or Agents and refresh safely | A dirty local buffer is never silently overwritten by a disk change |
| FM-16 | Enforce workspace path, permission, conflict, trash, failure-recovery, and cross-platform safety | Traversal, symlink escape, arbitrary commands, and accidental permanent deletion are rejected |

## Architecture and Placement

The feature is split across the public DSH boundary. Filesystem mutation is Host-owned; browser interaction and tab/editor coordination are Client-owned; the protocol is shared.

| Capability | Runtime | Concrete placement | Reused contract and reason |
| --- | --- | --- | --- |
| Path validation, conflict policy, copy/move/trash | Host | `src/host/workspace/paths.ts`, `operations.ts`, `trash.ts` | Existing `/codecraft/api` authenticated route and Session workspace resolution; `node:fs` is required because DSH exposes no mutation service |
| Operation protocol and error codes | Shared | `src/protocol.ts` | Existing `CodeCraftEnvelope`, `CodeCraftError`, and error-code mapping |
| Explorer page | Client | `src/client/workspace/ExplorerPage.tsx`, `controller.ts`, `paths.ts` | Public `sidebarRightTabs.register` extension band; replaces only the built-in `files` page and restores it on unload |
| Native tree actions | Client | `src/client/workspace/native-menus.ts` | Public `contextMenus.register` for `file` and `directory` targets; native rows already dispatch both |
| Open-tab and editor coordination | Client | `src/client/document/registry.ts`; `src/client/renderer/CodeCraftBody.tsx` registration | Tab bodies register their save and relocation functions; the tab actions perform orderly open-new/close-old migration |
| Editor registration | Client | `src/client/renderer/CodeCraftBody.tsx` | Existing tab body and save path; no second save implementation |
| External refresh | Client | `src/client/workspace/ExplorerPage.tsx` | A foreground re-list of the root and expanded directories every three seconds; it is bounded to visible directories and is cancelled on unmount |
| Copy and styles | Client | `src/client/locales.ts`, `src/client/theme.ts`, `src/client/workspace/DialogHost.tsx` | Existing bilingual dictionaries, scoped DSH tokens, and one shared modal host |

The Explorer is registered as an `extension` tab type for kind `files` with a CodeCraft-owned id. DSH's registry contract gives the extension precedence and restores the builtin page when the extension unregisters, so uninstalling or disabling CodeCraft does not remove the native file workflow. This is a documented page takeover, not DOM hijacking: exactly one main file tree is visible, and the native navigator beside document previews is unchanged. Because the guide reads entries from the tab type in force, the extension must contribute its own `guide` entry; otherwise the builtin Files entry disappears together with the shadowed builtin type.

The native tree is not replaced at the Factory level. Its rows already dispatch public `file` and `directory` context-menu targets, so CodeCraft contributes ordinary management actions there without duplicating the tree. Multi-select and drag-and-drop require a tree that owns selection, so those capabilities live in the Explorer page.

## Host Operation Model

`src/host/workspace/operations.ts` exposes one serialized entry per Session workspace. Requests carry a `sessionId` and workspace-relative paths; the Host resolves the Session's working directory and never accepts a caller-supplied root.

```ts
type FileOperation =
  | { kind: 'createFile'; path: string; content?: string }
  | { kind: 'createDirectory'; path: string }
  | { kind: 'rename'; path: string; newName: string }
  | { kind: 'copy'; paths: string[]; targetDirectory: string; conflict: ConflictPolicy }
  | { kind: 'move'; paths: string[]; targetDirectory: string; conflict: ConflictPolicy }
  | { kind: 'delete'; paths: string[]; mode: 'trash' | 'permanent'; confirmedPermanent?: boolean }
```

`FileOperationResult` reports `succeeded`, `failed` (`path`, `reason`), `changedPaths` (`from`, `to`), and `warnings`. Copy and move support `skip`, `rename`, and `overwrite`; overwrite requires an explicit confirmation flag, never applies to an existing directory, and is never the default. Batch operations preflight every item, continue independent items after a failure, and return per-item results.

Before mutation the Host:

1. Resolves the Session workspace root with `canonicalRoot`.
2. Normalizes the requested path and rejects empty segments, `.`, `..`, NUL, and paths outside the real root.
3. Realpaths the parent and verifies it remains inside the root.
4. Rejects targets that are the workspace root, that escape through a symlink, or that would move a directory into itself or a descendant.
5. Validates names against the real platform rules, including Windows reserved names, trailing spaces/dots, illegal characters, and case-insensitive collisions where the filesystem is case-insensitive.
6. Serializes operations per workspace so two browser requests cannot interleave a rename and a save.

Directory creation uses `mkdir`, not recursive creation. Recursive copy and delete walk with `lstat` and never follow symlinks; a copied symlink is recreated as a link, and a deleted symlink removes only the link. Cross-device `rename` failures fall back to copy, verify, then remove; if verification or removal fails, the source is retained and the result records the recoverable state.

## Trash and Permanent Delete

Deletion defaults to the system Trash:

- macOS moves the item into the user's `~/.Trash` with a collision-safe name. A cross-volume move uses copy-to-Trash followed by source removal only after verification.
- Windows invokes the platform recycle-bin API through a fixed PowerShell script with the path passed in an environment variable. No shell string is built from user input.
- Any other platform reports `trash-unavailable`.

A permanent delete is a separate request with `mode: 'permanent'` and `confirmedPermanent: true`. The browser shows a second destructive confirmation after a trash failure; the Host rejects the request without the flag. No failed trash operation silently becomes a permanent delete.

## Client State Synchronization

The Client keeps one registry of CodeCraft document bodies. Each body registers `{ tabId, sessionId, path, dirty, save }` and unregisters on teardown. The registry never owns editor text; it only asks the existing save path to flush.

For every affected path, the Explorer:

1. Computes all open CodeCraft documents whose path is the target or a descendant of it.
2. If any is dirty, shows the affected list and asks to save and continue or cancel. It pauses new operations and waits for every save.
3. Aborts on any save failure, version conflict, cancellation, or unproven migration.
4. Calls the Host operation.
5. On success, migrates every matching open tab found through `ctx.sidebarRight.openTabs`: save first, close the old address, and open the new address with the original tab kind. Deleted paths close their tabs. Original tabs and drafts that cannot be migrated are left closed rather than recreated.
6. Refreshes the affected directories, keeps expansion and selection, and reports the result.

Because DSH captures a tab's content address at open time and exposes no in-place rename, a rename or move of an open file is implemented as an ordered save, close, and reopen. The Unsaved dialog is therefore blocking: no destructive operation runs while a dirty buffer's path is unproven. A document is never left editable with a save target that no longer exists.

External changes are observed by re-listing the root and expanded directories while the Explorer is mounted, plus an immediate re-list after every successful operation. The Host filesystem remains the authority; a dirty editor buffer is protected by the existing version-checked save conflict path and is never auto-overwritten by a tree refresh.

## Explorer Interaction

The Explorer provides:

- A toolbar with New File, New Folder, Refresh, and the workspace root label.
- A tree with directory-first ordering, explicit expand/collapse, file/folder/symlink icons, and a cut marker.
- Single click selection, platform-modifier toggle, Shift range selection, arrow navigation, Enter open/toggle, F2 rename, Escape cancel, and Delete/Backspace delete only while the tree owns focus.
- A custom context menu for row and blank-space targets with New File, New Folder, Open, Rename, Copy, Cut, Paste, Delete, Copy Path, Copy Relative Path, Reveal, and Refresh. Unavailable actions are omitted or disabled with a reason.
- A module-level clipboard that keeps a cut list valid after a failed paste.
- HTML drag-and-drop for one or many selected paths; directory targets highlight, same-directory drops are no-ops, and self/descendant drops are rejected. Drag and paste share the same move service.
- Name, conflict, unsaved, delete, and failure dialogs. Dialog inputs stop keyboard propagation so Backspace in a name field is text editing, never file deletion.
- A selection count, a transient success/error banner, and per-directory load errors.

## Failure, Security, and Performance

- All destructive requests are validated before any item is touched; a failed item keeps its source and reports a typed reason.
- No request contains a filesystem root, and no Host path is built from a shell string.
- Symlinks and Windows junctions are inspected with `lstat`; operations never traverse a link outside the workspace and never delete a link's target.
- Logs contain operation kinds and counts, not file contents.
- Refresh re-lists only the root and currently expanded directories, is cancelled on unmount or workspace change, and never rescans unrelated subtrees.
- Large copies and recursive deletes are asynchronous Host work; the browser shows a busy state and disables overlapping destructive actions.
- CodeCraft remains independent of `dsh-better-sidebar`; if that plugin is absent the Explorer still works.

## Explicitly Out of Scope

Editor visual redesign, Material Icon Theme (v0.5.1), Git operations, refactor/symbol rename, terminal, full-text index, files outside the workspace root, remote machines, Linux compatibility promises, operation history, general filesystem Undo, and release metadata or publication are excluded.

## Implementation Sequence

1. Add protocol types, path validation, conflict policy, and the Host operation service with focused unit tests.
2. Add the Explorer tab type, tree model, dialogs, clipboard, and localized styles.
3. Add open-document registration, tab migration, and unsaved protection.
4. Add native-tree context-menu actions and bounded external refresh.
5. Run focused tests, typecheck, the full suite, build, artifact verification, and package inspection.
6. Hand off native macOS and Windows acceptance; release only after the user reports the required matrices pass.

## Known Limitations

- The native document-preview navigator remains DSH-owned; only the main Files page is replaced.
- A renamed open file loses CodeMirror Undo history because its tab is closed and reopened at the new address.
- The Windows recycle-bin path depends on the platform PowerShell and Microsoft.VisualBasic assembly; when unavailable, the UI reports the failure and requires an explicit permanent-delete confirmation.
- Linux is not a promised platform; POSIX behavior is implemented but not part of the v0.5.0 acceptance matrix.

## Implementation Outcome

Implemented in the current revision:

```text
src/host/workspace/
├── paths.ts          workspace path, name, and symlink validation
├── operations.ts     serialized create/rename/copy/move/delete service
└── trash.ts          macOS Trash and Windows recycle-bin adapters

src/client/workspace/
├── ExplorerPage.tsx  tree page, selection, drag/drop, context menu, refresh
├── controller.ts     dialogs, clipboard, preflight, unsaved barrier, feedback
├── DialogHost.tsx    name, conflict, unsaved, and delete dialogs
├── native-menus.ts   native tree file/directory contributions
└── paths.ts          client-side relative/absolute path helpers

src/client/document/
└── registry.ts       dirty-document registry, flush barrier, tab migration
```

The Host route remains `/codecraft/api`; no new route, Subprocess service, terminal, Git, or external dependency was added. The Explorer page is an extension registration for the builtin `files` kind, and the native tree is enhanced through public context-menu targets.
