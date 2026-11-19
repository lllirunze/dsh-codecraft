# dsh-codecraft v0.5.8 Design

## Metadata

| Field | Value |
| --- | --- |
| Status | Implementation in progress; automated checks pass, native and translation-quality acceptance pending |
| Target | `0.5.8` |
| Baseline | `0.5.7` at Git `68c7c275b7fff8455bdb8ee9f087f2989f75be8f` |
| Release type | Planned patch feature exception, as explicitly defined by the planning source |
| Platforms | DSH Desktop on macOS and Windows |
| Source | [v0.5.8 planning design](../../planning/DSH-CodeCraft-v0.5.8-Internationalization-Localization-Design.md) |

## Purpose and observed baseline

Deliver complete CodeCraft-owned UI localization for DSH's eight specified locale IDs: `zh`, `en`, `ja`, `es`, `fr`, `de`, `ru`, and `pt` (the host's Brazilian Portuguese semantics). DSH remains the sole language authority. This is a deliberately assigned patch feature release; no version renumbering is implied.

The 0.5.7 Client injected `locale`, registered `zh` and `en` under `sidebarCodeCraft` in a lifecycle effect, and bound a typed translator. `src/client/i18n/messages/{en,zh}/` composed `core`, `workspace`, `settings`, and `html`; `tests/locales.test.ts` checked their key and placeholder parity. The implementation extends this structure rather than replacing it with the planning document's illustrative `src/i18n/` layout. `package.json` declares DSH `>=0.2.2-rc.3 <0.2.3` and already injects `@deepseek-ai/dsh-client-locale`. The installed CLI reports DSH `0.2.2-rc.5`; Desktop runtime behavior remains unverified.

The existing catalog covers much current UI, but a complete source and interaction inventory is still required. For example, HTML diagnostics and completion descriptions contain English literals in `src/client/languages/html/features/`; ownership and rendering paths must be classified before migration. Technical names, user content, third-party language-server output, and DSH-owned UI remain outside translation. The planning document's font examples must be reconciled with the current Material Icon installation UI rather than assuming a separate font installer exists.

The five additional v0.5.8 corrections below are user-requested scope. Current code has one English `package.json` description; the Material Icons hint exposes registry fallback details; settings render a read-only indentation-character row and worded width options; Python/Java/HTML master switches use inconsistent titles and descriptions; Explorer renders a separate disconnected/refresh card. These are observed code states, not verified Desktop defects.

## Requirement contract

| ID | Required observable result | Failure and boundary case | Primary ownership |
| --- | --- | --- | --- |
| I18N-058-01 | Initial and open views follow DSH's effective language immediately. | No CodeCraft language preference, polling, or private host patch. | `src/client/core/plugin.ts`, locale adapter |
| I18N-058-02 | Eight complete, meaningful dictionaries use the host IDs, including `pt`. | English fallback cannot substitute for a missing supported-language translation. | `src/client/i18n/messages/` |
| I18N-058-03 | Inventory and migrate every CodeCraft-owned visible string, including accessibility copy. | Preserve user content, technical identifiers, host UI, and third-party text. | Client UI and source inventory |
| I18N-058-04 | Editor menus, notices, toolbar, hover shell, empty states, and feedback follow locale. | Source buffer and external hover documentation remain untouched. | `renderer/`, `editor/`, `workspace/native-menus.ts` |
| I18N-058-05 | CodeCraft file operations, dialogs, conflicts, and dirty-state notices follow locale. | File names and paths remain exact plain text. | `workspace/`, `renderer/` |
| I18N-058-06 | Every CodeCraft settings label, hint, option, status, and error follows locale. | Switching locale does not change persisted settings. | `settings/`, `core/plugin.ts` |
| I18N-058-07 | Existing installation UI states and failures follow locale. | Do not invent a font installer; retain current installation behavior. | `settings/CodeCraftSettingsCard.tsx`, icon state |
| I18N-058-08 | CodeCraft-owned intelligence and diagnostic shell messages follow locale. | Keep rule IDs, code, third-party diagnostics, and raw technical details intact. | `languages/`, `renderer/` |
| I18N-058-09 | Switching language updates mounted views and registrations without losing editor, dialog, or async state. | No editor recreation, task replay, duplicate registration, or lost Undo/Redo. | `core/plugin.ts`, UI consumers |
| I18N-058-10 | Dynamic text uses safe named parameters, appropriate plural forms and actual displayed number/date formatting. | Never expose raw placeholders or interpret user input as HTML; preserve technical numbers. | Catalogs and translator boundary |
| I18N-058-11 | Unknown locale, missing key, or locale-service failure produces readable English and actionable diagnostics. | A malformed catalog or unavailable locale service must not crash Desktop. | Locale adapter and activation boundary |
| I18N-058-12 | Localize package description and supported detail metadata through the verified DSH metadata contract. | Keep `dsh-codecraft` and `CodeCraft` identifiers; do not invent manifest fields. | Package locale resources and packaging |
| I18N-058-13 | Project-owned i18n gate rejects invalid keys, resources, placeholders, unreviewed literals, and missing package assets. | Warnings alone do not satisfy CI/release gate. | `scripts/`, `tests/`, `package.json` scripts |
| I18N-058-14 | All eight languages have reviewed terminology, usable layout, keyboard flow, and accessible names. | Long strings must not hide destructive actions or displace focus. | Catalogs, Client CSS/UI |
| I18N-058-15 | Independent macOS and Windows eight-language native acceptance and functional regression pass. | Browser preview and automation alone do not prove Desktop acceptance. | Validation and user acceptance |

## Additional corrections required in v0.5.8

| ID | Required observable result | Failure and boundary case | Primary ownership |
| --- | --- | --- | --- |
| FIX-058-01 | The installed-plugin CodeCraft introduction follows the current DSH language in all eight supported locales. Keep the brand name stable and provide an accurate localized description through the verified package metadata mechanism. | English-only `package.json` text must not be mistaken for localized installed-plugin presentation; unsupported metadata fields must not be invented. | Package metadata resources and DSH Plugin Manager integration |
| FIX-058-02 | The Material Icons help line says only the localized equivalent of “Download Material Icon Theme {version} on demand.” | Do not show npm registry or mirror implementation details in that line; keep installation state, controls, and error feedback intact. | `src/client/i18n/messages/*/settings.ts` |
| FIX-058-03 | Remove the entire read-only “Indentation character” settings row; show width choices as bare numerals such as `2`, with the same underlying values. | Do not change the spaces-only editing rule, stored indentation width, selection behavior, or existing file contents. | `src/client/settings/CodeCraftSettingsCard.tsx`, catalogs |
| FIX-058-04 | Use one consistent title and description pattern for the Python, Java, and HTML master switches in the Programming Languages group, with each description stating its actual scope. Maintain the same pattern in all eight translations. | Do not imply Python semantic services exist for Java/HTML or change feature gates and nested Python options. | Settings catalog and settings UI |
| FIX-058-05 | Replace CodeCraft Explorer's distinct Retry/refresh page with the same ordinary “The current session is not connected.” empty-state presentation, localized in all eight languages. | No stale file tree or repeated retry action; when the session reconnects, the normal Explorer view returns through supported session refresh without losing file operations. Distinguish a connected session with no workspace folder. | `src/client/workspace/ExplorerPage.tsx`, connection state, catalogs |

For FIX-058-04, the source of truth for wording is the real capability: Python enables project-aware semantic intelligence; Java and HTML enable their existing local editing assistance. Final eight-language copy should use a matching short label pattern and a matching one-sentence explanation pattern, without claiming identical backend behavior. For FIX-058-05, the Chinese displayed sentence is exactly `当前会话尚未连接。`; the other seven locales need equivalent natural copy. The desired empty-state layout should match the project's ordinary no-session presentation; implementation must verify the actual DSH host state before removing recovery behavior.

## Architecture and delivery plan

1. **Confirm host contract.** Inspect the exact DSH Desktop `0.2.2-rc.3` locale service, subscription/render behavior, metadata schema, and package loader in the actual candidate. The local structural type and upstream examples are design clues, not runtime proof. Record whether metadata localization and a safe locale-service failure path are supported. A host limitation affecting a mandatory requirement requires an explicit planning revision before release.
2. **Inventory strings and correction surfaces.** Record each CodeCraft-owned literal, source path, user surface, translation key, interpolation variables, and whether it is render-time or registration-time. Cover settings, Explorer, dialogs, editor, context menus, HTML/Python/Java assistance, diagnostics, notices, errors, tooltips, accessible names, and installed-plugin introduction. Classify current English literals such as HTML diagnostics and completion descriptions; exclude syntax, snippets, user text, and external diagnostics. Confirm the ordinary no-session presentation and reconnection contract.
3. **Extend the current Client catalog.** Add `ja`, `es`, `fr`, `de`, `ru`, and `pt` alongside the current four-domain `en`/`zh` layout. Add domains only for actual ownership needs. Keep `en` canonical and the `MessageKey`/`Translate` contract. Register all eight dictionaries once in the existing Client effect. Use DSH's effective locale and rendering/subscription contract; update only captured text registrations when needed. Keep editing, document state, and Host API independent of locale.
4. **Format and degrade safely.** Preserve named placeholder parity; use validated language-specific plural forms or host-supported formatting where grammar needs them. Treat inserted paths and file names as text. Use `Intl` only for displayed user-facing values. Diagnose a missing key with locale and key, then show a readable English fallback. Confirm a supported public way to render safely if locale injection is unavailable; do not use private host state.
5. **Metadata and package.** Keep package metadata resources separate from UI dictionaries. Add `locale/*.json` and update `files`/exports only as the verified DSH loader requires. Check the actual npm tarball. No runtime translation network request is permitted; an existing optional asset download remains independent.
6. **Apply UI corrections and gate.** Simplify the Material Icons hint, remove the indentation-character row, render numeric width options, unify the three language-switch titles and descriptions, and align Explorer's disconnected presentation with the ordinary no-session view. Preserve underlying settings and connection behavior. Add a repository `check:i18n` command to validate eight catalogs, duplicate/extra/missing keys, placeholders, empty/control-character values, reviewed literal inventory, and build/package inclusion; wire it into the canonical check. Have translations and narrow-window layout reviewed by a reader of each target language. Run focused tests, full regression, candidate safety validation, then independent macOS and Windows acceptance.

## Scope and completion

No new programming language, language server, DSH UI translation, CodeCraft language selector, online translation, user-code translation, global theme redesign, or extra locale is planned. Technical brands, paths, identifiers, syntax, external documentation, raw logs, and user input remain unmodified. All `I18N-058-01` through `I18N-058-15` and `FIX-058-01` through `FIX-058-05` are mandatory; completion requires the corresponding evidence in [validation.md](validation.md), including eight-language acceptance on both platforms. This document records a design, not implementation or acceptance.
