# dsh-codecraft v0.5.7 Design

## Metadata

| Field | Value |
| --- | --- |
| Status | Implemented; automated validation passed; native acceptance pending |
| Target | `0.5.7` |
| Baseline | `0.5.6` at Git `2c9e6fc89a5c048786f0dc5549f3c913054ee51b` |
| Release type | Patch refactoring |
| Platforms | DSH Desktop on macOS and Windows |
| Scope | Bilingual message architecture, type safety, and localization consistency |

## Purpose

This release refactors CodeCraft's existing Simplified Chinese and English copy without adding product behavior. The current runtime already registers both languages through DSH's Locale service, but all messages live in one large file, most translation callbacks accept arbitrary strings, placeholder drift is not checked, and a small number of fallback labels and transport errors bypass the catalog.

Version 0.5.7 keeps DSH Locale as the only runtime localization system. It splits messages by language and product domain, introduces a shared typed translation contract, validates key and placeholder parity, and routes remaining locale-sensitive Client copy through that contract. Existing editing, saving, workspace, language assistance, settings, and lifecycle behavior must remain unchanged.

## Current Baseline

- `src/client/locales.ts` contains both complete dictionaries in one file: 245 Chinese messages followed by 245 English messages.
- English is structurally constrained by `Record<keyof typeof zh, string>`, but the rest of the Client generally receives `(key: string, ...)`, so invalid translation keys can compile.
- DSH Locale performs runtime registration, language selection, interpolation, and reactive rendering. Adding i18next would duplicate those responsibilities and create two language sources of truth.
- Message placeholders such as `{line}`, `{count}`, and `{version}` are not checked for parity between languages.
- The plain-text language label and several Client transport fallbacks are hard-coded in Chinese.
- Host and external-service errors can contain technical details. Those details remain useful diagnostics, but known Client transport failures need localized summaries before display.

## Requirements

| ID | Required behavior | Negative and failure behavior | Ownership |
| --- | --- | --- | --- |
| I18N-01 | Keep DSH Locale as the single runtime language selector and interpolation service. | Do not add i18next, a second locale state, a language setting, or a runtime dependency. | Client integration |
| I18N-02 | Store Chinese and English messages in separate language directories and split each language into matching `core`, `workspace`, `settings`, and `html` domain modules. | Do not retain a second monolithic dictionary or duplicate messages across domains. | Client i18n catalogs |
| I18N-03 | Export one canonical `MessageKey` union and `Translate` function type, then use them at Client component and controller boundaries. | Literal or mapped keys outside the catalog must fail type checking; DSH's broader service contract must remain compatible. | Client i18n contract and consumers |
| I18N-04 | Guarantee identical key sets and placeholder sets for English and Chinese. | Missing, extra, or placeholder-drifted messages must fail focused validation instead of falling back silently. | Catalog composition and tests |
| I18N-05 | Localize the plain-text status label and known browser/API transport fallbacks through catalog keys. | Locale-sensitive Chinese or English fallback copy must not be embedded in Client logic; unknown Host details may remain a safe diagnostic fallback. | Language/status and Client API presentation |
| I18N-06 | Preserve all existing visible wording, interpolation values, locale switching behavior, and feature behavior except where a previously hard-coded Chinese fallback now follows the active language. | No editor, save, workspace, settings, language-assistance, route, protocol, or persistence semantics may change. | All Client consumers and regression tests |
| I18N-07 | Keep the localization system offline, Client-only, lifecycle-safe, and compatible with the existing DSH registration namespace. | No network catalog loading, Node API in browser code, new route, new storage, or registration identity is allowed. | Client architecture and build verification |

## Architecture

### Catalog layout

The existing flat DSH dictionary format remains the runtime boundary, while source ownership becomes modular:

```text
src/client/i18n/
  contract.ts
  index.ts
  messages/
    en/{core,workspace,settings,html}.ts
    zh/{core,workspace,settings,html}.ts
```

Each domain exports a flat object so existing keys and DSH interpolation semantics do not change. `messages/en/index.ts` composes the canonical English catalog; the Chinese composition is checked against its key type. `i18n/index.ts` exports the two DSH-ready dictionaries and the typed translation contract.

Domain ownership is deterministic:

- `core`: editor shell, notices, status, save conflicts, navigation, and generic actions;
- `workspace`: Explorer and document breadcrumbs;
- `settings`: all CodeCraft settings copy;
- `html`: HTML tools and browser preview copy.

### Typed translation boundary

`MessageKey` is derived from the canonical English catalog. `Translate` accepts only `MessageKey` plus DSH-compatible interpolation values. Client props, controller options, mapping tables, and `DocumentBodyProps.t` use this shared type. The raw DSH `LocaleService` remains structurally broad because it is a host contract; one adapter binds and narrows CodeCraft's namespace after its dictionaries are registered.

Dynamic mappings such as unsupported-file reasons and HTML result codes are explicitly typed or narrowed before translation. Unknown external codes use a known generic catalog key rather than becoming an unchecked translation key.

### Parity and placeholders

TypeScript enforces key parity at build time. A focused test also compares the runtime key sets and extracts `{placeholder}` tokens from every message in both languages. This catches accidental missing, extra, or renamed placeholders even when the strings themselves remain valid.

### Localized fallbacks

The plain-text adapter exposes a catalog key instead of a Chinese label, and the renderer translates it at render time so a locale change cannot leave stale state. Browser transport failures carry stable Client-side reason codes; the presentation layer maps known codes to catalog entries and preserves a sanitized technical message only as the fallback for unknown Host or external-service failures.

Host protocol shapes and error codes remain unchanged in this refactor. Changing them would expand the release beyond message architecture and risk altering established behavior.

## Compatibility and Safety

- The locale namespace remains `sidebarCodeCraft`; registration and disposal stay owned by the existing Client lifecycle.
- Existing message keys and wording remain stable unless the copy was previously an embedded Chinese-only fallback.
- Catalog imports are static and bundled; startup and locale switching require no network request.
- Client code imports no Node APIs, and Host code does not import the Client catalog.
- No persisted setting or document data is introduced or migrated.
- Stable package, Host, Client, Slot, settings, and route identities do not change.
- Unknown external errors remain contained and actionable; localization failure must not affect editing, saving, or dirty-state preservation.

## Out of Scope

- Adding a language, locale picker, automatic language detection, or translation-management service.
- Rewording product features, adding settings, changing feature behavior, or altering supported file/language capabilities.
- Translating arbitrary third-party diagnostics, filesystem messages, source code, filenames, or language-server output.
- Changing Host route/protocol contracts solely for localization.
- Package version bump, lockfile change, changelog entry, commit, push, tag, npm publication, or GitHub Release publication.

## Requirement-to-File Plan

| Requirement | Primary paths | Focused evidence |
| --- | --- | --- |
| I18N-01 / I18N-07 | `src/client/core/plugin.ts`, `src/client/i18n/index.ts` | Client registration/build verification |
| I18N-02 | `src/client/i18n/messages/**` | Catalog structure and parity tests |
| I18N-03 | `src/client/i18n/contract.ts`, `src/client/dsh.ts`, Client component/controller props | Typecheck and typed-key tests |
| I18N-04 | Catalog composition and `tests/locales.test.ts` | Runtime key and placeholder parity |
| I18N-05 | `src/client/api.ts`, `src/client/languages/index.ts`, `src/client/renderer/CodeCraftBody.tsx` | API fallback and language-label tests |
| I18N-06 | Existing Client modules and full repository suite | Focused and full regression gates |

## Implementation Sequence

1. Add the typed i18n contract and split the existing dictionaries without changing key values.
2. Register the composed dictionaries through the existing DSH Locale namespace and narrow the bound translator.
3. Replace stringly typed translation boundaries and dynamic mapping tables with the shared types.
4. Move the plain-text label and known browser transport fallbacks into the catalog.
5. Add key/placeholder parity and localized-fallback tests, then run focused and full regression checks.
6. Hand off native macOS and Windows language-switching and editing/save smoke checks.

## Definition of Done

- I18N-01 through I18N-07 have traceable implementation and current automated evidence.
- No monolithic bilingual dictionary remains, and each language has the same domain layout.
- TypeScript rejects invalid CodeCraft message keys at translation boundaries.
- Runtime tests prove exact key and placeholder parity.
- Chinese and English locale switching covers the plain-text label and known transport fallbacks without a restart-specific stale label.
- The full repository check passes with no feature or release metadata change.
- Native DSH Desktop acceptance remains unchecked until the user reports observed results.

