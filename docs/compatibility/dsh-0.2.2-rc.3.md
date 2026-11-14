# DSH `0.2.2-rc.3` Compatibility Record

## Target

| Field | Current record |
| --- | --- |
| DSH release/tag | `dsh-v0.2.2-rc.3` |
| DSH source commit | `38a6a5c965aa99ab525161efb7cc5cf1fe62fced` |
| Actual Desktop build | DSH Desktop `0.2.2-rc.3`; user-confirmed on macOS and Windows |
| Actual running Host version | DeepSeek Harness `0.2.2-rc.3`; user-confirmed on macOS and Windows |
| CodeCraft release baseline | `v0.5.1` at `9fa96ac` |
| CodeCraft audit worktree | `b7f48768feb842928e7f7b38a4a27dab8ba46da7` before v0.5.2 documentation changes |
| CodeCraft candidate version/commit | Behavior candidate `0.5.1` at `41eae16ae7ac21c49fe0e81a578233cdc3773009`; finalized as metadata-only `0.5.2` |
| Platforms | macOS and Windows; independent matrices user-confirmed PASS |
| Profile and installation source | Desktop profile; local repository candidate applied through DSH Plugin Manager; user-confirmed PASS |

Official sources:

- [DSH `v0.2.2-rc.3` release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.3)
- [DSH `dsh-v0.2.2-rc.3` source](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.2-rc.3)

## Upstream Changes Relevant to CodeCraft

Relative to rc.2, the official rc.3 release adds an experimental DeepSeek chat-import plugin and fixes a Windows Desktop in-app update failure that could prevent automatic relaunch. The exact source diff changes the Windows restart-status process so it uses the system directory rather than retaining the installation directory during replacement. It also changes left-sidebar/workspace-picker composition for the new import entry. CodeCraft consumes none of the import feature's Host, Client, protocol, or persistence contracts and does not register in the changed left-sidebar surfaces.

Every DSH package whose public contract CodeCraft actually consumes has no source change between rc.2 and rc.3; only its package version advances. The broader `0.2.2` line's plugin failure isolation, running-state reporting, file discovery, right-sidebar behavior, dark file-tree panels, and menu positioning remain in the rc.3 native regression scope.

CodeCraft does not consume the release's AgentTeam, Computer Use, Office, account, model-provider, PTC, LiveShare, or Worktree feature APIs. They have no direct integration surface in this plugin and do not justify compatibility code.

## Dependency Surface

CodeCraft actually depends on:

- the `codecraft` Host bundle row and Cordis plugin lifecycle;
- Host `webServer`, `connection`, `sessions`, and `subprocess` injections;
- the exact authenticated `/codecraft/api` route;
- the DSH Client module loader and declared `dsh.client.inject` services;
- document-preview metadata, keyed document body, document actions, and native tab lifecycle;
- right-sidebar tab registration, Explorer body/title, guide, and `shell.overlay` slots;
- native file/directory context menus and Session resource addresses;
- Config forms and the Plugins item slot;
- Session path open/reveal for Finder, Explorer, and browser preview;
- the DSH cache convention for optional Material icons.

## Impact Verdict

These final verdicts combine the exact-tag source audit, automated evidence, and the user's confirmation that the complete prescribed native matrix passed.

| Integration surface | Current verdict | Evidence and next gate |
| --- | --- | --- |
| Manifest compatibility preflight | Compatible | Final metadata declares `>=0.2.2-rc.3 <0.2.3` and records rc.3 as compatible |
| `cordis.patch.yml` bundle and Host lifecycle | Unchanged | Stable `codecraft` row, activation, teardown, and single registration passed |
| Host exact route and admission fence | Unchanged | Exact route ownership, duplicate rejection, and native authentication-fence probe passed |
| Client module and injection services | Unchanged | All consumed services resolved and registered once in the accepted candidate |
| Native document preview and file tabs | Unchanged | Native tab loading, editing, saving, switching, closing, and reopening passed |
| Explorer/sidebar slots and file discovery | Compatible | Search, scrolling, layout, workspace switching, and file discovery passed on both platforms |
| Native context menus | Compatible | Zoom, scroll, long-menu placement, and actions passed on both platforms |
| CodeMirror completion and Hover overlays | Compatible | Completion and Hover placement passed under the prescribed native matrix |
| Windows in-app update and automatic relaunch | Compatible | Supported update to rc.3 replaced the application, relaunched Desktop, and preserved CodeCraft activation |
| `shell.overlay` workspace dialogs | Unchanged | Modal focus, placement, and interaction passed natively |
| Settings forms and persistence | Unchanged | Render, mutation, malformed fallback, and restart persistence passed |
| Host file operations and save safety | Unchanged | Workspace operations, conflict fences, and data-safety cases passed |
| Python managed subprocess and Client intelligence | Compatible | Startup/status/completion/navigation/teardown and contained failure passed on both platforms |
| Material icon cache and Explorer rendering | Compatible | Default, installed, offline, theme, expansion, and fallback cases passed on both platforms |
| Unused DSH feature families | Unchanged | No CodeCraft import, injection, route, slot, or protocol dependency |

## Code Changes

Current source-audit conclusion: **No runtime code changes required**.

This conclusion is final for v0.5.2. Exact-source inspection, automated verification, and user-confirmed macOS and Windows acceptance reproduced no runtime incompatibility.

Version changes:

- `docs/version/v0.5.2/design.md`: normalized requirements and architecture plan.
- `docs/version/v0.5.2/validation.md`: completed evidence and native acceptance record.
- `docs/compatibility/dsh-0.2.2-rc.3.md`: reusable Host-upgrade audit record.
- `docs/README.md`: validated-version index entry.
- `scripts/verify-build.mjs`: automated assertions for stable manifest, bundle, exports, Client injections/externals, menu contributions, and Host route identity.
- `package.json`, `package-lock.json`, both README files, and `CHANGELOG.md`: v0.5.2 identity and rc.3 compatibility metadata.

## Verification

### Source audit

| Evidence | Status | Result |
| --- | --- | --- |
| Exact target tag/commit | PASS | `dsh-v0.2.2-rc.3` at `38a6a5c965aa99ab525161efb7cc5cf1fe62fced` |
| Target Node.js engine | PASS | Official target root declares `>=24.9.0`; no evidence requires changing CodeCraft's independent `>=20` floor |
| Public contract inspection | PASS | Required preview, slot, tab, settings, menu, path-open, and exact-route contracts are present |
| rc.2 to rc.3 consumed-package diff | PASS | Consumed package source is unchanged; only package versions advance |
| Runtime compatibility | PASS | Complete prescribed macOS and Windows native acceptance user-confirmed |

### Automated and package evidence

| Check | Status | Evidence |
| --- | --- | --- |
| Focused regression | PASS | 11 Vitest files / 107 tests covering routes, settings, documents, saves, workspace operations/synchronization, icons, Python, HTML, and Java |
| Build and integration verification | PASS | `npm run build && npm run verify`; 1,256 icon definitions plus Host/Client registration contracts |
| Canonical repository gate | PASS | `npm run check`; typecheck, 28 files / 284 tests, build, and verification |
| Packed artifact | PASS | Final `dsh-codecraft@0.5.2`; 95 files; 871,776 packed bytes; 3,358,910 unpacked bytes; required runtime/document files present; zero SVG files |

These automated results were refreshed after selecting rc.3 and again after the final metadata-only v0.5.2 update. The version-only finalization does not change runtime behavior, so the accepted native behavioral evidence remains applicable.

### macOS native evidence

PASS (user-confirmed, 2026-11-14). The complete prescribed startup, activation, editing, data-safety, workspace, icon, settings, UI-placement, language, exit, and restart matrix passed against DSH Desktop `0.2.2-rc.3` and behavior candidate `41eae16ae7ac21c49fe0e81a578233cdc3773009`.

### Windows native evidence

PASS (user-confirmed, 2026-11-14). The complete prescribed matrix passed, including Explorer/Recycle Bin behavior, backslash paths, and the supported in-app update to rc.3 with automatic Desktop relaunch and preserved CodeCraft activation.

## Reusable Host Upgrade Procedure

1. Fix the exact DSH release/tag, source commit, Desktop build, and running Host version.
2. Fix the released CodeCraft baseline and candidate commit; inspect manifest, bundle, exports, Client injections, Host injections, routes, slots, and package identities.
3. Read official release notes and exact-tag public source. Limit the impact map to interfaces CodeCraft actually consumes.
4. Assign a preliminary verdict to every integration surface. Reproduce a failure before changing runtime code.
5. Run focused checks, the canonical repository gate, and packed-artifact inspection.
6. With explicit authorization, apply exactly one candidate source through DSH Plugin Manager to an isolated profile and fully restart Desktop.
7. Inspect Plugin Manager, Host row/schema/`packageDir`, Client registrations, route fence, and crash/activation diagnostics.
8. Run independent macOS and Windows startup, edit/save, workspace, icons, settings, language, menu/overlay, exit, and restart matrices.
9. For a failure, fix only the earliest owning layer, add regression evidence, rebuild/reapply/restart, and rerun every invalidated check.
10. Only after no `Blocked` verdict remains, update the engine range and validated-release map, refresh documentation/package evidence, and make the release decision.

## Release Decision

**PASS.** Exact-source audit, automated regression, final packed-artifact inspection, and user-confirmed macOS and Windows native acceptance pass. DSH Desktop `0.2.2-rc.3` is recorded as compatible; no runtime CodeCraft changes were required.

