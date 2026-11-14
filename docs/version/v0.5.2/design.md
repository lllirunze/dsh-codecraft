# DSH CodeCraft v0.5.2 DSH Desktop Compatibility Design

| Field | Value |
| --- | --- |
| Status | Implemented and validated; release metadata finalized for v0.5.2 |
| Target version | 0.5.2 |
| Baseline | 0.5.1 (`v0.5.1` tag `9fa96ac`) |
| Release type | Patch / Host compatibility update |
| Target Host | DSH Desktop / DeepSeek Harness `0.2.2-rc.3`, tag commit `38a6a5c965aa99ab525161efb7cc5cf1fe62fced` |
| Platforms | macOS and Windows on officially supported Desktop architectures |
| Scope | Audit the real DSH integration surface, make only proven compatibility corrections, and produce traceable automated and native evidence |

## Purpose

v0.5.2 verifies that the complete v0.5.1 product remains safe and usable on DSH Desktop `0.2.2-rc.3`. It does not add editor, language, workspace-management, icon, or UI capability. A source-level audit may conclude that no runtime correction is necessary, but that conclusion does not authorize a compatibility declaration without current macOS and Windows Desktop evidence.

The authoritative raw requirement source is [`docs/planning/DSH-CodeCraft-v0.5.2-DSH-Desktop-Compatibility-Design.md`](../../planning/DSH-CodeCraft-v0.5.2-DSH-Desktop-Compatibility-Design.md). This normalized record maps that source to the checked-out repository and the exact upstream tag.

## Current Baseline and Upstream Audit

The checked-out CodeCraft baseline is commit `b7f48768feb842928e7f7b38a4a27dab8ba46da7`. The released product baseline remains tag `v0.5.1` at `9fa96ac`. Its manifest declares CodeCraft `0.5.1`, Node.js `>=20`, DSH `>=0.2.1-rc.5 <0.3.0`, and only `0.2.1-rc.5` as a validated DSH release.

The exact DSH target was audited from official tag `dsh-v0.2.2-rc.3`, commit `38a6a5c965aa99ab525161efb7cc5cf1fe62fced`. The target root package requires Node.js `>=24.9.0`; this is a Host development/runtime requirement and does not by itself require CodeCraft to raise its independent source-build floor from Node.js 20.

The exact `dsh-v0.2.2-rc.2...dsh-v0.2.2-rc.3` diff adds the experimental DeepSeek chat-import feature and fixes the Windows Desktop updater's restart-status process so it does not retain the installation directory while the application is replaced. The source files of every DSH package whose public contract CodeCraft consumes are unchanged in this delta; those package manifests only advance their version. Left-sidebar and workspace-picker changes do not alter CodeCraft's right-sidebar integration, but their composed Desktop behavior remains part of native smoke testing.

The audit confirmed that the public contracts CodeCraft actually consumes still exist with the required shapes:

- `documentPreviews.register` retains renderer metadata, `loading: 'renderer'`, extension priority, and keyed document bodies.
- `sidebarRightTabs.register`, `sidebar.right.pane.tab`, `sidebar.right.pane.tab.title`, `sidebar.right.tab.document`, and document action slots retain the ownership model CodeCraft uses.
- `configForms.get` and `configForms.whileServed` retain the settings namespace lifecycle CodeCraft uses.
- `contextMenus.register` retains file and directory targets, abortable resolution, and disposer ownership.
- `sidebarRight.openResource` and tab-owned `openResource` retain the resource-address and placement model CodeCraft uses.
- Session `openWorkspacePath` still returns a successful `{ opened: true }` value after a verified native open or reveal.
- Host `webServer.register({ kind: 'exact', ... })` retains exact-route ownership and duplicate-route rejection.

The DSH release's menu-positioning change does not directly apply to CodeCraft's current implementation. Workspace file actions use DSH's native context-menu service; editor completion and Hover surfaces are owned by CodeMirror; the workspace dialog host is a modal `shell.overlay` contribution rather than a custom menu-positioning implementation. Native Desktop checks must still verify zoom, scrolling, long menus, and overlay placement.

## Requirements

| ID | Required outcome | Negative and failure behavior |
| --- | --- | --- |
| COMPAT-052-01 | Record the released CodeCraft baseline, exact target Host tag and running Host/Desktop builds, platforms, architectures, profile, installation source, and active manifest/bundle declarations | A download filename, update prompt, or unverified version string cannot stand in for the running Host identity |
| COMPAT-052-02 | Audit every actual Host/Client integration surface and assign `Unchanged`, `Compatible`, `Adapted`, or `Blocked`; make only corrections supported by a reproduced incompatibility | Do not build adapters for unused DSH features, rewrite architecture speculatively, or publish with any `Blocked` verdict |
| COMPAT-052-03 | After required native validation, align CodeCraft `0.5.2`, `engines.dsh` `>=0.2.2-rc.3 <0.2.3`, the validated-release map, README files, changelog, and packed manifest | Metadata is not compatibility evidence; do not write `compatible` before both platform matrices pass |
| COMPAT-052-04 | Verify install/load state, Host and Client activation, normal startup, disable/remove degradation, normal exit, restart, and controlled failure isolation | A responsive Web route alone does not prove Desktop health; a blank page, reload loop, activation failure, or candidate-attributable crash blocks delivery |
| COMPAT-052-05 | Preserve v0.5.1 editing, conflict-safe saving, workspace operations, icons, settings, Python, HTML, Java, menus, tabs, and lifecycle behavior | Data loss, stale overwrite, path desynchronization, save failure, orphan process, or broken ordinary editing blocks delivery |
| COMPAT-052-06 | Produce current automated/package evidence and independent macOS and Windows native evidence with exact candidate identity | Automation cannot substitute for native acceptance, and one platform cannot establish the other platform's result |
| COMPAT-052-07 | Maintain a reusable compatibility record at `docs/compatibility/dsh-0.2.2-rc.3.md` with upstream changes, dependency surface, verdicts, changes, verification, release decision, and upgrade procedure | Do not claim a release decision that is stronger than the recorded evidence |

## Integration Surface and Ownership

| Capability | Runtime | Current path | Reused DSH contract | Planned treatment |
| --- | --- | --- | --- | --- |
| Bundle loading and settings schema | Host | `cordis.patch.yml`, `src/index.ts`, `src/config.ts` | Loader bundle entry, Cordis plugin lifecycle, Config namespace | Preserve stable identities; inspect active row, schema, and `packageDir` |
| Authenticated file and intelligence API | Host / protocol | `src/index.ts`, `src/host/routes.ts`, `src/protocol.ts` | Exact Web route plus Session admission | Preserve `/codecraft/api`; verify authentication fence and single registration |
| Client module loading | Browser | `package.json`, `src/client/index.tsx`, `src/client/core/plugin.ts` | `dsh.client.inject`, module loader, Cordis effects | Confirm every injection resolves and every disposer remains single-owner |
| Native file tabs and renderer | Browser | `src/client/core/plugin.ts`, `src/client/renderer/CodeCraftBody.tsx` | Document preview registry and keyed document slots | Preserve renderer id and native tab ownership; exercise open/switch/close/reopen |
| Explorer and native menus | Browser / Host | `src/client/workspace/`, `src/host/workspace/` | Sidebar tab registry, slots, context-menu targets, Session files | Verify search/scroll/menu behavior and all v0.5.0 mutations without parallel file infrastructure |
| Settings | Browser / Host | `src/client/settings/`, `src/settings/schema.ts` | Config forms, served namespace, Plugins item slot | Verify rendering, writes, malformed-value fallback, and restart persistence |
| Editor overlays | Browser | CodeMirror extensions under `src/client/editor/` and `src/client/languages/` | CodeMirror completion, Hover, lint and tooltip ownership | No DSH positioning adapter unless a real native failure is reproduced |
| Python Intelligence | Browser / Host | `src/client/languages/python/`, `src/host/languages/python/`, `src/host/lsp/` | Managed subprocess plus authenticated CodeCraft API | Verify bounded startup, status, completion, navigation, cancellation, and teardown |
| Material icons | Browser / Host | `src/client/icons/`, `src/host/material-icons.ts` | Authenticated API, local DSH cache, Explorer slots | Verify default fallback, installed icons, theme/expansion changes, offline restart |

## Implementation Decision

The source audit currently finds no proven runtime incompatibility. Therefore the initial implementation plan is deliberately conservative:

1. Normalize this design, its validation plan, and the compatibility evidence record.
2. Run focused integration, workspace, settings, lifecycle, route, Python, HTML, Java, and icon checks against the current source.
3. Run the canonical gate and inspect the packed artifact.
4. If automation or DSH Desktop reproduces an incompatibility, correct only the owning integration point, add a focused regression, and invalidate dependent evidence.
5. After the user confirms macOS and Windows native matrices, update release metadata and user-facing support statements through the repository's release workflow.

Until a reproduced failure proves otherwise, **no runtime code changes are required**. This implementation conclusion is supported by exact-tag source inspection, focused regression, the canonical repository gate, and packed-artifact inspection; it remains subject to native acceptance.

## Failure Handling and Safety

- Stable package, bundle, Host, Client, preview, slot, settings, and route identities must not change.
- Exactly one CodeCraft source may be selected in the test profile. Profile mutation requires explicit user authorization and must use DSH Plugin Manager.
- Optional Python, icon, preview, or native-open failures must retain ordinary editing and saving.
- Every route, slot, menu, listener, observer, timer, subprocess, and async request remains lifecycle-owned and idempotently disposable.
- Malformed persisted settings, protocol inputs, files, or optional-service responses remain contained.
- Save errors must preserve dirty state and must never bypass version/conflict checks or overwrite newer disk content.
- A candidate-attributable crash, blank page, activation failure, duplicate registration, generic route 404, or wrong package source blocks handoff.

## Explicit Exclusions

- New editing, language, file-management, icon, UI, updater, CI, or automatic-release features.
- Compatibility layers for AgentTeam, Computer Use, Office, Worktree, or other DSH capabilities CodeCraft does not consume.
- Modification of DSH installation files, private profile state, or packaged Desktop resources.
- Raising CodeCraft's Node.js engine solely because the DSH repository uses Node.js 24.9 or later.
- Changing package identities, route names, slot ids, or supported platforms.
- Release commit, push, tag, GitHub Release publication, or npm publication in the implementation phase.

## Definition of Done

- COMPAT-052-01 through COMPAT-052-07 are fully traceable in this design and [`validation.md`](validation.md).
- Every actual integration surface has a final non-`Blocked` verdict backed by source and native evidence.
- Any reproduced incompatibility has the smallest owning correction and focused regression evidence.
- Current `npm run check` and packed-artifact inspection pass after the last relevant change.
- The final candidate is applied from exactly one expected source and passes Host, Client, route, restart, and crash checks.
- The user confirms the complete macOS and Windows native matrices against DSH Desktop `0.2.2-rc.3`.
- Windows acceptance includes the supported in-app update path to rc.3 and automatic relaunch without losing the selected CodeCraft source or enabled state.
- Only after those confirmations do release metadata, README support statements, changelog content, and the validated-release map identify v0.5.2 as compatible.

