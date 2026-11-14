# DSH `0.2.2-rc.3` Compatibility Record

## Target

| Field | Current record |
| --- | --- |
| DSH release/tag | `dsh-v0.2.2-rc.3` |
| DSH source commit | `38a6a5c965aa99ab525161efb7cc5cf1fe62fced` |
| Actual Desktop build | NOT VERIFIED on macOS and Windows |
| Actual running Host version | NOT VERIFIED on macOS and Windows |
| CodeCraft release baseline | `v0.5.1` at `9fa96ac` |
| CodeCraft audit worktree | `b7f48768feb842928e7f7b38a4a27dab8ba46da7` before v0.5.2 documentation changes |
| CodeCraft candidate version/commit | NOT VERIFIED; release metadata remains `0.5.1` until native acceptance |
| Platforms | macOS and Windows, independent evidence required |
| Profile and installation source | NOT VERIFIED; profile mutation not authorized |

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

These are source-audit verdicts, not final release verdicts. `Blocked` means required native evidence has not yet been produced and prevents a compatibility declaration.

| Integration surface | Current verdict | Evidence and next gate |
| --- | --- | --- |
| Manifest compatibility preflight | Blocked | Target metadata is intentionally deferred until both native matrices pass |
| `cordis.patch.yml` bundle and Host lifecycle | Unchanged | Stable `codecraft` row and Cordis apply/effect model remain; inspect active Host row and teardown on Desktop |
| Host exact route and admission fence | Unchanged | Target WebServer retains exact route ownership and duplicate rejection; probe authentication fence on candidate |
| Client module and injection services | Unchanged | All consumed service packages and public services remain in target source; verify real resolution and running state |
| Native document preview and file tabs | Unchanged | Registry, renderer loading, keyed body/action slots, and tab lifecycle inputs remain; execute native tab matrix |
| Explorer/sidebar slots and file discovery | Blocked | Public tab/slot contracts remain, but rc.3 sidebar search/scroll/layout behavior requires native validation |
| Native context menus | Blocked | CodeCraft uses DSH's native registry rather than custom menu positioning; zoom/scroll/long-menu behavior remains native-only |
| CodeMirror completion and Hover overlays | Blocked | No DSH custom positioning API call exists; verify actual placement under rc.3 zoom/scroll |
| Windows in-app update and automatic relaunch | Blocked | rc.3 fixes installation-directory retention; verify the supported update path preserves the selected CodeCraft source and running state |
| `shell.overlay` workspace dialogs | Unchanged | CodeCraft contributes modal dialog content, not a custom positioned menu; verify focus and placement natively |
| Settings forms and persistence | Unchanged | `get`, `mutate`, and `whileServed` contracts remain; verify real render/write/restart persistence |
| Host file operations and save safety | Unchanged | CodeCraft-owned authenticated operations and conflict fences are Host-independent; run regression and native conflict cases |
| Python managed subprocess and Client intelligence | Blocked | Public subprocess composition is present, but real startup/status/completion/teardown must run on both Desktop builds |
| Material icon cache and Explorer rendering | Blocked | CodeCraft-owned cache/API contracts remain; file-tree theme and expansion rendering require both platforms |
| Unused DSH feature families | Unchanged | No CodeCraft import, injection, route, slot, or protocol dependency |

## Code Changes

Current source-audit conclusion: **No runtime code changes required**.

This conclusion is provisional. It is supported by inspection of the exact target tag and CodeCraft's actual call sites, but it must be revised if focused automation or native DSH Desktop testing reproduces an incompatibility. Any correction must list the failing case, owning file, reason, regression test, invalidated evidence, and retest result here.

Documentation changes for the planned version:

- `docs/version/v0.5.2/design.md`: normalized requirements and architecture plan.
- `docs/version/v0.5.2/validation.md`: evidence and native acceptance plan.
- `docs/compatibility/dsh-0.2.2-rc.3.md`: reusable Host-upgrade audit record.
- `docs/README.md`: planned-version index entry.
- `scripts/verify-build.mjs`: automated assertions for stable manifest, bundle, exports, Client injections/externals, menu contributions, and Host route identity.

Release metadata, README support statements, and changelog content are intentionally not changed before required native evidence.

## Verification

### Source audit

| Evidence | Status | Result |
| --- | --- | --- |
| Exact target tag/commit | PASS | `dsh-v0.2.2-rc.3` at `38a6a5c965aa99ab525161efb7cc5cf1fe62fced` |
| Target Node.js engine | PASS | Official target root declares `>=24.9.0`; no evidence requires changing CodeCraft's independent `>=20` floor |
| Public contract inspection | PASS | Required preview, slot, tab, settings, menu, path-open, and exact-route contracts are present |
| rc.2 to rc.3 consumed-package diff | PASS | Consumed package source is unchanged; only package versions advance |
| Runtime compatibility | NOT VERIFIED | Requires automated gates plus real Desktop candidate evidence |

### Automated and package evidence

| Check | Status | Evidence |
| --- | --- | --- |
| Focused regression | PASS | 11 Vitest files / 107 tests covering routes, settings, documents, saves, workspace operations/synchronization, icons, Python, HTML, and Java |
| Build and integration verification | PASS | `npm run build && npm run verify`; 1,256 icon definitions plus Host/Client registration contracts |
| Canonical repository gate | PASS | `npm run check`; typecheck, 28 files / 284 tests, build, and verification |
| Packed artifact | PASS | Provisional `dsh-codecraft@0.5.1`; 95 files; 871,643 packed bytes; 3,358,247 unpacked bytes; required runtime/document files present; zero SVG files |

These automated results were refreshed after selecting rc.3 as the target. The provisional package remains version `0.5.1` because v0.5.2 release metadata is forbidden until both native platform matrices pass. The final metadata change must refresh the canonical gate, package identity, installed candidate version, and startup/open smoke.

### macOS native evidence

NOT VERIFIED. Record OS/architecture, Desktop build, running Host version, candidate SHA/version, profile/source, cases, observations, dates, and evidence links.

### Windows native evidence

NOT VERIFIED. Record OS/architecture, Desktop build, running Host version, candidate SHA/version, profile/source, cases, observations, dates, and evidence links.

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

**BLOCKED.** Automated regression and packed-artifact inspection pass for the rc.3 target, but authorized local candidate application and independent macOS and Windows native acceptance have not been completed. `0.2.2-rc.3` must not yet be recorded as compatible in package metadata or user-facing support statements.

