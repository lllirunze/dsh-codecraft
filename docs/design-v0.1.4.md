# DSH CodeCraft v0.1.4 Indentation Improvements Design

| Field | Value |
| --- | --- |
| Status | Implemented; automated validation and macOS Desktop acceptance passed |
| Target version | 0.1.4 |
| Baseline | 0.1.3 |
| Platforms | DSH Desktop on macOS and Windows |
| Release theme | Predictable, configurable, language-neutral indentation |

## Outcome and Scope

v0.1.4 establishes one shared indentation policy for every CodeCraft editor. New indentation always uses spaces, defaults to two spaces, and can be changed to four spaces in the existing CodeCraft settings section. Enter, Tab, and Shift+Tab must behave consistently for a single caret or a multiline selection.

The implementation remains language-neutral. It may reuse CodeMirror 6 transactions, bracket matching, selection mapping, and extension points, but it must not add Python colon rules, Java or C++ block policies, YAML or XML hierarchy rules, syntax-tree formatting, project configuration discovery, or whole-file formatting.

## User-Facing Behavior

### Indentation settings

CodeCraft Settings gains an **Indentation** group beside Auto Save:

| Setting | Behavior |
| --- | --- |
| Indentation character | Fixed to spaces; no tab-character option |
| Indentation width | Select two or four spaces; default is two |

The setting is persisted through DSH's existing `configForms` integration and applies immediately to every open editor. Changing the width affects only future editing operations. It never rewrites existing text or silently converts historical tab characters.

```ts
export const INDENT_SIZE_OPTIONS = [2, 4] as const
export type IndentSize = (typeof INDENT_SIZE_OPTIONS)[number]

export interface IndentationSettings {
  useSpaces: true
  indentSize: IndentSize
}
```

Missing or malformed values resolve to `{ useSpaces: true, indentSize: 2 }`.

### Enter and bracket expansion

Normal Enter inherits the current line's leading whitespace. Enter after an unmatched opening `{`, `[`, or `(` adds one configured indentation unit. Enter between an empty pair expands it into three lines, places the closer at the opener's indentation, and leaves the caret on the indented middle line:

```text
before:  function test() {|}

after:   function test() {
           |
         }
```

Typing or skipping a closing delimiter on an otherwise blank indented line aligns it with its matching opener. The existing close-bracket behavior must continue to avoid duplicate delimiters. These rules use generic delimiter structure only and do not infer language semantics.

### Tab and Shift+Tab

For leading indentation with current width `n` and configured unit `w`, Tab moves to the next strictly greater multiple:

```text
next(n, w) = (floor(n / w) + 1) * w
```

Shift+Tab moves to the previous strictly smaller multiple without going below zero:

```text
previous(n, w) = max(0, (ceil(n / w) - 1) * w)
```

This means width two maps `1 → 2`, `2 → 4`, and `3 → 4`; reverse indentation maps `1 → 0`, `2 → 0`, and `3 → 2`. A caret inside leading whitespace follows the adjusted boundary. A caret in code content inserts one space-only indentation unit without replacing code.

For a multiline selection, each included line calculates its own boundary. A selection ending at column zero does not modify that final line. Blank lines remain blank, the selection is mapped across the edit, and the entire operation is one CodeMirror transaction so one Undo restores it. Repeated Tab and Shift+Tab operations must remain stable.

## Architecture Decisions

The current Host detects a file's indentation and sends `TextFileSnapshot.indent` to the browser. v0.1.4 separates that observation from the editing policy:

- existing tabs and spaces remain untouched;
- DSH settings determine all newly generated indentation;
- the status bar reports the active configured policy (`Spaces: 2` or `Spaces: 4`);
- Host indentation detection may remain for wire compatibility, but it no longer selects the input unit.

The settings snapshot expands from auto-save-only state to both auto-save and indentation preferences. A CodeMirror `Compartment` owns the indentation extension so a settings change can reconfigure existing views without rebuilding them or losing document history, selection, scroll position, drafts, or dirty state.

The generic indentation extension takes command precedence over `indentWithTab` and any language package's indentation policy. Syntax highlighting and other language support remain enabled, but language-specific indentation services must not override the v0.1.4 rules.

## Planned Module Changes

| Area | Responsibility |
| --- | --- |
| `src/settings/schema.ts` | Define indentation options, defaults, types, and defensive parsing |
| `src/config.ts` | Persist indentation beside auto-save settings in the volatile editor group |
| `src/client/settings/editor-settings.ts` | Expose accepted auto-save and indentation snapshots and ordered mutations |
| `src/client/settings/CodeCraftSettingsCard.tsx` | Render the fixed spaces policy and two/four-space selector |
| `src/client/editor/extensions/indentation.ts` | Compose reconfigurable Enter, Tab, Shift+Tab, and generic delimiter behavior |
| `src/client/editor/indentation.ts` | Hold pure boundary and selected-line calculations if extraction improves testing |
| `src/client/editor/index.ts` | Install indentation commands before default keymaps and expose reconfiguration |
| `src/client/renderer/CodeCraftBody.tsx` | Subscribe to indentation settings and reconfigure each mounted editor |
| `src/client/locales.ts` and `src/client/theme.ts` | Add localized labels and reuse the established settings layout |

No language-specific indentation directories are added. Existing modules should be extended rather than duplicated merely to match a proposed folder layout.

## Reliability and Compatibility

- Invalid settings fall back to two spaces.
- Editing at the start or end of a file never produces an invalid range or negative indentation.
- Historical tab characters are preserved and opening a file causes no content mutation.
- Multiline operations do not add trailing whitespace to empty lines or touch an unselected adjacent line.
- Bracket expansion cooperates with pairing, closer skipping, and paired deletion.
- Every indentation edit participates normally in dirty tracking, drafts, manual save, auto save, conflict detection, and atomic Host writes.
- Native file tabs, syntax highlighting, folding, search, completion, read-only behavior, and uninstall fallback do not regress.
- The implementation remains compatible with `dsh-better-sidebar` and does not change sidebar ownership.

## Verification Plan

Automated tests must cover:

- default, valid, and malformed indentation settings;
- persisted mutations for two- and four-space modes;
- boundary calculations for zero, aligned, and non-aligned indentation;
- single-line caret mapping in indentation and code content;
- forward and backward multiline selections, column-zero endpoints, empty lines, and one-step undo;
- normal Enter inheritance, unmatched opener indentation, empty `{}`, `[]`, and `()` expansion, nested delimiters, and closing alignment;
- immediate compartment reconfiguration without changing document text;
- compatibility with bracket pairing and existing save behavior.

Manual DSH Desktop acceptance must confirm settings visibility and persistence, immediate updates in already-open tabs, representative single-line and multiline edits, bracket expansion, undo, manual and automatic saving, and coexistence with `dsh-better-sidebar`. macOS is the primary acceptance environment; Windows behavior and `Ctrl+S` must not regress.

## Delivery Boundaries

The release is complete when new indentation is consistently space-only, two/four-space settings persist and apply live, Enter handles generic delimiters, Tab and Shift+Tab align single and selected lines to configured boundaries, and existing save and bracket guarantees remain intact.

README usage, the changelog, the validation record, package versions, and release notes are updated only after implementation and verification. Language-aware indentation and automatic formatting remain future work.
