# DSH CodeCraft v0.5.4 Validation Plan

| Field | Value |
| --- | --- |
| Target version | 0.5.4 |
| Baseline | 0.5.3 at `be3990b17e59c9d805d3f18120a768d9bd92fc0a` |
| Platforms | DSH Desktop `0.2.2-rc.3` on macOS and Windows |
| Status | Implementation, automated validation, Desktop candidate application, and native macOS/Windows acceptance PASS; release metadata finalized for 0.5.4 |
| Design | [design.md](design.md) |

## Evidence Rules

Use only `PASS`, `FAIL`, `BLOCKED`, `NOT VERIFIED`, and `NOT APPLICABLE` for individual evidence. `PASS` requires an executed command or a user-observed native result against the current candidate. Automation cannot prove DSH Desktop rendering, restart persistence, platform compatibility, or visible interaction. Production or test changes invalidate affected automation; replacing Host or Client code invalidates runtime and native evidence.

Every checklist item starts unchecked. Native items may be checked only from the user's explicit observations on the final applied candidate.

## Current Gate Record

| Gate | State | Evidence |
| --- | --- | --- |
| G0 Scope | PASS | Planning fixes v0.5.4, macOS/Windows, `SETTINGS-054-01` through `SETTINGS-054-06`, and explicit exclusions |
| G1 Requirements | PASS | English `design.md` and this evidence plan preserve all requirement and `T054-*` identifiers |
| G2 Architecture | PASS | Disclosure stays Client-local; the Python group uses DSH's existing volatile Config contract and the Host provider reads its current snapshot without adding a key, route, registry, or protocol |
| G3 Implementation | PASS | Language blocks and disclosure are complete; Python writes are accepted by DSH and the Host observes enable changes without remounting |
| G4 Automated regression | PASS | Bug-focused 3 files / 35 tests, canonical 30 files / 301 tests, build verification, and package inspection passed |
| G4b Local Desktop candidate | PASS | User confirmed the complete Desktop safety gate passed; read-only inspection confirms DSH `0.2.2-rc.3`, profile `desktop`, exactly one local link to this repository, and resolved candidate package `0.5.3` before the release-only metadata bump |
| G5 Native acceptance | PASS | On 2026-11-15 the user confirmed the complete required validation, including both macOS and Windows matrices, passed |
| G6 Release | PASS | User explicitly authorized the v0.5.4 release workflow; final Git commit, push, and annotated tag evidence is recorded during release execution |

## Requirement Traceability

| Requirement | Automated evidence | Desktop evidence | Current state |
| --- | --- | --- | --- |
| `SETTINGS-054-01` | Layout descriptor and source/build checks show no component-owned duplicate heading | T054-01 through T054-03, T054-24 | PASS |
| `SETTINGS-054-02` | Peer group order and localized title tests | T054-04, T054-05, T054-23 | PASS |
| `SETTINGS-054-03` | Python/Java/HTML order, uniqueness, detail capability, disclosure transition, accessibility, and mutation-path tests | T054-05, T054-06, T054-08, T054-19, T054-24 | PASS |
| `SETTINGS-054-04` | Exact key/default, mixed-value resolver, write rejection, and unchanged schema tests | T054-07, T054-09, T054-14 through T054-16, T054-18 | PASS |
| `SETTINGS-054-05` | Settings plus Python/Java/HTML, document, save, and workspace regression | T054-10 through T054-13, T054-17, T054-22 | PASS |
| `SETTINGS-054-06` | Focused tests, `npm run check`, package inspection, and activation checks | T054-20 through T054-24 on both platforms | PASS |

## Focused Automated Plan

- [x] The settings page has peer `Explorer Icons`, `Indentation`, and `Programming Languages` groups with no component-owned heading group.
- [x] Distinct Python, Java, and HTML blocks appear exactly once in that order, and every Enable row remains visible.
- [x] Python is the only current language with declared detail controls and the only language that renders a disclosure arrow.
- [x] Python begins collapsed, expands to the existing semantic-completion/interpreter/Pyright controls, and collapses again without changing settings.
- [x] The disclosure button exposes localized accessible text, `aria-expanded`, `aria-controls`, keyboard activation, and visible focus styling.
- [x] English and Simplified Chinese include the new group and disclosure labels while existing switch labels and descriptions remain unchanged.
- [x] Existing keys remain `pythonIntelligence.enabled`, `javaEditingAssistance.enabled`, and `htmlEditingAssistance.enabled` with default `true`.
- [x] A mixed legacy snapshot such as Python off, Java on, HTML off resolves without reset.
- [x] Writes target only the selected language path and do not mutate sibling settings.
- [x] Rejected and throwing writes keep the last accepted value and expose the existing error state.
- [x] The existing Python group is DSH-editable, its volatile snapshot resolves safely, and an accepted Enable change is observed by the Host without remounting.
- [x] Indentation 2/4, Auto Save 10/30/60/120, Python detail values, and malformed-input fallback remain unchanged.
- [x] Python, Java, HTML, document/save, workspace, icon, and settings regressions pass after the disclosure change.
- [x] No CodeCheck string, control, group, placeholder, new dependency, protocol change, key migration, or parallel settings path is introduced.

## Acceptance Matrix

### Settings structure and compatibility

- [x] T054-01: opening CodeCraft settings succeeds with no missing control or error.
- [x] T054-02: `Configure the CodeCraft editor, ...` appears only in the primary DSH-owned description, with no smaller duplicate.
- [x] T054-03: the redundant heading wrapper is absent and every previously valid setting remains accessible.
- [x] T054-04: `Indentation` and `Programming Languages` / `编程语言` are peer sections.
- [x] T054-05: the language section has distinct Python, Java, and HTML blocks; all three master switches remain directly visible, while Python details start hidden.
- [x] T054-06: each language has exactly one interactive master switch; only Python has a disclosure arrow, which expands and collapses its three existing detail controls by pointer and keyboard with an accurate accessible label.
- [x] T054-07: an upgrade snapshot with Python off, Java on, and HTML off retains those exact values.
- [x] T054-08: disabling and re-enabling each master switch changes only its existing module behavior.
- [x] T054-09: language values persist after a full DSH Desktop restart and match actual behavior.
- [x] T054-10: Python disabled does not affect Java or HTML assistance.
- [x] T054-11: Java disabled does not affect Python or HTML assistance.
- [x] T054-12: HTML disabled does not affect Python or Java assistance.
- [x] T054-13: a disabled language assistance module still permits opening, editing, Undo/Redo, and saving that language's file.
- [x] T054-14: Indentation retains only the existing 2- and 4-space choices and behavior.
- [x] T054-15: Auto Save enabled state and 10/30/60/120-second values remain unchanged and persistent.
- [x] T054-16: font, size, appearance, Python detail, icon, and all other existing configuration values are not reset or lost.
- [x] T054-17: entering settings and changing groups with a dirty file preserves content, dirty state, and native tabs.
- [x] T054-18: a rejected or failed persistent write reports failure and returns the control to the accepted value.
- [x] T054-19: rapidly toggling language switches and repeatedly expanding/collapsing Python causes no cross-language state, duplicate registration, configuration write, or stale visible result.
- [x] T054-20: the complete applicable matrix passes on macOS.
- [x] T054-21: the complete applicable matrix passes independently on Windows.
- [x] T054-22: workspace tree, Material icons, document breadcrumbs, and disconnected recovery retain v0.5.0-v0.5.3 behavior.
- [x] T054-23: no CodeCheck group, entry, empty card, or placeholder is visible.
- [x] T054-24: reloading the plugin settings page does not restore duplicate headings or switches, and Python details return to their safe collapsed presentation default.

### Cross-platform native smoke

- [x] macOS light and dark themes render all settings groups, rows, Switch controls, inputs, and errors correctly.
- [x] Windows light and dark themes render the same hierarchy and controls.
- [x] Paths containing spaces and Chinese characters do not affect settings, file opening, editing, or saving.
- [x] Offline use and unavailable optional Python runtime leave the settings page and ordinary editing/saving usable.
- [x] DSH Desktop starts, opens a native CodeCraft file tab, edits, Undo/Redo, saves, closes, reopens, exits, and restarts without a CodeCraft-attributable failure.

## Canonical Automated and Package Gate

- [x] Run the new settings-layout and existing settings Vitest files first; record exact file and test counts.
- [x] Run affected Python, Java, HTML, document/save, workspace, and icon regression files after the final source change.
- [x] Run `npm run check`; record typecheck, full test count, build, and verification results.
- [x] Run `npm pack --dry-run --ignore-scripts --json`; confirm the current development identity and required files without presenting it as the unreleased `0.5.4` package identity.
- [x] Confirm the packed artifact contains `package.json`, `cordis.patch.yml`, Host/Client entries and declarations, protocol declarations, README files, changelog, notices, license, and the new settings-layout declaration.
- [x] Confirm stable package, bundle, Host, Client, preview, settings, action, and route identities remain unchanged.

## Superseded Automated Evidence

The following results passed before the user added per-language blocks and Python disclosure behavior. They are retained for audit history but are stale and do not satisfy G3 or G4 for the revised candidate.

| Check | Command | Status | Evidence |
| --- | --- | --- | --- |
| Focused settings | `npx vitest run tests/settings-layout.test.ts tests/settings.test.ts` | PASS | 2 files, 19 tests |
| Type contracts | `npm run typecheck` | PASS | TypeScript completed with exit code 0 |
| Affected regression | `npx vitest run tests/settings-layout.test.ts tests/settings.test.ts tests/python-intelligence.test.ts tests/python-navigation.test.ts tests/python-docstrings.test.ts tests/python-indentation.test.ts tests/python-environment.test.ts tests/python-platform.test.ts tests/java-lightweight.test.ts tests/html-editing.test.ts tests/html-productivity.test.ts tests/html-diagnostics.test.ts tests/html-refactoring.test.ts tests/document.test.ts tests/save-queue.test.ts tests/workspace-sync.test.ts tests/workspace-navigation.test.ts tests/material-icon-client.test.ts tests/file-icons.test.ts` | PASS | 19 files, 185 tests |
| Canonical gate | `npm run check` | PASS | Typecheck; 30 files / 297 tests; build; 1,256 Material icons; Host exports and Client registration with 20 external requires |
| Package inspection | `npm pack --dry-run --ignore-scripts --json` | PASS | Current development identity `dsh-codecraft@0.5.3`; 99 files; 878,142 bytes packed; 3,383,715 bytes unpacked; required entries and `lib/client/settings/settings-layout.d.ts` present |
| Scope and identity audit | `git diff -- package.json package-lock.json cordis.patch.yml src/index.ts src/client/core/plugin.ts src/protocol.ts`; required-file and source searches; `git diff --check` | PASS | No stable identity or metadata diff; required files present; no CodeCheck or obsolete component-heading marker; no whitespace error |

## Current Automated Evidence

| Check | Command | Status | Evidence |
| --- | --- | --- | --- |
| Revised focused settings | `npx vitest run tests/settings-layout.test.ts tests/settings.test.ts` | PASS | 2 files, 21 tests; includes detail capability and safe expand/collapse transitions |
| Revised type contracts | `npm run typecheck` | PASS | TypeScript completed with exit code 0 after the disclosure change |
| Revised affected regression | `npx vitest run tests/settings-layout.test.ts tests/settings.test.ts tests/python-intelligence.test.ts tests/python-navigation.test.ts tests/python-docstrings.test.ts tests/python-indentation.test.ts tests/python-environment.test.ts tests/python-platform.test.ts tests/java-lightweight.test.ts tests/html-editing.test.ts tests/html-productivity.test.ts tests/html-diagnostics.test.ts tests/html-refactoring.test.ts tests/document.test.ts tests/save-queue.test.ts tests/workspace-sync.test.ts tests/workspace-navigation.test.ts tests/material-icon-client.test.ts tests/file-icons.test.ts` | PASS | 19 files, 187 tests |
| Revised canonical gate | `npm run check` | PASS | Typecheck; 30 files / 299 tests; build; 1,256 Material icons; Host exports and Client registration with 20 external requires |
| Revised package inspection | `npm pack --dry-run --ignore-scripts --json` | PASS | Current development identity `dsh-codecraft@0.5.3`; 99 files; 879,240 bytes packed; 3,388,476 bytes unpacked; updated Client bundle and `settings-layout.d.ts` present |
| Revised scope/accessibility/identity audit | Stable-identity diff, required-file checks, disclosure source/build search, excluded-scope search, and `git diff --check` | PASS | No stable identity or metadata diff; `aria-expanded`, `aria-controls`, localized labels, disclosure logic, and declarations are built; no CodeCheck, duplicate heading marker, or whitespace error |

## Python Settings Write Fix Evidence

The user reported that toggling Python Intelligence produced `DSH did not accept this settings change. Try again.` Investigation found that the existing Python group was the only editable language group not marked volatile, so DSH rejected its nested Config-form mutation. The correction marks that same group volatile, resolves its stable reference defensively, and makes the Host Python provider read the current accepted snapshot.

| Check | Command | Status | Evidence |
| --- | --- | --- | --- |
| Bug-focused regression | `npx vitest run tests/settings.test.ts tests/python-platform.test.ts tests/python-intelligence.test.ts` | PASS | 3 files, 35 tests; covers DSH-editable Python schema metadata, volatile snapshot parsing, rejected Client writes, and Host observation of an Enable change without remounting |
| Type contracts | `npm run typecheck` | PASS | TypeScript completed with exit code 0 after the Host/config correction |
| Final canonical gate | `npm run check` | PASS | Typecheck; 30 files / 301 tests; build; 1,256 Material icons; Host exports and Client registration with 20 external requires |
| Final package inspection | `npm pack --dry-run --ignore-scripts --json` | PASS | Current development identity `dsh-codecraft@0.5.3`; 99 files; 879,424 bytes packed; 3,388,368 bytes unpacked; required Host/Client/config declarations present |

## Local DSH Desktop Candidate Gate

The user confirmed the complete candidate gate passed. Read-only release inspection also confirmed the macOS profile facts below before the version-only metadata bump.

- [x] Record candidate Git SHA/worktree state, package version, DSH Desktop version/build, platform, profile, expected installation source, and absolute repository path.
- [x] Confirm exactly one CodeCraft source is selected and no npm/local-link conflict exists.
- [x] Apply the candidate through DSH Plugin Manager and retain its receipt.
- [x] Fully restart DSH Desktop after replacing Client code.
- [x] Confirm Plugin Manager reports installed, enabled, running, expected source, and expected package version.
- [x] Confirm Host row `include:codecraft`, Config schema, and `packageDir` resolve from the expected source.
- [x] Confirm Client preview, settings, Explorer, dialogs, native menus, HTML action, and breadcrumb registrations appear exactly once.
- [x] Confirm unauthenticated `/codecraft/api` reaches the structured authentication fence rather than a generic 404.
- [x] Confirm no activation failure, blank page, reload loop, unhandled rejection, duplicate registration, or candidate-attributable crash.
- [x] Confirm normal startup, settings, open/edit/save, normal exit, and restart before the full acceptance matrix.

## Required Native Evidence Record

The accepted behavioral candidate was source revision `e14ca4ba9b317d76f52ee0d18a86105c08b56c09` with package metadata `0.5.3`; the subsequent `0.5.4` changes are release metadata and documentation only. On 2026-11-15 the user explicitly confirmed the complete prescribed validation passed, including the macOS and Windows matrices, local candidate application, restart, runtime activation checks, and every T054 case. No unreported device detail, Windows path, receipt text, screenshot, or GUI log is invented here.

Read-only macOS release inspection confirmed DSH CLI `0.2.2-rc.3`, profile `desktop`, a single `dsh-codecraft` dependency linked to `/Users/lllirunze/Documents/dsh-creator-mode/dsh-codecraft`, one bundle entry, resolved package `0.5.3`, and the expected `codecraft` Host configuration before the version-only metadata bump.

## Final Release Metadata Evidence

The 0.5.4 finalization changes only package/lockfile version fields, Changelog, README release claims, documentation index, and acceptance records. It does not change runtime behavior, so the accepted native behavior remains current while package identity and automation are refreshed.

| Check | Command | Status | Evidence |
| --- | --- | --- | --- |
| Final canonical gate | `npm run check` | PASS | `dsh-codecraft@0.5.4`; typecheck; 30 files / 301 tests; build; 1,256 Material icons; Host exports and Client registration with 20 external requires |
| Final package inspection | `npm pack --dry-run --ignore-scripts --json` | PASS | `dsh-codecraft@0.5.4`; 99 files; 879,664 bytes packed; 3,388,939 bytes unpacked; all required Host, Client, manifest, documentation, changelog, notice, and license files present |
| Whitespace gate | `git diff --check` | PASS | No whitespace errors after release metadata finalization |

## Release Gate

`PASS`. All six requirements, all 24 mandatory acceptance cases, the local candidate activation/restart checks, and independent macOS/Windows acceptance passed. The user explicitly authorized the v0.5.4 repository release workflow. GitHub Release publication remains a manual user action after the release commit and annotated tag are pushed.

