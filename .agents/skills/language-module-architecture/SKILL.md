---
name: language-module-architecture
description: Design, place, implement, or review programming-language, framework, and developer-ecosystem features in this repository's real client/host architecture. Use for module boundaries, file layout, registration, protocol design, lifecycle, or capability isolation. Do not use for unrelated generic editor or release work.
---

# Language Module Architecture

Keep language, framework, and ecosystem features aligned with the checked-out repository. Standardize ownership and dependency direction, not identical feature sets or algorithms.

## Use repository facts first

1. Read `AGENTS.md`, `docs/guide/intelligence-module-conventions.md`, the relevant version design, and the current source before designing files.
2. Treat existing code and public integration points as authoritative. Proposed templates, old documents, and visually symmetric directory ideas never override working architecture.
3. Read [references/current-architecture.md](references/current-architecture.md) before placing a new module or any capability that might cross the browser/Host boundary.
4. Protect unrelated work. Do not migrate, rename, or normalize existing modules merely to make the tree look uniform.

## Classify responsibility twice

First classify the product module:

- **Language:** syntax-aware editing or semantic support for a programming or markup language.
- **Framework:** assistance specific to a framework built on an already supported language.
- **Ecosystem:** project, dependency, build, configuration, or toolchain behavior that may span languages.

Then classify every capability by runtime:

| Runtime | Put here when the capability needs | Must not contain |
| --- | --- | --- |
| Client | CodeMirror parsing, highlighting, completion from the loaded document, snippets, indentation, input handlers, editor status, settings UI, tab-local presentation | Node filesystem/process APIs, interpreter discovery, language-server startup, trusted workspace decisions |
| Host | Authenticated workspace access, filesystem/project inspection, environment or executable discovery, managed subprocesses, LSP sessions, cross-file semantic work, platform policy | React, CodeMirror objects, DOM access, browser-only tab state |
| Shared boundary | Serializable request/result types, stable error/status values, and defensive settings data | Runtime objects, callbacks, class instances, DOM nodes, Node handles |

A hybrid feature is split by responsibility: Client owns interaction and rendering; Host owns privileged or project-aware computation; `src/protocol.ts` plus the authenticated route and `src/client/api.ts` connect them. Never move the whole feature to one side merely to keep it in one directory.

## Follow the current layout

### Client language behavior

- Put dedicated browser language modules in `src/client/languages/<slug>/`.
- Use `index.ts` as the `EditorLanguageAdapter` entry when the module has dedicated behavior. Put delivered responsibilities in `features/*.ts`; do not create placeholders for future capabilities.
- Register through `src/client/languages/index.ts` and its duplicate-safe `LanguageRegistry`. Reuse generic CodeMirror adapters for languages that need only standard syntax support.
- Put genuinely language-neutral CodeMirror behavior in `src/client/editor/`. Do not add one language's rules to shared editor extensions.
- Keep tab orchestration and Host-request lifecycle in the existing renderer boundary; keep language algorithms in their module rather than growing `CodeCraftBody.tsx` unnecessarily.

### Host intelligence and tools

- Put language-owned semantic providers and environment discovery in `src/host/languages/<slug>/`.
- Put framework semantic/project services in `src/host/frameworks/<slug>/` only when a concrete feature exists and can reuse its parent language capability.
- Put project/toolchain integrations in `src/host/ecosystems/<slug>/` only for concrete ecosystem behavior.
- Reuse `src/host/intelligence/` for provider coordination and lifecycle and `src/host/lsp/` for transport, synchronization, cancellation, and process-session behavior. Do not copy these layers into a module.
- Use DSH Host services declared in `src/host/context.ts`, especially managed `ctx.subprocess` with explicit argv. Never introduce browser process access or interpolated shell commands.

The current Host provider system is Python-specific in several contracts and manager paths. Supporting another semantic provider may require a deliberate, tested generalization of those shared contracts. Merely adding a new folder does not register or activate a provider, and a parallel manager or route is not an acceptable shortcut.

### Shared integration files

- Add wire-safe request/result types and actions to `src/protocol.ts` only when Client and Host must communicate.
- Validate every new action and untrusted field in `src/host/routes.ts`; resolve workspace authority on the Host, never from a browser-supplied root.
- Add typed browser calls in `src/client/api.ts` and bind cancellation and stale-result handling to the owning tab/document revision.
- Put settings interfaces, defaults, and defensive resolvers in `src/settings/schema.ts`; mirror persistent Host schema in `src/config.ts`; add Client store/UI/locales only when the feature truly has user settings.
- Extend `src/index.ts` or `src/client/core/plugin.ts` only for top-level lifecycle registration. Every listener, provider, request, and subprocess needs teardown through its actual owner.

## Design the smallest real module

Before editing, produce a short placement plan that lists each capability, category, runtime, concrete path, reused contract, and reason. Then:

1. Choose the closest comparable implementation: HTML or Java for browser-local editing, Python for a Client/Host semantic split.
2. Reuse shared editor, save, settings, protocol, intelligence, and LSP infrastructure rather than duplicating it.
3. Add only files required by delivered behavior. Do not invent `manifest.ts`, `services/`, a registry, or a client framework/ecosystem tree until a real implementation requires that contract.
4. Keep siblings isolated. A framework or ecosystem may use an approved public language capability, never a language module's private feature file.
5. Extract shared code only after real stable reuse is visible. Similar feature names do not prove the same algorithm.
6. Define disabled, unavailable, initialization-failure, stale-response, and teardown behavior. Assistance failure must leave ordinary editing and saving usable.
7. State platform support and external-runtime requirements explicitly. No silent runtime download or mandatory tool may be added to core editing.

## Verify architecture and behavior

- Keep tests flat under `tests/` and name them by responsibility, following existing examples.
- Test activation, extension/path matching, behavior, invalid inputs, live settings, fallback, stale work, cleanup, and isolation from sibling languages as applicable.
- When protocol or Host behavior changes, cover admission, request validation, workspace containment, stable public errors, and cancellation.
- When build boundaries change, run `npm run check` and confirm the browser bundle has no Node or Host-only dependency.
- When a language runtime, provider, or lifecycle path changes, apply [local DSH Desktop safety validation](../regression-testing/references/dsh-desktop-safety-validation.md) for activation, optional-runtime failure, restart, Host/Client registration, and crash checks.
- Report commands actually executed and native macOS/Windows scenarios still requiring manual acceptance. Use the separate regression-testing skill when the user asks for a full regression run.

## Architecture report

Summarize completed or proposed work with:

- module name and Language/Framework/Ecosystem category;
- Client, Host, or hybrid ownership for each capability;
- actual files added or changed and their responsibilities;
- existing contracts reused and any shared contracts deliberately generalized;
- settings, external dependencies, platform support, failure, and teardown behavior;
- tests run, unverified native scenarios, and justified deviations from current conventions.
