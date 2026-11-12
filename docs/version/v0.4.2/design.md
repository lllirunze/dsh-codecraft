# DSH CodeCraft v0.4.2 HTML Diagnostics and Safe Refactoring Design

| Field | Value |
| --- | --- |
| Status | Implemented with automated validation; native macOS and Windows acceptance pending |
| Target version | 0.4.2 |
| Baseline | 0.4.1 |
| Release type | Patch feature enhancement |
| Platforms | macOS and Windows |
| Scope | Offline HTML diagnostics, problem navigation, paired-tag rename, and current-document ID rename with preview and conflict protection |

## Purpose

v0.4.2 adds evidence-based diagnostics and explicitly confirmed, syntax-aware rename operations to the existing browser-local HTML module. It does not create a general quality platform, an HTML language server, a second save path, or cross-file HTML/CSS/JavaScript analysis.

Every numbered requirement in [the planning source](../../planning/DSH-CodeCraft-v0.4.2-HTML-Design.md) is mandatory. The version is a patch enhancement because it extends the established 0.4 HTML feature line without adding a new language or Host provider.

## Current Baseline

v0.4.1 already supplies the CodeMirror HTML parser, bundled `vscode-html-languageservice` metadata, current-document structure/navigation, a live HTML assistance gate, one native-tab editor transaction history, save conflict protection, and tab-local React presentation. It has no diagnostic pipeline, problems list, or rename preview.

## Required Scope

| ID | Required behavior | Negative and failure behavior |
| --- | --- | --- |
| HTML-042-01 | Diagnose definite malformed structure, mismatched explicit closing tags, and a conservative fixed set of invalid parent/child structures | HTML5 optional closing for elements such as `li` and `p` is not reported |
| HTML-042-02 | Diagnose duplicate attributes, unsupported attributes on known standard elements, and invalid values for fixed enumerations | `data-*`, `aria-*`, custom elements, boolean attributes, and unconstrained values remain valid |
| HTML-042-03 | Warn for duplicate IDs and missing same-document `href="#…"` targets | Unique IDs and resolvable fragment links produce no issue |
| HTML-042-04 | Report missing or malformed DOCTYPE/`html`/`head`/`body` structure only when the content is a complete-document candidate | Ordinary fragments are not required to contain a page skeleton |
| HTML-042-05 | Warn for `img` without `alt` and explicit `label[for]` without a matching form-control ID | `alt=""` is present and valid for this rule |
| HTML-042-06 | Warn for elements and attributes in the bundled fixed deprecated-rule table | Rules work offline and do not change dynamically |
| HTML-042-07 | Show ranges, severity, concise reason, and a current-tab problems list whose items reveal the exact range | Results are recomputed after edits, are discarded when stale, and never cross tabs |
| HTML-042-08 | Rename the start and end names of one uniquely parsed paired element | Void, self-closing, mismatched, incomplete, invalid-name, or structurally unsafe changes are rejected |
| HTML-042-09 | Rename one unique ID and exact same-document `href="#id"` references | Duplicate source IDs, conflicting target IDs, invalid names, CSS/JS text, and cross-file references are rejected or untouched |
| HTML-042-10 | Preview every location and replacement before applying; Cancel makes no edit | Confirmation is explicit and unrelated text is never changed |
| HTML-042-11 | Require the previewed editor document and conflict state to remain current, then apply one CodeMirror transaction | Stale preview, read-only state, or external/save conflict produces zero edits; one Undo restores the prior content |
| HTML-042-12 | Preserve offline behavior, the single HTML gate, multiple-tab isolation, and Python/Java behavior on macOS and Windows | Disabling HTML assistance removes diagnostics and rename UI while ordinary editing and saving remain available |

## Architecture and Placement

The module category is **Language** and every new capability is Client-owned because it operates exclusively on the current editor document.

| Capability | Runtime | Concrete placement | Reused contract and reason |
| --- | --- | --- | --- |
| Rules and diagnostic data | Client | `src/client/languages/html/features/diagnostics.ts` | CodeMirror HTML syntax tree, bundled HTML metadata, and `@codemirror/lint`; no trusted filesystem access is required |
| Paired-tag and ID rename planning | Client | `src/client/languages/html/features/refactoring.ts` | Parsed tree and immutable `EditorState`; returns bounded text changes without dispatching them |
| Problems and rename preview UI | Client | `src/client/renderer/HtmlProblemsPanel.tsx`, `HtmlRenamePanel.tsx`, and the existing `CodeCraftBody.tsx` toolbar/editor row | Existing native-tab body, range reveal helper, document dirty/conflict state, and one CodeMirror dispatch |
| Feature activation | Client | `src/client/languages/html/index.ts` and existing HTML assistance compartment | The single `Enable HTML Editing Assistance` gate controls all HTML-specific behavior |
| Copy and presentation | Client | `src/client/locales.ts` and `src/client/theme.ts` | Existing bilingual localization and scoped CodeCraft theme |

No Host, protocol, route, workspace permission, subprocess, runtime download, or new setting is added. Diagnostics do not block save. Rename preview stores the immutable CodeMirror document value used for planning; confirmation verifies identity and conflict/read-only state before dispatching all sorted changes as one transaction.

## Diagnostic Rules and Boundaries

Diagnostics have stable `ruleId`, severity, source range, and concise message. Parser error nodes and mismatched close-tag nodes support structure errors. Standard tag and attribute metadata comes from the version pinned in the package; a small source-controlled table supplies deprecated constructs and conservative structural constraints that the metadata does not expose.

A complete-document candidate contains a DOCTYPE or an `html`, `head`, or `body` element. Only candidates receive document-skeleton checks. Fragments remain fragments. Attribute validation applies only to known standard elements; custom elements are not forced into the standard table. Global, `data-*`, and `aria-*` attributes remain allowed.

The diagnostic extension uses CodeMirror's delayed lint source, so a newer document invalidates an older calculation. The React problems list independently derives the same pure result for the current editor state and checks the active tab before publishing it.

## Safe Refactoring

Tag rename resolves the syntax node at the caret to one `Element` with a real `OpenTag` and `CloseTag`, verifies both names are identical, and replaces only those two `TagName` ranges. It rejects void/self-closing/mismatched structures and names that would turn a paired element into a void element.

ID rename starts from an actual `id` attribute value, requires exactly one definition, rejects an existing different definition with the requested new value, and changes only the defining value and exact `href="#old"` values in the same document. It never scans CSS selectors, JavaScript strings, comments, text, or other files.

Both operations first produce a preview containing line/column, old text, and replacement text. Cancel discards the plan. Confirm succeeds only if the editor document, tab, assistance gate, writable state, and conflict state still match the preview. All changes are submitted together and are one Undo history event.

## Failure, Lifecycle, and Isolation

- Malformed documents may still be edited and saved; diagnostic or refactoring failure reports feedback without changing text.
- Closing/replacing a tab destroys its editor and its lint state. React timers are cancelled during cleanup.
- Disabling HTML assistance removes the lint extension and hides/clears the HTML problems and rename presentation.
- No document content is executed, sent over the network, or treated as a workspace authority.
- Python, Java, generic editing, drafts, AutoSave, conflicts, and native saving remain unchanged.

## Explicitly Out of Scope

Full WCAG auditing, automatic bulk fixes, CSS/JavaScript relationship analysis, selector indexing, cross-file rename, dynamic strings, development servers, live page/source synchronization, new settings, and release metadata or publication are excluded.

## Implementation Sequence

1. Add the direct CodeMirror lint dependency already present transitively and implement the pure HTML rule engine.
2. Integrate lint presentation through the existing HTML adapter and add focused rule/boundary tests.
3. Implement pure tag and ID rename planners with refusal results and exact ranges.
4. Add current-tab problems and rename-preview panels to the existing renderer, including stale-preview and conflict checks.
5. Add localized copy and scoped styles, then run focused tests, typecheck, and the full regression gate.
6. Stop at native macOS/Windows acceptance and wait for user-observed results before any release work.

## Implementation Outcome

The implementation remains entirely inside the existing Client HTML boundary:

```text
src/client/languages/html/features/
├── diagnostics.ts       pure fixed-rule analysis plus CodeMirror lint ranges
└── refactoring.ts       paired-tag and current-document ID rename plans and guards

src/client/renderer/
├── HtmlProblemsPanel.tsx
├── HtmlRenamePanel.tsx
└── CodeCraftBody.tsx    tab-local debounce, preview, disk-version check, and one transaction
```

`@codemirror/lint` is now a direct pinned development dependency (it was already present transitively). The bundled HTML metadata and fixed rule tables remain offline. No Host, protocol, route, process, network, save path, or setting was added.

The current implementation revision passes the four-file HTML focused command (55 tests) and `npm run check` (20 files / 239 tests, typecheck, both bundles, and artifact verification). Native DSH Desktop behavior remains unverified until the user completes the macOS and Windows checklist in [validation.md](validation.md).

## Definition of Done

HTML-042-01 through HTML-042-12 have current automated evidence; diagnostics remain conservative and offline; problem navigation and both rename flows work only in the owning HTML tab; preview, cancellation, staleness protection, one-transaction application, and one-step Undo are verified; the single HTML gate and sibling languages regress cleanly; `npm run check` passes; and the user reports the required native macOS and Windows acceptance. Automated implementation is complete, but native acceptance and release authorization are still outstanding. Release remains a separate explicitly authorized workflow.
