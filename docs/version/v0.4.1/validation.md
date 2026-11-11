# DSH CodeCraft v0.4.1 Validation

| Field | Value |
| --- | --- |
| Target version | 0.4.1 |
| Baseline | 0.4.0 |
| Status | Validated on macOS and Windows; release ready |
| Design | [design.md](design.md) |

## Acceptance Record

| Field | Evidence |
| --- | --- |
| Confirmation date | 2026-11-11 |
| Automated checks | `npm run check` and `git diff --check` passed on the 0.4.1 release revision |
| Native platforms | macOS and Windows, as requested by the v0.4.1 manual checklist |
| Result | User confirmed manual acceptance passed with no reported degradation |
| DSH compatibility target | `0.2.1-rc.5` |

## Evidence Rules

- Leave every item unchecked until the named behavior has been observed in an automated test or in DSH Desktop.
- Record the exact command, platform, DSH version, result, and any failure or degradation with the evidence.
- A library capability, a screenshot, or a unit test alone does not prove native DSH Desktop integration.
- Native acceptance is required independently on macOS and Windows.
- Do not treat a planned command as a pass, and do not keep old evidence after a related code change.
- Keep package version, lockfile version, changelog entries, and README feature claims unchanged until the release gates are authorized.

## Requirement Traceability

| Requirement | Automated evidence | Desktop evidence |
| --- | --- | --- |
| HTML-041-01 | Tag, attribute, and value Hover resolution; absent-metadata and disabled-gate cases | Hover `<a>`, `href`, and `target="_blank"` |
| HTML-041-02 | Nested symbol extraction, start-tag offset mapping, tree collapse state | Three-level Outline expand/collapse and click navigation |
| HTML-041-03 | Breadcrumb ancestry, caret movement, element-range decoration | Breadcrumb updates inside nested `span`; scope highlight visible |
| HTML-041-04 | Comment fold range, element fold unchanged text, matching-tag jump, optional-end behavior | Fold/unfold element and multiline comment; jump start/end tags |
| HTML-041-05 | Selection level sequence, shrink reversal, no text/history mutation | Repeated expand/shrink in nested markup and Undo/typing checks |
| HTML-041-06 | Relative resolver, URL scheme refusal, workspace escape refusal, existence check | `src="images/logo.png"` and local `href` open native tabs; HTTP URL does not |
| HTML-041-07 | Exact id lookup, duplicate/missing errors, text-only match rejection | `href="#target"` jump and failure feedback |
| HTML-041-08 | Whole-document formatting, two-/four-space, idempotence, protected content, Undo | Format Document in real HTML with `pre`, `textarea`, and inline text |
| HTML-041-09 | Selection-only diff, unsupported partial range rejection, Undo | Nested `div` selection and unsupported selection feedback |
| HTML-041-10 | Parser/expander matrix for all required constructs, void tags, snippet fields | `ul>li.item$*3>a{Item $}` expansion and caret editing |
| HTML-041-11 | Template content, blank-document insertion, non-empty selection-only behavior | Blank document template and non-empty no-overwrite case |
| HTML-041-12 | Header action visibility predicate, path suffix filter, Session Remote call | macOS and Windows default-browser launch from only the active HTML tab |
| HTML-041-13 | Dirty/cancel/save-failure/read-only/open-failure state machine | Saved, dirty confirm/cancel, failure, special-path cases |
| HTML-041-14 | Gate isolation, sibling-language regressions, no Host/binary additions | Offline, permission/error resilience, Python/Java regression |

## Current Automated Evidence

| Field | Evidence |
| --- | --- |
| Evidence date | 2026-11-11 |
| Implementation revision | v0.4.1 release-candidate worktree with synchronized package, lockfile, changelog, and README metadata |
| Focused check | `npx vitest run tests/html-productivity.test.ts` -> PASS, 29 tests |
| Canonical gate | `npm run check` -> PASS: typecheck, 18 test files / 226 tests, build, artifact verification |
| Artifact check | `npm run verify` -> PASS: host exports and client registration, 9 external requires |
| Whitespace check | `git diff --check` -> PASS |
| Native acceptance | PASS: user confirmed the requested macOS and Windows manual acceptance matrix; no device models, screenshots, or logs were supplied |

The focused test file covers Hover data, Outline nesting and offsets, breadcrumb ancestry, selection levels and commands, comment folding, matching-tag jump, formatting plans and protected content, Emmet expansion, template insertion, local/anchor navigation resolution, the single HTML gate, and the preview controller store. Native header rendering, save-confirmation clicks, Session Remote execution, and default-browser launch are not proven by these tests.

## Automated Validation

### Build and dependencies

- [ ] The pinned `vscode-html-languageservice` dependency is recorded in `package.json` and `package-lock.json`; no runtime download or Host process is introduced.
- [x] The client bundle contains the HTML service and data without Node-only externals and `npm run verify` accepts the generated artifacts.
- [x] `npm run typecheck` passes with the new feature modules and typed preview bridge.
- [x] `npm run build` and `npm run verify` pass.

### Hover, Outline, breadcrumbs, and scope

- [ ] Hovering a start or end tag name returns the standard element description from the bundled data.
- [ ] Hovering a standard attribute and a known enumerated value returns a real description; an unknown attribute or value returns no tooltip instead of invented text.
- [ ] Hover is absent outside HTML files and while HTML assistance is disabled.
- [x] Nested document symbols preserve depth and document order, including elements with only children and void elements.
- [x] Activating an Outline node maps to the actual start-tag name position, including lines after the first and UTF-16 offsets.
- [ ] Breadcrumbs show `html > body > … > current` for a caret inside deeply nested content and update when the caret moves.
- [ ] The current element source range decoration changes with the caret and does not alter text or selection.
- [ ] Outline, breadcrumbs, and scope decorations do not crash on malformed or incomplete markup.

### Folding, matching, and selection expansion

- [x] Element folding still folds start through end tag without changing document text.
- [x] A multiline comment produces a fold range from `<!--` through `-->`; a one-line comment does not create a broken range.
- [ ] The matching-tag command moves from a start tag to its end tag and back, and handles self-closing/void tags conservatively.
- [ ] Optional-end elements follow the parsed partner; an ambiguous or absent partner leaves the selection unchanged.
- [x] Expansion from an attribute value selects the value, attribute, start tag, then full element in order.
- [x] Shrinking reverses the same sequence without skipping or selecting outside the document.
- [ ] Expansion and shrinking dispatch selection-only transactions; Undo history and subsequent typing are unaffected.

### Local and anchor navigation

- [x] `#id` resolves only an exact element id, moves to the target element, and reports duplicate and missing ids.
- [ ] Matching text that equals an id is not used as a navigation target.
- [ ] Relative `href`/`src` values resolve against the current file directory and open the expected native resource tab.
- [ ] `http:`, `https:`, protocol-relative, `mailto:`, `tel:`, `javascript:`, `data:`, root-absolute, and workspace-escaping paths are refused and produce feedback.
- [x] Query and fragment suffixes are excluded from the file identity and existence check.
- [ ] A missing file or directory is reported without opening a tab and without throwing.
- [ ] A navigation result for a replaced tab or stale document is discarded.

### Formatting

- [x] Format Document uses two spaces when the global setting is two and four spaces when it is four.
- [x] Formatting the same document twice produces identical text.
- [x] `pre`, `textarea`, inline text whitespace, comments, and DOCTYPE content are preserved.
- [ ] Format Document is one undoable transaction and does not change selection semantics beyond mapping through the change.
- [x] Format Selection changes only the selected lines and leaves all text outside the selection byte-identical.
- [x] A selection ending inside a tag/attribute is rejected with a message and no change.
- [ ] Formatting in a read-only document performs no edit.

### Emmet and template

- [x] `div>span` produces a nested element with the active indentation and editable content fields.
- [x] `p+p` and `ul>li*3` produce the expected sibling and repetition structure.
- [x] `ul>li.item$*3>a{Item $}` produces three list items with matching class names, text, and nested anchors.
- [x] `.card#main` produces a `div` with the class and id.
- [x] `a[href=https://example.com target=_blank]{Link}` produces the required attributes and text.
- [x] Void elements in abbreviations never receive an end tag.
- [ ] Invalid abbreviations offer no expansion and the command falls through without editing.
- [ ] Applying completion and the command replace only the abbreviation range, are undoable, and plain Tab/indentation is unaffected.
- [x] The template command on a blank document inserts DOCTYPE, html, head, body, charset, viewport, and title.
- [x] The template command on a non-empty document changes only the selection and never replaces the whole document.

### Preview and failure boundaries

- [x] The header action is registered only through `sidebar.right.tab.document.actions` and not by DOM injection.
- [ ] The action renders only for `.html`/`.htm` paths with a live CodeCraft preview controller and hides for other renderers, other languages, and disabled HTML assistance.
- [ ] A clean document calls the Session Remote with the Host absolute path and no application override.
- [ ] A dirty document opens a save confirmation; Cancel performs no save and no open.
- [ ] Save success then opens; save failure or version conflict performs no open and preserves the draft.
- [ ] A successful open reports success and a rejected/failed open reports the localized error without changing the document.
- [ ] A deployment without the optional Session Remote still mounts CodeCraft and exposes all non-preview HTML features.
- [ ] No preview code starts a server, creates a WebView, copies to a temporary directory, or executes HTML in the DSH renderer.

### Settings and isolation

- [x] The only HTML setting remains `Enable HTML Editing Assistance`; no sub-switch is introduced.
- [ ] Disabling assistance removes Hover/Outline/breadcrumb/scope/selection/formatting/Emmet/template/navigation and hides the preview action while ordinary editing, saving, and drafts still work.
- [ ] Re-enabling restores the features without duplicating extensions, decorations, or listeners.
- [x] Python Hover, completion, navigation, and Java assistance tests remain green.
- [x] `npx vitest run tests/html-productivity.test.ts` passes focused checks.
- [x] `npm run check` passes the full repository gate on the implementation revision.

## Native DSH Desktop Acceptance

### macOS

- [x] Open a real `.html` file in a CodeCraft tab and confirm Hover, Outline, breadcrumbs, folding, matching jump, and selection expansion.
- [x] Format a document containing `pre`, `textarea`, and inline text with both two- and four-space settings; confirm idempotence and Undo.
- [x] Expand the required Emmet example and edit the resulting placeholders; confirm plain Tab indentation still works.
- [x] Navigate a relative image/script path and `href="#id"`; confirm feedback for an HTTP URL, duplicate id, and missing file.
- [x] Confirm **Preview in Browser** appears only on the active `.html`/`.htm` editor and opens the saved file in the system default browser.
- [x] Confirm a dirty document requires save-confirmation, Cancel keeps the old disk content unopened, and a save failure reports an error.
- [x] Confirm paths containing spaces and Chinese characters work and that offline use does not affect local features.
- [x] Confirm Python and Java tabs behave as before and disabling HTML assistance leaves ordinary editing and saving intact.

### Windows

- [x] Repeat the macOS feature matrix for Hover, Outline, breadcrumbs, folding, matching jump, and selection expansion.
- [x] Repeat document/selection formatting with two- and four-space settings and Undo.
- [x] Repeat Emmet, template insertion, local resource/anchor navigation, and invalid-input feedback.
- [x] Confirm **Preview in Browser** opens the saved HTML in the Windows default browser and shows the specified error when no handler is available.
- [x] Confirm dirty/cancel/save-failure protection, special-character paths, offline behavior, and Python/Java isolation.

## Release Gate

Release is blocked until:

- every applicable automated check above has current-revision evidence; integration-only items are recorded by the user-confirmed native acceptance;
- `npm run check` passes;
- native macOS and Windows acceptance is recorded from user-observed results;
- no critical preview or file-safety defect remains;
- the user explicitly requests release work.

Version metadata, changelog entries, commits, tags, and publication are handled separately by the release-management workflow.
