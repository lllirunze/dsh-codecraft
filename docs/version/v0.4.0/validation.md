# DSH CodeCraft v0.4.0 Validation

| Field | Value |
| --- | --- |
| Target version | 0.4.0 |
| Baseline | 0.3.3 |
| Status | Planned; no implementation evidence recorded |
| Design | [design.md](design.md) |

## Evidence Rules

- Leave every item unchecked until the named behavior has been observed in automated tests or DSH Desktop.
- Record actual commands, platform, DSH version, and failure or degradation details with the completed evidence.
- A library capability or screenshot alone is not evidence that CodeCraft integrates the behavior correctly.
- Test effective editor behavior, not only candidate data, setting serialization, or the visible switch.
- Native acceptance is required independently on macOS and Windows.
- Keep package metadata, changelog release claims, and README feature claims unchanged until their release gates are satisfied.

## Requirement Traceability

| Requirement | Automated evidence | Desktop evidence |
| --- | --- | --- |
| HTML-040-01 | Language registration, syntax tree, highlighting classes, nested parser tests | HTML/HTM rendering and embedded style/script inspection |
| HTML-040-02 | Context and filtering completion tests | Typed `<bu` acceptance and caret behavior |
| HTML-040-03 | Per-element/global metadata and duplicate filtering tests | Anchor/input/ARIA completion scenarios |
| HTML-040-04 | Enum, Boolean, quoting, and entity application tests | Target, input type, required, and `&am` scenarios |
| HTML-040-05 | Close-tag, void, optional-end, and incomplete-state tests | Start-tag and `</` typing scenarios |
| HTML-040-06 | Parsed matching and quote transaction tests | Matching highlight, wrapping, deletion, and skip-over checks |
| HTML-040-07 | Two-/four-space transaction and Undo tests | Nested, closing-tag, and paired-tag Enter checks |
| HTML-040-08 | Toggle-comment, Enter, and Undo tests | Shortcut/command acceptance in comments |
| HTML-040-09 | Snippet content, selection, indentation, and Undo tests | Explicit selection without document overwrite |
| HTML-040-10 | Resolver, Host schema, mutation, UI, and compartment tests | Persistence, rejection, open-tab, and future-tab checks |
| HTML-040-11 | Lifecycle, isolation, and regression suites | Offline, multi-tab, special-path, and cross-platform checks |

## Automated Validation

### Registration, parsing, and isolation

- [ ] `.html` and `.htm` resolve to the dedicated `html` adapter; mixed-case extensions and paths containing spaces or non-ASCII characters resolve correctly.
- [ ] Other extensions retain their existing adapters and duplicate IDs or extensions are still rejected.
- [ ] Tags, attributes, quoted and unquoted values, text, comments, and DOCTYPE produce the expected HTML syntax nodes and highlighting categories.
- [ ] Embedded `<style>` content uses nested CSS parsing and supported `<script>` content uses nested JavaScript parsing without activating standalone CodeCraft language modules.
- [ ] HTML extension construction failure falls back to editable, saveable plain text and reports the error state.
- [ ] The production package contains no HTML language server, browser runtime, downloader, or HTML Host provider.

### Completion

- [ ] `<bu` includes `button`, filters by the typed prefix, replaces only the incomplete name, and leaves the caret in the correct position.
- [ ] Explicit completion in valid text/tag contexts offers standard HTML5 tags without appearing inside comments or ordinary attribute values.
- [ ] `</` prioritizes the innermost valid open element and does not offer already closed or void elements as required closures.
- [ ] `<a hr` offers `href`; `<input ty` offers `type`; global `id`, `class`, `title`, `lang`, `role`, and required common `aria-*` names are available in valid contexts.
- [ ] Attribute-name matching and duplicate filtering are case-insensitive; an existing attribute is excluded while the attribute currently being edited remains completable.
- [ ] Attribute completion changes only the active token and does not reorder, normalize, or duplicate surrounding attributes.
- [ ] `target="` offers `_blank` and `_self`; input `type="` offers required common input types.
- [ ] Single-quoted, double-quoted, and unquoted enumerated values preserve their context and never create duplicate closing quotes.
- [ ] Boolean attributes such as `required`, `disabled`, `checked`, and `multiple` insert as bare names rather than forced string assignments.
- [ ] `&am` offers and applies `&amp;`; the entity source covers the required common references, includes a semicolon, and replaces only the entity prefix.
- [ ] One effective HTML source produces one candidate set and one popup without duplicate standard candidates.

### Tags, matching, quotes, and indentation

- [ ] Completing `<div>` creates `</div>` with the caret in the content position as one undoable user action.
- [ ] Every canonical HTML void element is covered and never receives an automatic end tag.
- [ ] Optional-end elements are not treated as requiring automatically inserted explicit close tags.
- [ ] Self-closing, incomplete, mismatched, and rapidly edited tags fail conservatively without corrupting text.
- [ ] Matching parsed start and end tag names highlight together; identical tag text in comments or text content does not create a false match.
- [ ] Selection wrapping, paired deletion, and quote closer skipping remain correct for both single and double quotes.
- [ ] Enter inside nested elements uses the configured two-space indentation.
- [ ] The same nested, closing-tag, and paired-tag Enter cases use four spaces after a live setting change.
- [ ] `<div>|</div>` expands to an indented content line with the closing tag aligned and the caret on the content line.
- [ ] Closing tags dedent to their matching structural level, including nested and incomplete editing states where the parser has a safe answer.
- [ ] HTML Enter changes only the active edit location and does not format or normalize the rest of the document.
- [ ] HTML indentation falls back to the common safe behavior when parser context is inconclusive.
- [ ] Each structural Enter edit is reverted by one Undo and restored by Redo.

### Comments and snippets

- [ ] The existing comment command inserts and removes `<!-- -->` for a caret and for single- and multiline selections.
- [ ] Enter inside an HTML comment preserves an editable comment structure without damaging delimiters.
- [ ] Comment insertion or removal is one undoable transaction and ordinary Undo/Redo remains intact.
- [ ] Explicit completion offers HTML5 DOCTYPE, page skeleton, meta charset, stylesheet link, and form snippets.
- [ ] Snippets use the active two- or four-space indentation and place editable fields and the final caret correctly.
- [ ] Applying a snippet is one undoable transaction.
- [ ] Snippet candidates never insert without explicit acceptance and never replace unrelated content or an entire non-empty document.

### Setting, live state, and failure behavior

- [ ] Missing, malformed, and partial configuration resolves `htmlEditingAssistance.enabled` to `true`; explicit Boolean values are preserved.
- [ ] The Host schema declares the HTML group, defaults it to `true`, persists it, and emits live accepted snapshots.
- [ ] The settings store writes only `['htmlEditingAssistance', 'enabled']` and retains the last accepted value after a rejected or throwing mutation.
- [ ] The settings UI contains exactly one HTML assistance switch with the required English and Chinese text and no sub-switches.
- [ ] The switch is disabled while the form is loading, read-only, or saving and exposes the existing failure message after rejection.
- [ ] An HTML editor created while enabled installs all v0.4.0 HTML extensions and reports `HTML: Ready` only after successful installation.
- [ ] An HTML editor created while disabled omits HTML-specific extensions, reports `HTML: Disabled`, and retains common text editing and saving.
- [ ] Toggling off reconfigures every open HTML tab without changing text, selection, scroll, history, dirty state, drafts, read-only state, or save state.
- [ ] Toggling on restores every HTML feature in open tabs without recreating the `EditorView`; future tabs use the latest accepted value.
- [ ] Reconfiguration failure installs the empty safe fallback, reports `HTML: Error`, and permits a later successful retry.
- [ ] Rapid accepted changes converge on the latest value without duplicate providers, handlers, or subscriptions.
- [ ] Non-HTML tabs display no HTML status and perform no HTML reconfiguration.

### Regression and repository checks

- [ ] Manual save, AutoSave, draft restoration, conflict protection, read-only handling, newline/BOM preservation, Undo/Redo, search, folding, and tab switching regressions remain green.
- [ ] Python Intelligence settings, completion, Hover, navigation, LSP cancellation, and lifecycle tests remain green.
- [ ] Java assistance settings, completion, snippets, Structured Javadoc, and live gating tests remain green.
- [ ] No HTML test or runtime path performs network access, subprocess execution, or access to another file.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes with the final test count recorded here.
- [ ] `npm run build` and `npm run verify` pass.
- [ ] `npm run check` and `git diff --check` pass.

## macOS Desktop Acceptance

- [ ] Open `.html` and `.htm` files and confirm HTML, DOCTYPE, comments, attributes, values, and embedded style/script highlighting.
- [ ] Exercise tag, attribute, enum value, Boolean attribute, entity, closing-tag, and every required snippet completion using keyboard selection and Undo.
- [ ] Verify matching tags, quote wrapping/deletion/skip-over, HTML comments, and Enter behavior with both two- and four-space settings.
- [ ] Confirm void tags receive no close tag and optional-end markup remains usable without forced explicit closures.
- [ ] Open multiple HTML tabs, switch rapidly, edit incomplete markup, and confirm there is one completion popup and no cross-tab state.
- [ ] Open and save files whose paths contain spaces and Chinese characters.
- [ ] Turn HTML assistance off and on with existing and new HTML tabs; confirm immediate behavior and truthful Disabled/Ready status without lost edits.
- [ ] Restart DSH once with the setting off and once with it on; confirm the UI and effective editor state retain the accepted value.
- [ ] Simulate a rejected settings write and an HTML initialization failure; confirm restoration or Error fallback and continued editing and saving.
- [ ] Disconnect networking and confirm every v0.4.0 HTML feature remains available with no HTML process.
- [ ] Keep Python and Java tabs open during HTML toggles and confirm their status, settings, and behavior do not change.

## Windows Desktop Acceptance

- [ ] Repeat the complete macOS parsing, completion, tags, quotes, indentation, comments, snippets, setting, status, persistence, failure, and isolation matrix on Windows.
- [ ] Confirm CRLF HTML files retain their newline style through completion, structural Enter, toggling, Undo/Redo, and saving.
- [ ] Confirm Windows paths with drive letters, spaces, and Chinese characters work in `.html` and `.htm` tabs.
- [ ] Confirm multiple tabs and rapid setting changes do not create duplicate completion popups or lose edits.
- [ ] Confirm Task Manager shows no CodeCraft-started HTML language server, browser, or other HTML process and all v0.4.0 behavior works offline.

## Packaging and Documentation

- [ ] Packed artifacts include the dedicated HTML client module and required locked JavaScript dependencies only.
- [ ] Dependency licenses and integrity are reviewed; published functionality remains offline after installation.
- [ ] README files describe the HTML feature set and switch only after implementation and required validation are complete.
- [ ] Limitations continue to place Hover, Outline, Emmet, formatting, diagnostics, refactoring, preview, and cross-language association outside v0.4.0.
- [ ] Changelog, package version, lockfile version, tag, Release title, and Release heading remain unchanged until the release gate passes and then all use `0.4.0`.

## Release Gate

Do not release v0.4.0 while any HTML-040 requirement is incomplete; HTML uses competing completion providers; void or optional-end handling is unsafe; structural Enter ignores the active indentation setting; snippets can overwrite unrelated content; the only HTML switch is missing, defaults off, fails to persist, or does not update open tabs; status claims Ready after failure; disabling or failing the module breaks common editing or saving; Python or Java behavior regresses; runtime network, subprocess, or external language-server behavior is introduced; automated checks fail; or either macOS or Windows native acceptance is missing.
