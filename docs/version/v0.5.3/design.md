# DSH CodeCraft v0.5.3 Design

## Workspace File Management UI Refinement

| Field | Value |
| --- | --- |
| Target version | 0.5.3 |
| Baseline | 0.5.2 (`v0.5.2`, `c9c95db`) |
| Release type | Patch release refining existing workspace file management |
| Platforms | Currently supported DSH Desktop on macOS and Windows |
| Target Host contract | DSH Desktop / DeepSeek Harness `0.2.2-rc.3` |
| Status | Implemented; automated validation passed, native Desktop acceptance pending |
| Planning source | [`../../planning/DSH-CodeCraft-v0.5.3-Workspace-File-Management-UI-Refinement.md`](../../planning/DSH-CodeCraft-v0.5.3-Workspace-File-Management-UI-Refinement.md) |
| Validation plan | [`validation.md`](validation.md) |

## Purpose

v0.5.3 refines two existing workspace experiences without adding new filesystem semantics:

1. CodeCraft's Explorer must present a recoverable, accurately classified disconnected state and a bounded user-initiated refresh.
2. The active document path must become a maximum-three-node interactive breadcrumb that can browse the current workspace and open files through the existing native-tab path.

The release must preserve unsaved buffers, conflict-safe saving, existing workspace operations, native tabs, Material icons, and Python, Java, and HTML behavior. It must not reload DSH Desktop, cross a workspace boundary, traverse Host-private DOM, import unpublished Host modules, or manipulate internal React state.

## Current Baseline Analysis

### CodeCraft-owned Explorer

`src/client/workspace/ExplorerPage.tsx` owns the extension Files page registered as `dsh-codecraft-files`. It already lists directories through `listWorkspace`, opens files through the native `tab.actions.openResource` path, refreshes the root and expanded directories, and reacts to `WorkspaceController` refresh signals. It currently shows raw root errors inline, does not classify connection failures, does not bind list requests to a generation, and allows overlapping loads.

The Host already returns stable error categories through `ApiCallError`. In particular, a missing Session is reported as `session-not-found`; filesystem absence, permissions, and malformed paths remain distinct. This makes FILE-053-01 and FILE-053-02 feasible within CodeCraft's existing public boundary.

### DSH-owned document path header

CodeCraft registers its editor body in `sidebar.right.tab.document` and one HTML action in `sidebar.right.tab.document.actions`. The exact target DSH package `@deepseek-ai/dsh-client-ui-sidebar-documentpreview@0.2.2-rc.3` renders the path row in its internal `PreviewFrame` with a fixed `PathLabel`. Its published child-slot contract exposes:

- `sidebar.right.tab.document` for the selected renderer body;
- `sidebar.right.tab.document.actions` for contributions appended after the path;
- `sidebar.right.tab.document.action` for renderer-specific controls; and
- `sidebar.right.tab.document.unpreviewable` for unsupported-file notices.

It does not expose a slot, factory, or callback that replaces the path label. After this limitation was reported, the user explicitly required the native path to be replaced and authorized development to proceed. The implementation therefore uses the public document-actions slot for the breadcrumb component and one exact-host compatibility rule against DSH's semantic `data-textpreview-path` marker. The native label is hidden only while a live CodeCraft breadcrumb is mounted beside it; unmounting CodeCraft restores the native path automatically. No DOM traversal, mutation observer, internal React access, or unpublished DSH import is used.

This adapter is intentionally limited to the declared DSH `0.2.2-rc.3` compatibility range. A future DSH release that changes the marker or header structure must be revalidated or replaced by a public Host extension point.

## Requirement Matrix

| Requirement | Observable behavior | Negative and safety cases | Current architecture verdict |
| --- | --- | --- | --- |
| FILE-053-01 | The CodeCraft Explorer shows a friendly disconnected view with a title, short explanation, safe detail, and primary refresh action | Loading, empty workspace, permission denial, missing paths, and ended Sessions are not mislabeled as the same condition; no raw stack or sensitive path is shown | Implemented in `ExplorerPage.tsx` and `explorer-connection.ts` |
| FILE-053-02 | One user action revalidates the current Session by obtaining a usable current root listing; success restores the Explorer and failure remains retryable | One request generation per view; stale Session/workspace responses are discarded; no global reload, process reset, editor reconstruction, or automatic retry loop | Implemented with abort and context-generation ownership around `listWorkspace` |
| FILE-053-03 | The active file is the rightmost of at most three real nodes, never above the workspace root; long labels remain inspectable | No invented nodes, name-based identity, unbounded header growth, or path-security decision in the display layer | Implemented through `DocumentBreadcrumbs` and the scoped rc.3 path-marker adapter |
| FILE-053-04 | Every visible node opens an accessible one-level directory menu with parent navigation, stable sorting, Material icons, loading/error/empty states, keyboard operation, and native file opening | No recursive workspace scan, cross-root traversal, stale async result, folder-as-tab behavior, or duplicate tab system | Implemented with lazy `workspace-list` calls and native `openResource` |
| FILE-053-05 | Breadcrumb state follows the active native tab and existing rename, move, delete, workspace-switch, and dirty-state semantics | No silent save/discard, stale-path opening, forced file-tree expansion, or second editor/tab registry | Implemented through the live document registry and existing relocation/native-tab flow |
| FILE-053-06 | Automated safety/regression checks and independent macOS/Windows native acceptance cover the complete release | Automation cannot substitute for Desktop behavior; one OS cannot establish the other | Automated gate passed; macOS and Windows native acceptance remain pending |

All six requirements remain mandatory. This record does not silently reduce FILE-053-03, FILE-053-04, or FILE-053-05 to an extra toolbar inside the renderer body.

## Approved Integration Decision

The user selected direct native-path replacement rather than a duplicate in-body breadcrumb. CodeCraft registers `dsh-codecraft-file-breadcrumbs` once in the public document-actions slot. `CodeCraftBody` publishes a live controller only for a parsed Session file with resolved absolute metadata. The theme hides DSH's marked native path only when that controller renders its sibling breadcrumb, so unsupported renderers and unmounted CodeCraft documents retain the native path.

The build verifier requires both the unique action registration and the scoped replacement markers in the bundled Client. Native Desktop validation must still prove that the target DSH header renders one breadcrumb, preserves the HTML preview action and navigator toggle, and restores the native path when CodeCraft is not active.

## Implemented Architecture

### Explorer connection state

Create a small, testable client state module under `src/client/workspace/` with these durable states:

```text
connected
  -> disconnected
  -> refreshing
     -> connected
     -> refresh-failed
     -> session-ended
```

The state records the `sessionId`, a monotonically increasing request generation, and a safe public failure category. `ExplorerPage.tsx` owns the active `AbortController`. A root load proves recovery only when it returns for the current Session/generation and yields a valid root listing. Directory-level absence or permission failures remain directory errors unless the Host declares the Session unavailable.

The disconnected UI replaces only the CodeCraft Explorer content. It retains the surrounding native tab and renders one centered primary `Refresh File Management` action in disconnected, failed, and `session-ended` states. A refresh from `session-ended` retries the same Session id and restores the Explorer only after a valid root listing is returned. Refresh does not touch editor buffers or language services.

### Breadcrumb projection

Add pure workspace-navigation helpers under `src/client/workspace/`:

- normalize the already-authorized workspace-relative file path to `/` separators;
- derive real node identities from the workspace root and path segments;
- include the workspace display name only when it belongs to the final three nodes; and
- return the last at most three nodes, including the active file.

Examples remain authoritative:

| Active path | Visible nodes |
| --- | --- |
| `workspace/index.html` | `workspace > index.html` |
| `workspace/src/main.py` | `workspace > src > main.py` |
| `workspace/src/components/Button.tsx` | `src > components > Button.tsx` |
| `workspace/src/components/forms/Login.tsx` | `components > forms > Login.tsx` |
| `workspace/a/b/c/d/e.html` | `c > d > e.html` |

This projection is display logic only. The Host continues to validate every requested directory against the canonical workspace and symlink boundary.

### Breadcrumb menu controller

The menu is Client-owned and scoped by `sessionId`, active file path, and request generation. Clicking a file node lists its parent. Clicking a directory node lists its parent and selects the directory. Clicking the workspace root lists the root. Folder selection changes only the menu's current directory; file selection calls the existing native `openResource` mechanism and closes the menu.

Each listing uses the existing `workspace-list` Host action, loads only one directory, sorts directories before files with natural case-insensitive ordering, and reuses `FileIcon`. It supports parent navigation until root, loading, empty, safe error detail, manual retry, Arrow keys, Enter, Escape, outside click, and repeated-node toggle. Tab or workspace changes abort or invalidate the open menu.

### Existing contracts to reuse

| Concern | Existing owner | Reused contract |
| --- | --- | --- |
| Canonical root and directory boundary | Host `WorkspaceService` and workspace path helpers | `workspace-list`; canonical and symlink-aware resolution |
| Native file opening and existing-tab activation | DSH tab actions / `navigationCoordinator` | `openResource` with the existing `dsh-resource://file/session/...` address |
| Dirty buffers and destructive operations | `src/client/document/registry.ts` and `WorkspaceController` | Existing save/block/relocate/close behavior; breadcrumb navigation performs no destructive operation |
| Rename, move, delete synchronization | `WorkspaceController` | Existing `relocateDocuments` plus refresh generation |
| File and directory icons | `FileIcon` and Material icon state | No new assets or dependency |
| Localization | `src/client/locales.ts` | English and Simplified Chinese keys in the existing namespace |
| Visual integration | Public document-actions slot plus the target Host's semantic `data-textpreview-path` marker | One scoped sibling-presence rule; no DOM traversal, mutation, or unpublished import |

## Failure Handling and Lifecycle

- Root refresh and menu loads are abortable, generation-checked, and bound to the current Session and tab.
- Repeated refresh clicks produce at most one effective operation. There is no automatic retry or polling loop introduced for recovery.
- A Session disappearance becomes `session-ended`; it remains manually refreshable but is never presented as recovered until the same Session id returns a valid root listing. Permission, missing directory, empty directory, and transport failure retain separate user-facing meanings.
- Safe messages derive from stable error codes. Raw stacks and full sensitive host paths are not rendered.
- Existing editor state remains mounted. Recovery never calls `window.location.reload`, closes a tab, clears a draft, forces a save, restarts a Host, or resets an intelligence provider.
- Menu teardown removes listeners and aborts pending work idempotently on close, tab change, workspace change, and component unmount.
- File selection remains confined to the Host-authorized current workspace and the existing native-tab mechanism.

## Explicit Exclusions

- New create, copy, rename, move, delete, search, Git, terminal, or independent file-tree capability.
- New filesystem semantics or a second cache, tab registry, editor, or save path.
- General DSH DOM traversal or mutation, React-state access, internal module imports, global reload, or Host-process control. The exact rc.3 `data-textpreview-path` compatibility marker described above is the sole approved exception.
- Recursive scanning merely to populate a menu.
- External runtimes, downloads, language servers, or background daemons.
- v0.5.4 settings UI and v0.5.5 editor visual-refinement work.
- Package version changes, changelog release entries, commits, tags, GitHub Release publication, or npm publication during feature implementation.

## Implementation Sequence

1. Audit the target Host path header and record the approved scoped replacement adapter.
2. Implement and unit-test the Explorer connection classifier and bounded refresh state machine.
3. Implement and unit-test breadcrumb projection and workspace-root identity.
4. Register the breadcrumb through the public action seat, replace the marked native path, and add the lazy one-directory menu and keyboard behavior.
5. Bind tab/workspace/file-operation invalidation without changing dirty-state or native-tab ownership.
6. Run focused tests, the canonical regression gate, packed-artifact inspection, authorized Desktop candidate validation, and independent macOS/Windows acceptance.

## Definition of Done

- FILE-053-01 through FILE-053-06 are implemented without weakening the planning baseline.
- T-053-01 through T-053-30 have truthful evidence in `validation.md`.
- The document path is visibly replaced through the scoped target-Host adapter and reverts safely when CodeCraft is absent.
- Recovery is local, bounded, stale-safe, and preserves unsaved content.
- Breadcrumb navigation cannot escape the current workspace and always uses the existing native-tab path.
- Material icons, themes, file operations, native tabs, saving, and Python/Java/HTML behavior do not regress.
- `npm run check` and packed-artifact inspection pass on the final code candidate.
- The final candidate is applied and inspected through DSH Plugin Manager only with explicit authorization.
- The user confirms the complete macOS and Windows native acceptance matrices.

