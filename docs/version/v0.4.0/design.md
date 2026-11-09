# DSH CodeCraft v0.4.0 HTML Foundation and Editing Intelligence Design

| Field | Value |
| --- | --- |
| Status | Validated on macOS and Windows; release ready |
| Target version | 0.4.0 |
| Baseline | 0.3.3 |
| Release type | Minor feature release |
| Platforms | macOS and Windows |
| Scope | Offline HTML parsing, completion, input assistance, indentation, comments, snippets, and one live feature gate |

## Purpose

v0.4.0 turns the existing generic `.html` and `.htm` syntax adapter into a dedicated, browser-local HTML editing module. It provides standard HTML5 structure highlighting, contextual completion, safe tag and quote handling, syntax-aware indentation, HTML comments, and explicitly selected snippets without starting a language server, subprocess, browser, or network request.

Every numbered requirement in this document is mandatory. The release is not complete when only the behavior already supplied by `@codemirror/lang-html` is present, when the HTML setting affects only new tabs, or when disabling or failing HTML assistance makes a document uneditable or unsaveable.

This design follows the shared [intelligence module conventions](../../guide/intelligence-module-conventions.md). The requirement source refers to `src/languages/html/`; the repository's actual browser boundary is `src/client/languages/html/`, so the implementation uses that existing convention rather than creating a second language tree.

## Current Baseline and Required Changes

The 0.3.3 registry already recognizes `.html` and `.htm` through a generic `CodeMirrorLanguageAdapter` and calls `html()` from `@codemirror/lang-html`. Shared completion UI, bracket matching, quote pairing, folding, comments, saving, drafts, and indentation are installed by the common editor.

That baseline is useful but insufficient:

- HTML has no dedicated module, setting, lifecycle state, or failure boundary.
- the current shared high-precedence Enter command handles delimiters only and prevents HTML's parser indentation from owning nested tags and closing tags;
- the packaged HTML completion data does not provide CodeCraft snippets or named-character-reference completion and does not remove attributes already present on the element;
- adding separate completion providers without coordination would create duplicate or competing candidate lists;
- the current Java-only language gate cannot disable or restore HTML support in open tabs;
- the status bar reports semantic Python lifecycle only and cannot truthfully show `HTML: Ready`, `HTML: Disabled`, or `HTML: Error`.

v0.4.0 addresses these gaps without changing the Host protocol or adding Host-side HTML intelligence.

## Required Scope

| ID | Requirement | Acceptance summary |
| --- | --- | --- |
| HTML-040-01 | Parsing and highlighting | Recognize `.html` and `.htm`; highlight HTML structure, comments, DOCTYPE, and embedded `style`/`script` content locally |
| HTML-040-02 | Tag completion | Offer filtered common standard HTML5 tag names in valid tag contexts |
| HTML-040-03 | Attribute completion | Merge element-specific and global attributes, including common ARIA attributes, without offering an attribute already present |
| HTML-040-04 | Values and entities | Complete enumerated values, preserve bare Boolean attributes, and complete common named character references |
| HTML-040-05 | Tag closing | Auto-close eligible elements, complete `</`, and never create an end tag for a void element |
| HTML-040-06 | Matching and quotes | Highlight matching tag names and retain safe quote pairing, wrapping, deletion, and closer skipping |
| HTML-040-07 | Structural indentation | Respect the global two- or four-space setting for nested Enter, closing-tag dedent, and paired-tag expansion |
| HTML-040-08 | HTML comments | Insert and edit `<!-- -->` through the existing comment command as one undoable action |
| HTML-040-09 | Snippets | Explicitly offer DOCTYPE, page skeleton, meta charset, stylesheet link, and form snippets without replacing unrelated content |
| HTML-040-10 | One live setting | Add exactly one default-on, persistent `Enable HTML Editing Assistance` switch that affects open and future HTML tabs |
| HTML-040-11 | Offline reliability | Pass macOS and Windows acceptance, multi-tab and path cases, and offline use without duplicate completion UI |

## Module and Runtime Boundaries

The dedicated client module is intentionally small:

```text
src/client/languages/html/
├── index.ts                 adapter registration and extension composition
└── features/
    ├── completion.ts        one contextual source for tags, attributes, values, entities, and snippets
    └── indentation.ts       HTML Enter and closing-tag indentation behavior
```

Additional files are created only if implementation makes a separate responsibility necessary. Fixed HTML metadata may remain in `completion.ts` while it is readable; it moves to a dedicated data file only when size or independent testing justifies that split.

The module reuses `@codemirror/lang-html` and its Lezer parser. Embedded `<style>` and supported `<script>` bodies use the CSS and JavaScript parsers already shipped in the dependency graph. They are nested parser support, not activation of CodeCraft's standalone CSS or JavaScript adapters, and they start no Host provider or process.

The Host route, filesystem model, save path, draft store, conflict checks, Python provider, and Java module gain no HTML branch. HTML content is parsed as editor data and is never evaluated as privileged DSH code.

## Language Registration and Safe Activation

The inline generic HTML registration in `src/client/languages/index.ts` is replaced by `htmlEditorLanguage`, registered through the existing `LanguageRegistry`. Its identity remains `html`, its label remains `HTML`, and its extensions remain `html` and `htm`.

HTML-specific language support, completion data, auto-closing, comment metadata, matching metadata, and indentation commands live in the reconfigurable language-assistance compartment. When assistance is disabled, that compartment is empty. Common editor infrastructure remains outside it:

- document text, selection, history, and scroll state;
- line numbers, search, themes, and read-only enforcement;
- manual save, AutoSave, drafts, conflicts, and disk-version checks;
- generic quote/bracket pairing and configured Tab/Shift+Tab behavior.

Extension construction and reconfiguration are guarded. If HTML initialization throws, CodeCraft installs an empty HTML assistance compartment, reports `HTML: Error`, and leaves ordinary text editing and saving operational. Re-enabling may retry construction; repeated attempts must not accumulate extensions or listeners.

## Parsing, Highlighting, Matching, and Folding

The HTML language support owns HTML tags, attributes, values, text, comments, DOCTYPE, and parser nesting. The existing theme and shared folding and bracket-matching extensions consume that syntax data.

Matching highlights use parsed `OpenTag` and `CloseTag` names rather than textual searches. Incomplete and mismatched markup may show parser error styling but must remain editable. HTML matching never scans another file.

The `<style>` and `<script>` regions receive only the nested highlighting and parsing that ships with the HTML language package. v0.4.0 does not add cross-file CSS or JavaScript completion, navigation, validation, or project indexing.

## Unified Completion Pipeline

HTML uses one effective completion source. It delegates standard tag, attribute, and enumerated-value contexts to the packaged HTML parser metadata, then applies CodeCraft's required filtering and additions before returning one result. Entity and snippet candidates are routed through that same source. The editor must not register both the packaged source and an independent competing source.

The adapter contract exposes the effective language completion source to the shared completion UI, or provides an equivalent language-data registration that guarantees only one active HTML source. Python's explicit semantic completion override and Java's local source keep their current behavior.

### Tags

- Tag candidates appear only in parsed start-tag, incomplete-tag, or explicit HTML completion contexts.
- Filtering is case-insensitive while inserted standard names use lowercase.
- Typing `<bu` includes `button` with a replacement range covering only the incomplete tag name.
- In a closing-tag context, currently open elements are ordered from the innermost outward.
- Fixed bundled metadata fills gaps required by the supported HTML5 set and is versioned with the package; runtime network lookup is forbidden.

### Attributes

- Element-specific and global attributes are combined for the current parsed element.
- The required global set includes `id`, `class`, `title`, `lang`, `role`, and common `aria-*` names; tag metadata includes required names such as `href`, `src`, `type`, and `name`.
- Existing attributes on the same start tag are collected case-insensitively and removed from the result, except the attribute whose name is currently being edited.
- Attribute completion changes only the active attribute token. It does not reorder or rewrite the start tag.
- Boolean attributes such as `required`, `disabled`, `checked`, and `multiple` insert as bare names. CodeCraft does not force `=""` or a string value.

### Values and named character references

- Enumerated values are offered only for a known attribute on the current known element or for a known global attribute.
- Completion preserves the user's single-quote, double-quote, or unquoted context and does not add a second closing quote.
- Required examples include link targets and common input types; unknown or free-form values receive no invented candidates.
- After a valid `&` prefix, a bounded bundled list offers common references such as `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`, and `&nbsp;`. Applying a candidate includes the semicolon and replaces only the current entity prefix.

### Snippets

The HTML source exposes explicit, labeled snippet candidates for:

- HTML5 DOCTYPE;
- a complete `html`/`head`/`body` page skeleton;
- `meta charset`;
- a stylesheet `link`;
- a basic `form`.

Snippets use CodeMirror snippet fields for editable positions and adapt their indentation to the active two- or four-space unit. They are applied only after the user chooses a completion candidate, replace only the detected abbreviation or empty insertion range, and form one undoable transaction. A page skeleton is never inserted automatically and never replaces a non-empty document wholesale.

## Tag Closing and Optional-End Rules

Tag closing is syntax-aware and uses a fixed standards table.

- Completing `>` for an eligible, unclosed start tag inserts the matching end tag and keeps the caret in the content position.
- Typing or completing `</` prioritizes the innermost open element and inserts the remaining name and `>` without duplication.
- The canonical HTML void-element set never receives an end tag: `area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `source`, `track`, and `wbr`.
- Self-closing syntax and incomplete editing states are handled conservatively; uncertain parser state produces no automatic structural edit.
- Elements with standards-defined optional end tags are not treated as requiring an automatically inserted explicit close. They may still appear when the user explicitly requests a valid closing-tag completion.
- One user input that adds an end tag remains one undoable input event.

The packaged `autoCloseTags` behavior may be reused only where it satisfies these rules. CodeCraft supplies a guarded input handler for the void, optional-end, or caret behavior that cannot be expressed by the package unchanged.

## Indentation and Enter Behavior

The current generic high-precedence Enter command runs before parser indentation, so v0.4.0 adds an HTML-aware branch rather than relying on extension order accidentally.

For an enabled HTML editor, Enter:

1. resolves the parser context and current element;
2. preserves the current line's structural base indentation;
3. indents nested content by exactly the configured two or four spaces;
4. aligns a closing tag with its matching start tag;
5. expands `<tag>|</tag>` to a content line between the tags and leaves the caret on that line;
6. preserves ordinary comment continuation and incomplete-markup editing;
7. falls back to the existing language-neutral Enter behavior when syntax is incomplete or no safe HTML rule applies.

Only the current edit location changes. The command does not format the document, normalize historical indentation, or rewrite text content. Tab and Shift+Tab retain the shared boundary-aligned commands.

## Comments and Quote Behavior

The existing `Mod-/` entry point consumes the HTML language's block comment tokens and creates or removes `<!-- -->`. Selection wrapping, an empty-caret case, multiline comments, Enter inside comments, and a single Undo are covered explicitly. Disabling assistance removes HTML comment semantics, while ordinary text input remains available.

Common quote pairing stays outside the HTML feature gate as shared editor behavior. With assistance enabled, parser context and the shared closer-skipping behavior must coexist: a typed quote wraps a selection or creates a pair, typing the existing closer advances over it, and neither completion nor HTML input handling creates duplicate quotes.

## Configuration and Live Reconfiguration

The shared settings model adds one root group parallel to Java:

```typescript
export interface HtmlEditingAssistanceSettings {
  enabled: boolean
}

export interface CodeCraftSettings {
  editor: EditorSettings
  pythonIntelligence: PythonIntelligenceSettings
  javaEditingAssistance: JavaEditingAssistanceSettings
  htmlEditingAssistance: HtmlEditingAssistanceSettings
}
```

The canonical mutation path is `['htmlEditingAssistance', 'enabled']`. The default is `true`; missing, partial, or malformed values resolve to `true` so upgrading users retain HTML support. `src/config.ts` declares the same default and a volatile HTML group so DSH owns persistence and emits accepted live snapshots.

The existing settings card gains one group and exactly one switch:

| Property | Value |
| --- | --- |
| English label | `Enable HTML Editing Assistance` |
| Chinese label | `启用 HTML 编辑辅助` |
| Default | On |
| Sub-switches | None |

The switch is disabled while the form is loading, read-only, or saving. The runtime follows only accepted form snapshots. A rejected or throwing mutation restores the last accepted value, retains the prior effective extensions, and shows the existing settings save error.

Every open `CodeCraftBody` already subscribes to the shared settings store. HTML tabs reconfigure the existing language-assistance compartment when the accepted HTML value changes; other tabs take no HTML action. New HTML tabs read the latest accepted value. Reconfiguration does not recreate the `EditorView`, replace the document, reopen the native tab, or alter selection, scroll, history, dirty state, drafts, or save state.

## Local HTML Status

The status bar reports the HTML module independently from Python's semantic-service lifecycle:

- `HTML: Ready` only after the local HTML extensions are installed successfully;
- `HTML: Disabled` when the accepted feature gate is off;
- `HTML: Error` when extension construction or reconfiguration fails and the safe empty fallback is active.

Chinese equivalents are localized with the existing locale map. HTML never shows a starting-language-server state because it has no asynchronous server startup. Non-HTML tabs show no HTML status. A failed HTML module must not be mislabeled ready merely because the file extension was recognized.

## Failure, Lifecycle, and Isolation

- Missing or malformed settings cannot block plugin startup and resolve to enabled.
- Parser errors in incomplete user markup are ordinary editing states, not module failures.
- Construction or reconfiguration exceptions produce the empty HTML assistance fallback and an error status without clearing text.
- Rapid setting changes converge on the latest accepted snapshot and do not create duplicate completion popups, input handlers, or subscriptions.
- Tab release destroys the editor and all HTML extension state through the existing React lifecycle.
- HTML behavior performs no filesystem reads beyond the already loaded document, network requests, subprocess calls, or runtime downloads.
- Python completion, Hover, navigation, and Pyright lifecycle remain unchanged. Java completion, snippets, Javadoc, and its independent setting remain unchanged.
- Paths containing spaces or Chinese characters affect only the existing file-open/save layer and must not change HTML module activation.

## Explicitly Out of Scope

- Hover, Outline, breadcrumbs, structure navigation, selection expansion, or local-resource navigation;
- Emmet, document or selection formatting, diagnostics, linting, refactoring, or Rename;
- browser preview, WebView, development server, or execution of HTML or embedded scripts inside DSH;
- cross-file HTML/CSS/JavaScript indexing or semantic association;
- a Host HTML provider, language server, binary runtime, SDK, or first-use download;
- separate switches for completion, snippets, closing, indentation, or any other HTML sub-feature.

## Implementation Sequence

1. Add the HTML settings type, default, defensive resolver, Host schema field, store snapshot field, accepted mutation method, localized labels, and one native switch.
2. Extract the inline HTML adapter to `src/client/languages/html/` and compose guarded local language support with embedded CSS and JavaScript parsing.
3. Implement and test the single contextual completion source, including duplicate-attribute filtering, values, Boolean attributes, entities, and snippets.
4. Implement standards-aware tag closing with complete void and optional-end handling.
5. Add HTML structural Enter behavior that explicitly coordinates with the shared indentation commands and active indentation setting.
6. Generalize the language assistance gate and status handling so accepted HTML changes reconfigure open and future HTML tabs with safe fallback.
7. Add focused HTML tests plus settings, language registry, editor, document, Java, and Python regressions.
8. Run the full repository checks and record independent macOS and Windows DSH Desktop evidence in [validation.md](validation.md).

## Definition of Done

v0.4.0 is complete only when HTML-040-01 through HTML-040-11 pass; `.html` and `.htm` share the dedicated offline module; the unified completion pipeline covers tags, contextual attributes, values, Boolean attributes, entities, and snippets without duplicates; tag closing respects void and optional-end rules; matching, quotes, comments, Undo, and two- and four-space structural indentation work; the only HTML switch defaults on, persists, and updates open and future tabs; Ready, Disabled, and Error states are truthful; common editing and saving survive disablement or failure; Python and Java remain isolated; automated checks pass; and native macOS and Windows acceptance is recorded.
