# DSH CodeCraft v0.4.1 HTML Productivity and Browser Preview Design

| Field | Value |
| --- | --- |
| Status | Implemented; automated validation passed; native acceptance pending |
| Target version | 0.4.1 |
| Baseline | 0.4.0 |
| Release type | Patch feature enhancement |
| Platforms | macOS and Windows |
| Scope | HTML Hover, Outline, breadcrumbs, folding/matching, selection expansion, local navigation, formatting, Emmet, template insertion, and Preview in Browser |

## Purpose

v0.4.0 made `.html` and `.htm` files fully editable with a browser-local HTML module. v0.4.1 turns that module into a productive HTML workflow without adding a language server, a development server, an embedded WebView, or cross-file HTML/CSS/JavaScript analysis.

The release delivers three groups of behavior:

1. **Document understanding and navigation** — standard tag/attribute/value Hover, a nested document Outline, DOM ancestor breadcrumbs, element range highlighting, element and comment folding, start/end tag matching navigation, syntax-aware selection expansion/shrinking, local static-resource navigation, and same-document `href="#id"` navigation.
2. **Editing productivity** — whole-document and selection formatting that respects the global two- or four-space setting, Emmet abbreviation expansion for the required subset, and explicit HTML5 template insertion.
3. **Preview in Browser** — a native file-tab action for the active HTML editor that opens the saved file in the operating system's default browser after protecting unsaved edits.

Every numbered requirement in [the planning source](../../planning/DSH-CodeCraft-v0.4.1-HTML-Design.md) is mandatory. The version remains a patch release because it adds refinement and productivity to the existing HTML feature rather than introducing a new language, a new Host provider, or a new product surface.

## Current Baseline and Required Changes

The 0.4.0 HTML module already provides:

- `.html` and `.htm` registration through the shared `LanguageRegistry`;
- `@codemirror/lang-html` parsing with embedded CSS and JavaScript parsing;
- one contextual completion source for tags, attributes, values, entities, and snippets;
- guarded tag closing, structural Enter behavior, HTML comments, folding for elements, and bracket matching through the shared editor;
- one live `Enable HTML Editing Assistance` setting;
- native save, drafts, conflicts, AutoSave, and tab lifecycle integration.

The baseline cannot satisfy v0.4.1:

- there is no Hover, Outline, breadcrumb, or current-element scope UI;
- multiline HTML comments have no fold range;
- matching tags can be highlighted but there is no command to jump between them;
- no syntax-aware expand/shrink selection command exists;
- link and `src` values are plain text with no local navigation;
- there is no formatter, Emmet expander, or explicit template command;
- the native document header has no HTML preview control, and the plugin does not consume the public Session Remote path-opening bridge.

v0.4.1 addresses these gaps inside the existing client HTML module, with one narrow integration at the native document header. It does not add a Host route because DSH already publishes the required authenticated "open this workspace path with the operating system association" capability.

## Required Scope

| ID | Requirement | Acceptance summary |
| --- | --- | --- |
| HTML-041-01 | Standard HTML Hover | Hover `<a>`, `href`, and `target="_blank"` shows real static reference text; unknown metadata is never invented |
| HTML-041-02 | Document Outline | Nested expandable element tree; clicking a node moves the caret to the real start tag line and column |
| HTML-041-03 | Breadcrumbs and element scope | Caret inside `span` shows `html > body > … > span`; the current element's source range is highlighted and both update with the caret |
| HTML-041-04 | Folding and matching-tag jump | Elements and multiline comments fold and unfold without changing text; a command jumps from one tag to its matching tag while honoring valid optional closures |
| HTML-041-05 | Syntax-aware selection | Repeated expand/shrink moves value → attribute → start tag → full element without corrupting selection, history, or ordinary input |
| HTML-041-06 | Local resource navigation | A resolvable relative `src`/`href` file inside the Session workspace opens in a native tab; HTTP(S) and other non-local URLs are never treated as files |
| HTML-041-07 | Same-document anchor navigation | `href="#target"` locates the element with `id="target"`; a missing or duplicated id yields explicit feedback and never jumps to matching text |
| HTML-041-08 | Format Document | Whole-document formatting uses the global two- or four-space setting, is idempotent, preserves `pre`/`textarea`/inline text, and is undoable |
| HTML-041-09 | Format Selection | Only the selected safe range changes; unsupported partial structures report a message instead of widening the edit |
| HTML-041-10 | Emmet expansion | Required element, child, sibling, repetition, class, id, attribute, text, and `$` numbering syntax expands to correct HTML with editable caret placement |
| HTML-041-11 | HTML5 template insertion | Explicit completion or command inserts a standards-shaped document skeleton; a non-empty document is not overwritten wholesale |
| HTML-041-12 | Preview in Browser action | Only the active editable `.html`/`.htm` native file tab shows **Preview in Browser**; clicking opens the saved file in the operating system default browser |
| HTML-041-13 | Preview protection and failures | Dirty documents require a successful save first; cancel, save failure, missing file, or browser launch failure stops preview and preserves edits |
| HTML-041-14 | Security and regression | Preview runs only on an explicit user gesture; failures do not destabilize DSH; other language and 0.4.0 HTML capabilities regress cleanly |

## Structure and Navigation Behavior

### Hover

Hover uses `vscode-html-languageservice` with its bundled web custom data and the current document text. It resolves the token under the pointer as:

- a tag name, including the name inside a matching end tag;
- an attribute name;
- a known enumerated attribute value;
- a named character reference.

The tooltip shows the real description supplied by the bundled data. Markdown links in the data are rendered as readable text; no network request is made. When the data has no description for the token, no tooltip is shown rather than a fabricated explanation. Hover is active only while HTML assistance is enabled, and only in HTML documents.

### Outline

The Outline is built from `vscode-html-languageservice` document symbols for the current document text. Only element symbols are shown. Each node exposes its tag name and (when present) its `id`/`class` hint, and the tree preserves the document's nesting to any depth.

The Outline panel opens from an HTML toolbar control and can be collapsed. Expansion state is local to the open panel. Activating a node:

- maps the symbol's start position to a CodeMirror document offset;
- sets the caret at the start-tag name (not the selection range used for the label);
- scrolls the line into view and focuses the editor.

Outline data is recomputed from the live document when it changes; stale async work cannot move the caret after the tab changed.

### Breadcrumbs and current-element scope

The breadcrumb bar above the editor shows the parsed ancestor chain of the element containing the caret, using lower-case tag names and `html > body > section > span` text. Clicking an ancestor places the caret at that element's start tag.

The element's full source range receives a subtle decoration while the caret is inside it. Element matching uses the Lezer HTML tree, so the range ends at the matching end tag when one exists and at the element end otherwise. Decoration updates in the same editor update as the selection, and is only installed while HTML assistance is active.

### Folding and matching-tag jump

Element folding already comes from `@codemirror/lang-html`. v0.4.1 adds a fold range for multiline `Comment` nodes, so `<!--` through `-->` folds as one region. Folding never edits text.

A command (`Mod-Shift-\` on macOS, `Ctrl-Shift-\` on Windows/Linux) finds the `OpenTag`, `CloseTag`, or `SelfClosingTag` at the caret and moves the caret to the corresponding tag name. It uses the parsed tree and honors the parser's treatment of optional closures; when the parser cannot determine a unique partner, the command does nothing and leaves the selection unchanged.

### Selection expansion and shrinking

Expansion and shrinking are pure syntax operations over the Lezer tree. For a caret or selection inside an element, the command chooses the next larger structural level from:

1. attribute value content;
2. the complete attribute;
3. the start tag (including `<` and `>`);
4. the complete element (start tag through matching end tag).

When the current selection already equals a level, the command selects the next larger level. Shrinking reverses that sequence. At the top level no further expansion occurs. Both commands only change selection and never touch history, text, or the document. Bindings are `Shift-Alt-ArrowRight` and `Shift-Alt-ArrowLeft`.

### Local resource and anchor navigation

Navigation runs on `Mod`/`Ctrl`-click and on `F12` while the caret is on a URL-bearing attribute value (`href`, `src`, `poster`, `data`, `action`, `formaction`, `cite`, `background`), or on the attribute itself.

Resolution rules:

- `#id` is a same-document navigation. The target is the first element whose `id` attribute matches exactly; duplicate ids are an error, and text that merely equals the id is never a target.
- A relative path is resolved against the current file's directory and normalized. Paths containing a scheme (`http:`, `https:`, `mailto:`, `tel:`, `javascript:`, `data:`), protocol-relative paths, root-absolute paths, and paths that escape the Session workspace are refused with a message and no navigation.
- Query and fragment suffixes are removed from a file path for existence checking and tab opening.
- The target must exist as a file in the Session workspace; the Host's file metadata call decides existence. Directories and missing files produce a message.
- Opening a local target uses the existing native resource-tab bridge (`sidebarRight.openResource`) and does not execute, render, or preview the target. It creates no semantic relationship between HTML and the target file.

`F12` is shared with other languages only by binding; the HTML extension is only installed in HTML editors. The existing Python navigation path is unchanged.

## Formatting

Formatting uses `vscode-html-languageservice`'s document formatter with:

- `tabSize` from the accepted indentation setting;
- `insertSpaces: true` (the editor's indentation setting is defined as spaces);
- `preserveNewLines: true` with a bounded limit;
- `unformatted` and `contentUnformatted` covering `pre`, `textarea`, `script`, and `style`;
- `wrapAttributes: 'auto'`, `indentInnerHtml: false`, and no template-language transformation.

`Format Document` (`Shift-Alt-F`) replaces the whole document with the formatted text in one undoable transaction. The operation is skipped with a message for an empty document or when the result would be identical.

`Format Selection` (`Mod-K Mod-F`, and the toolbar action when a selection exists) formats only the selected lines. Before applying, CodeCraft verifies that every formatter edit lies inside the selected source range; a formatter result that would change text outside the selection is rejected with a message. A selection that ends inside a tag or attribute is reported as unsupported rather than silently expanded. Formatting never runs while the editor is read-only.

Formatting twice produces identical text. Undo restores the exact pre-format text in one step. The shared indentation setting is the only indentation input; no HTML-specific indentation sub-setting is added.

## Emmet and Template Insertion

A small browser-local Emmet expander implements exactly the required markup subset:

- element names, including implicit `div` for a leading class or id;
- child `>`, sibling `+`, repetition `*n`;
- class `.name`, id `#name`;
- attribute groups `[name=value ...]` with optional quoted values;
- text `{...}`;
- `$` numbering inside names, classes, ids, attribute values, and text, with repeated `$` zero-padding.

The expander produces HTML with the active two- or four-space indentation. Void elements never receive a closing tag. Empty element bodies become CodeMirror snippet fields in document order, so the caret starts at the first editable content position and later fields can be reached with the normal snippet keymap. A text body is inserted literally. Expansion is offered as an explicit `Emmet: …` completion candidate only when the abbreviation before the caret parses, and through a dedicated command on `Mod-Alt-E`. It never intercepts plain Tab or ordinary indentation.

The HTML5 template command (`Mod-Alt-T` on macOS, `Ctrl-Alt-T` on Windows/Linux) inserts `<!doctype html>` with `html`/`head`/`body`, a charset `meta`, a viewport `meta`, and an editable title. In a blank document it inserts the full skeleton. In a non-empty document it replaces the current selection only and never replaces the whole document. The existing snippet completion for the page skeleton remains available and also replaces only the detected abbreviation range.

## Preview in Browser

### Integration point

DSH publishes the native document-preview header list slot `sidebar.right.tab.document.actions`, whose owner prop is `absolutePath`. v0.4.1 registers one action into that slot:

- it renders only when the path has an `.html` or `.htm` suffix (case-insensitive);
- it renders only when the CodeCraft editor body currently owns that absolute path (the editor is the active renderer for the tab);
- it uses the localized label **Preview in Browser** / **在浏览器中预览** and an external-link glyph;
- it is a real keyboard-focusable button with a disabled/busy state.

No DSH internal DOM is queried or modified. The action is not placed in the plugin settings page and is not shown for other languages or other renderers.

### Save and open flow

The editor body publishes a preview controller for its absolute path containing its live dirty state, a save-for-preview operation, and the currently known absolute path. The header action reads that controller through a small external store.

On click:

1. If the editor is read-only or not in editing state, report "Unable to preview this file" and stop.
2. If the document is dirty, the body shows a save confirmation banner:
   - **Save and Preview** saves through the existing save path, including the current base version and encoding settings.
   - **Cancel** stops without saving or changing text.
   - A save failure or version conflict stops preview and keeps the draft.
3. If the document is not dirty, continue immediately.
4. Call the public Session Remote `openWorkspacePath({ path: absolutePath })` with no `action` and no application override. The Host verifies the path through the composed filesystem and hands the file to the operating system's file-type association, which is the default browser for `.html` on a normally configured desktop.
5. A successful call flashes a short status message; a failed call reports "Unable to open HTML in default browser" and leaves the document and DSH state unchanged.

Preview always shows the most recently saved disk content. CodeCraft never auto-saves in the background to satisfy a preview request and never copies the file to a temporary directory. It does not start a server, embed a WebView, or execute the HTML in the DSH renderer. An unnamed/untitled document cannot occur in this renderer because every tab has a Session file address; when the Host has not yet reported an absolute path, the action is not rendered.

The Session Remote is accessed through a nested `ctx.inject` so a deployment without that public service still gets the full editor and every non-preview feature; only the preview action is absent. Failures are handled locally and never reject a plugin lifecycle effect.

## Settings, Lifecycle, and Isolation

- No new settings group or sub-switch is added. The existing single `Enable HTML Editing Assistance` switch (default `true`) controls every v0.4.1 HTML capability.
- When assistance is disabled, the HTML language compartment is empty: Hover, Outline, breadcrumbs, scope highlight, selection commands, formatter, Emmet, template command, and HTML navigation are removed. The Preview action is hidden because the CodeCraft body does not publish a controller for a disabled HTML module. Ordinary editing, saving, drafts, conflicts, AutoSave, themes, bracket pairing, and indentation remain available.
- HTML extension construction remains guarded. An initialization error degrades to the empty assistance compartment and the existing `HTML: Error` status; text stays editable and saveable.
- Navigation requests are synchronous over the current document except for the file existence check, which is bound to the tab's abort signal and re-checked against the current tab/path before opening. A response for a replaced document or tab is discarded.
- Outline and breadcrumb data are derived from `EditorState` and never cross the tab boundary.
- No Host route, language server, process, network request, runtime download, or permission change is added. `vscode-html-languageservice` and its data ship inside the client bundle.
- Python intelligence, Java assistance, and every generic editor behavior remain unchanged. The Preview action depends on the DSH document header and Session Remote contracts, not on Python or Java.

## Explicitly Out of Scope

- HTML diagnostics, linting, accessibility rules, refactoring, and Rename (reserved for 0.4.2);
- HTML ↔ CSS ↔ JavaScript semantic indexing, selector or DOM-use analysis, page hot reload, preview-to-source synchronization, development servers, and Vite/React/Vue-specific behavior;
- executing HTML or embedded JavaScript inside DSH, embedded WebViews, or temporary-directory copies;
- Emmet features outside the listed subset: climb-up, grouping, implicit tag lists, lorem, stylesheet abbreviations, and per-language Emmet configuration;
- configurable per-feature switches, custom browser selection, or hard-coded Chrome/Safari/Edge launching;
- a Host HTML provider, language server, binary runtime, SDK, or first-use download.

## Implementation Sequence

1. Add `vscode-html-languageservice` as a pinned development dependency and confirm the client bundle remains browser-only.
2. Add a shared HTML service helper for creating text documents, converting positions, and caching the parsed document per editor state.
3. Add Hover, Outline extraction, breadcrumbs/scope decoration, comment folding, matching-tag jump, and selection expansion/shrink features under `src/client/languages/html/features/`.
4. Add local resource and anchor resolution plus the native-tab bridge and focused feedback.
5. Add document and selection formatting commands using the accepted indentation setting.
6. Add the Emmet subset expander, completion source integration, command, and HTML5 template command.
7. Extend `htmlEditorLanguage`'s support/extensions and compose the feature enablement with the existing HTML assistance compartment.
8. Add the preview controller/store state machine, the CodeCraft body save-confirmation flow, and the native header action registered through the public slot with optional Session Remote injection.
9. Add localized labels, toolbar/outline/breadcrumb styling, and keep all new UI inside the existing CodeCraft root.
10. Add focused Vitest coverage, run typecheck and the full repository checks, and record Desktop acceptance in [validation.md](validation.md).

## Implementation Outcome

The delivered implementation keeps the feature client-only and reuses the existing HTML module and native document header:

```text
src/client/languages/html/
├── index.ts                       configured HTML support and feature composition
├── service.ts                     bundled language-service document/parse cache
├── preview.ts                     header action store and optional Session Remote opener
└── features/
    ├── hover.ts                   standard tag, attribute, and value Hover
    ├── outline.ts                 nested element tree from document symbols
    ├── structure.ts               breadcrumbs, scope decoration, comment folding,
    │                              matching-tag jump, and selection expansion
    ├── navigation.ts              local resource and same-document id navigation
    ├── formatting.ts              whole-document and selection formatting
    ├── emmet.ts                   required Emmet subset and HTML5 template
    ├── host.ts                    per-editor tab bridge for navigation feedback
    └── (existing completion, indentation, and tag-closing features)
```

The native integration adds one list-slot action (`sidebar.right.tab.document.actions`) in `src/client/core/plugin.ts` through `PreviewInBrowserAction.tsx`. `CodeCraftBody.tsx` owns the live dirty/save state, the save-before-preview banner, the HTML breadcrumb toolbar, and the Outline panel. No Host route, provider, process, or setting was added.

`npm run check` passes on the implementation revision, including 226 Vitest tests. Native macOS and Windows DSH Desktop acceptance remains required and is recorded in [validation.md](validation.md).

## Definition of Done

v0.4.1 is complete only when HTML-041-01 through HTML-041-14 pass; Hover, Outline, breadcrumbs, scope highlight, comment folding, matching-tag jump, and selection expansion work in enabled HTML editors; relative local resources and same-document ids navigate with accurate feedback and safety limits; document and selection formatting honor the two- or four-space setting, preserve protected content, are idempotent, and are undoable; Emmet and template insertion use explicit triggers and never intercept ordinary Tab; the native header shows **Preview in Browser** only for the active CodeCraft HTML editor and opens the saved file through the operating system default association after dirty-state protection; disabling assistance or losing the optional Session Remote preserves ordinary editing and saving; Python and Java remain isolated; automated checks pass; and native macOS and Windows acceptance is recorded.
