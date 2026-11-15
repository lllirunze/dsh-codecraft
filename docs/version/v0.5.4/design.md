# DSH CodeCraft v0.5.4 Design

| Field | Value |
| --- | --- |
| Target version | 0.5.4 |
| Baseline | 0.5.3 at `be3990b17e59c9d805d3f18120a768d9bd92fc0a` |
| Release type | Patch release: plugin-settings information architecture and compatibility refinement |
| Platforms | DSH Desktop on macOS and Windows |
| DSH compatibility baseline | `>=0.2.2-rc.3 <0.2.3`; native acceptance targets DSH Desktop `0.2.2-rc.3` |
| Status | Implementation, automated validation, Desktop candidate checks, and native macOS/Windows acceptance passed |
| Planning source | [`DSH-CodeCraft-v0.5.4-Plugin-Settings-UI-Refinement.md`](../../planning/DSH-CodeCraft-v0.5.4-Plugin-Settings-UI-Refinement.md) |

## Purpose

v0.5.4 refines only the CodeCraft plugin settings page. It removes the smaller duplicate CodeCraft heading and description, adds a first-level `Programming Languages` / `编程语言` section beside `Indentation`, and places the existing Python, Java, and HTML assistance master switches in that section. Existing configuration keys, accepted values, persistence, language behavior, and all unrelated settings remain unchanged.

The planning source asks for special regression against DSH `0.2.2-rc.2`. The checked-out package and the completed v0.5.2 compatibility record have since established `0.2.2-rc.3` as the supported minimum and native baseline. v0.5.4 therefore uses the current `>=0.2.2-rc.3 <0.2.3` contract and does not reintroduce rc.2 support.

## Current Baseline Analysis

The settings page is a Client-owned surface registered once through the public `plugins.item` slot in `src/client/core/plugin.ts`. DSH owns the plugin page's primary title and renders the component's `summary` view as the primary description. The component then repeats the same title and description in its `settings` view through `.dsh-codecraft-settings-heading`; this is the smaller duplicate required to be removed.

`Indentation`, Python, Java, HTML, and Explorer Icons are already peer `<section>` elements inside the same supported settings component. No separate DSH nested-schema API is required: the target hierarchy can be represented by one peer section named `Programming Languages`. This remains ordinary slot composition and does not inspect, hide, or mutate Host DOM.

The authoritative persistent keys and defaults are:

| Setting | Existing key | Existing default |
| --- | --- | --- |
| Python master assistance | `pythonIntelligence.enabled` | `true` |
| Java master assistance | `javaEditingAssistance.enabled` | `true` |
| HTML master assistance | `htmlEditingAssistance.enabled` | `true` |
| Python semantic completion | `pythonIntelligence.completion` | `true` |
| Python interpreter path | `pythonIntelligence.interpreterPath` | empty / auto-detect |
| Pyright server path | `pythonIntelligence.serverPath` | empty / bundled |
| Indentation width | `editor.indentation.indentSize` | `2` |

`EditorSettingsStore` reads accepted Config-form snapshots, serializes writes through the existing `mutate` API, and restores the last accepted snapshot with an error state after a rejected or failed write. Auto Save remains in the shared configuration model even though it is not currently rendered by this custom page. No key encodes UI-group placement, so no data migration is required.

## Requirement Matrix

| Requirement | Observable result | Negative and compatibility cases | Ownership |
| --- | --- | --- | --- |
| `SETTINGS-054-01` | The DSH-owned primary CodeCraft title and description remain; the component-owned duplicate heading is absent | No hidden DOM, CSS selector override, observer, empty wrapper, or lost control | Client settings component and obsolete heading styles |
| `SETTINGS-054-02` | `Programming Languages` / `编程语言` is a peer of `Indentation` | It is not a stored value, master switch, nested empty directory, or CodeCheck placeholder | Client settings layout and locales |
| `SETTINGS-054-03` | Python, Java, and HTML appear as distinct blocks in that order; every Enable row is always visible; only languages with detail controls show a disclosure arrow | No duplicate registrations or second state source; Python details are collapsible, while Java and HTML have no empty disclosure control | Client settings component using the existing settings store plus ephemeral disclosure state |
| `SETTINGS-054-04` | Existing mixed language values and all editor values resolve and write under the same paths | Missing/malformed values keep defensive defaults; rejected writes keep accepted state; DSH accepts Python writes and the Host reads the current volatile value | Shared resolver, Host Config schema and Python provider; existing keys remain unchanged |
| `SETTINGS-054-05` | Each master switch retains its existing language-specific effect while basic editing/saving and sibling languages remain usable | Opening settings or changing layout does not remount language services, mutate documents, tabs, drafts, Explorer state, or unrelated settings | Existing language adapters, renderer, document, and workspace owners remain unchanged |
| `SETTINGS-054-06` | Automated layout/compatibility regression passes and the final candidate is accepted on macOS and Windows | Native rendering, persistence, restart, write failure, rapid toggles, activation, and prior-version surfaces require explicit evidence | Focused Vitest, canonical gate, package inspection, Desktop candidate gate, and user acceptance |

## User-Visible Structure

```text
DSH Desktop / Plugins / CodeCraft
├── CodeCraft primary title and description (DSH-owned, one occurrence)
├── Explorer Icons
├── Indentation
└── Programming Languages / 编程语言
    ├── Python
    │   ├── Enable Python Intelligence        [Switch] [Disclosure arrow]
    │   └── Expanded details
    │       ├── Semantic completion
    │       ├── Python interpreter path
    │       └── Pyright Language Server path
    ├── Java
    │   └── Java Editing Assistance           [Switch]
    └── HTML
        └── Enable HTML Editing Assistance    [Switch]
```

The three language blocks preserve the mandatory Python, Java, HTML order. Every master Enable row is always visible. Python starts collapsed and exposes its existing three detail controls when the disclosure arrow is activated; activating the same control again collapses them. The disclosure button reports `aria-expanded`, identifies its controlled detail region, has localized expand/collapse labels, and supports ordinary keyboard activation. Java and HTML currently have no detail controls, so they render no disclosure arrow or empty detail region. Existing setting labels, hints, keys, and behavior remain unchanged.

## Architecture and Placement

| Capability | Category | Runtime | Concrete path | Reused contract and reason |
| --- | --- | --- | --- | --- |
| Primary settings metadata | Shared plugin UI | Client | `src/client/core/plugin.ts` | Existing `plugins.item` registration remains the single DSH-owned title/summary source |
| Settings hierarchy and disclosure interaction | Language-related presentation | Client | `src/client/settings/CodeCraftSettingsCard.tsx` | Existing custom settings component owns per-language blocks and local expand/collapse state without Host DOM access or persistent configuration |
| Deterministic language order and detail capability | Language-related presentation | Client/shared UI data | `src/client/settings/settings-layout.ts` | A small immutable descriptor makes the required order, detail availability, and safe disclosure transitions testable without creating another registry |
| Localized section title | Presentation | Client | `src/client/locales.ts` | Existing namespace provides English and Simplified Chinese strings |
| Obsolete duplicate-heading styles | Presentation | Client | `src/client/theme.ts` | Remove only styles no longer referenced after the duplicate heading is removed |
| Live Python settings | Language runtime configuration | Host/shared boundary | `src/config.ts`, `src/settings/schema.ts`, `src/index.ts`, `src/host/intelligence/manager.ts`, `src/host/languages/python/provider.ts` | Mark the existing Python group volatile so DSH Config Forms accepts nested writes, unwrap its stable snapshot defensively, and read the current value without remounting the Host plugin |
| Focused evidence | Test | Node/Vitest | `tests/settings-layout.test.ts`, `tests/settings.test.ts` | Verify layout identity/order, keys/defaults, accepted mixed values, mutation paths, and rejected-write preservation |

The Host configuration declaration changes only the editability metadata on the existing `pythonIntelligence` group; no key, accepted value, default, protocol type, package dependency, route, slot identity, or lifecycle registration changes. The Python provider reads the latest accepted snapshot so disabling or re-enabling intelligence takes effect without a Host remount. Client code continues to import no Node API. The existing single `plugins.item` registration and Config-form binding remain effect-scoped and duplicate-safe.

## Settings and Data Flow

1. DSH serves the existing `codecraft` Config form.
2. `EditorSettingsStore` resolves the existing schema snapshot defensively.
3. The settings component projects that one snapshot into peer visual sections.
4. A language switch writes its existing path through the same ordered `form.mutate` call.
5. The Python group is a Schemastery volatile field, so DSH validates, persists, and commits the nested write into its stable live reference.
6. DSH publishes the accepted snapshot; a rejection or exception restores the accepted state and shows the existing failure message.
7. Host-side Python operations resolve the current live snapshot rather than retaining the value from plugin startup.

Moving a row between visual sections never changes steps 1–5. No migration, compatibility alias, or duplicated state is introduced.

Disclosure state is intentionally ephemeral Client presentation state. Expanding or collapsing a language does not call `form.mutate`, change an Enable value, start or stop a language service, or persist a new key. A language without declared details cannot enter an expanded state. Collapsing Python hides only its detail controls; its accepted settings remain in the existing Config-form snapshot.

## Failure Handling, Safety, and Lifecycle

- Loading, unavailable, read-only, saving, and rejected-write states retain their existing behavior.
- Missing or malformed older settings continue to resolve to safe defaults in `src/settings/schema.ts`.
- A missing, malformed, or unreadable volatile snapshot also resolves to safe defaults; a valid snapshot is trimmed and validated exactly like a plain legacy object.
- The page adds no asynchronous work, retries, timers, listeners, process sessions, routes, or teardown duties.
- Disclosure controls use native buttons, localized accessible names, `aria-expanded`, `aria-controls`, focus-visible styling, and a visual chevron rotation; no pointer-only interaction is introduced.
- Python detail controls begin collapsed on each settings-component mount. Expansion is independent of Python's enabled value, so users can inspect configured paths while assistance is disabled.
- Disabling an optional language capability continues to leave ordinary opening, editing, Undo/Redo, and saving available.
- Entering, leaving, or reloading the settings page does not interact with documents, drafts, tabs, workspaces, Explorer state, or language-service lifecycle.
- Stable package, bundle, Host, Client, preview, settings, action, and route identities remain unchanged.
- No CSS/DOM hiding, DOM traversal, `MutationObserver`, unpublished DSH import, or Host-source modification is permitted.

## Explicit Exclusions

- CodeCheck groups, entries, placeholders, rules, or behavior.
- New CSS, JavaScript, or other language switches.
- New per-feature Tag Completion, Attribute Completion, Auto Close Tags, or similar controls.
- Changes to Python, Java, or HTML editing algorithms, defaults, lifecycle, or runtime requirements.
- Changes to Auto Save, fonts, font sizes, themes, general bracket behavior, or Indentation values.
- A new persistence layer, settings window, schema-path migration, DSH source change, or DOM patch.
- v0.5.5 editor visual refinement or any later-version work.
- Package/lockfile version changes, changelog release entries, commits, tags, GitHub Release publication, or npm publication during feature implementation.

## Implementation Sequence

1. Add the immutable settings-layout descriptor and focused tests for peer groups, language order, detail capability, and expand/collapse transitions.
2. Remove the duplicate component heading and consolidate the three language blocks under `Programming Languages`.
3. Keep every Enable row visible, add a disclosure button only to Python, and render its detail controls only while expanded.
4. Add localized section/disclosure labels, accessible chevron styles, and remove only obsolete heading CSS.
5. Extend settings tests for exact legacy keys/defaults, mixed-value preservation, isolated writes, and rejected-write rollback.
6. Run focused tests, typecheck, canonical regression, packed-artifact inspection, and the authorized portions of the local Desktop safety protocol.
7. Hand the complete macOS/Windows settings and regression matrix to the user for native acceptance.

## Definition of Done

- `SETTINGS-054-01` through `SETTINGS-054-06` are implemented without changing persistence keys or language behavior.
- The DSH-owned primary CodeCraft title/description is the only title/description pair.
- `Programming Languages` is a peer of `Indentation`; distinct Python, Java, and HTML blocks appear once in that order and keep every Enable row visible.
- Python alone shows an accessible disclosure arrow and preserves all detail controls behind it; Java and HTML show no empty arrow or detail region.
- CodeCheck and all later-version scope are absent.
- Focused tests, `npm run check`, and packed-artifact inspection pass on the final source candidate.
- With explicit profile-mutation authorization, the final candidate is applied and inspected through DSH Plugin Manager; otherwise that gate remains `BLOCKED` or `NOT VERIFIED`.
- The user confirms the complete native macOS and Windows acceptance matrix.

