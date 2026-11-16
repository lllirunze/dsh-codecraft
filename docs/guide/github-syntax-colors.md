# GitHub Default Syntax Colors

| Field | Value |
| --- | --- |
| Scope | CodeCraft syntax tokens and bracket feedback only |
| Palette family | GitHub Light Default / GitHub Dark Default |
| Pinned reference | `github-vscode-themes@6.3.4` generated snapshots, cross-checked against `primer/github-vscode-theme` |
| Runtime dependency | None; CodeCraft stores fixed colors locally |
| Host integration | Follows DSH Desktop's live Light/Dark marker |

## What users see

CodeCraft uses GitHub Default-style syntax colors in every supported editor language. DSH Desktop still owns the editor font, font size, page background, tabs, sidebar, panels, settings, and other application surfaces. This is not an installation of the GitHub VS Code theme and does not add a theme or color setting.

When DSH Desktop changes between Light and Dark appearance, CodeCraft switches the syntax variables through the existing `body[data-ds-dark-theme]` marker. The editor is not reconstructed, so the document, dirty state, selection, scroll position, folds, and Undo/Redo history remain owned by the existing CodeMirror instance.

## Fixed semantic palette

| Role | Light | Dark | Typical tokens |
| --- | --- | --- | --- |
| Foreground | `#1F2328` | `#E6EDF3` | Plain variables, parameters, punctuation, operators, unclassified text |
| Comment | `#6E7781` | `#8B949E` | Line, block, and documentation comments |
| Keyword | `#CF222E` | `#FF7B72` | Control, declaration, modifier, and operator keywords |
| String | `#0A3069` | `#A5D6FF` | Strings, regular expressions, URLs, and attribute values |
| Constant | `#0550AE` | `#79C0FF` | Numbers, booleans, nulls, atoms, units, and color literals |
| Function | `#8250DF` | `#D2A8FF` | Function and method names and labels |
| Definition | `#953800` | `#FFA657` | Types, classes, namespaces, definitions, and Markdown list markers |
| Support | `#0550AE` | `#79C0FF` | Standard-library names, metadata, annotations, headings, and inline code |
| Property | `#0550AE` | `#79C0FF` | Recognized properties, fields, and macros |
| Tag | `#116329` | `#7EE787` | HTML/XML tags, JSON keys, Markdown quotes, escapes, and inserted text |
| Invalid | `#82071E` | `#FFA198` | Parser-recognized invalid syntax and deleted text |

Syntax colors do not replace diagnostics. Code Check and language-service errors continue to use their existing underlines, messages, Hover content, and problem navigation.

## Bracket colors

CodeCraft applies GitHub's six bracket-pair levels to round `()`, square `[]`, and curly `{}` brackets. Angle brackets `<>` receive the same treatment only when the active parser identifies them as brackets, such as HTML/XML tags or supported generic/type syntax. This prevents comparison operators such as `left < value` from being colored as a pair.

| Level | Light | Dark |
| --- | --- | --- |
| 1 | `#0969DA` | `#79C0FF` |
| 2 | `#1A7F37` | `#56D364` |
| 3 | `#9A6700` | `#E3B341` |
| 4 | `#CF222E` | `#FFA198` |
| 5 | `#BF3989` | `#FF9BCE` |
| 6 | `#8250DF` | `#D2A8FF` |
| Invalid or unmatched | `#656D76` | `#7D8590` |

Levels repeat after level 6. Both characters in a valid pair receive the opening bracket's nesting level. Crossed, unmatched, or incomplete pairs receive the Invalid color.

Brackets inside parser-recognized strings, character literals, regular expressions, attribute values, and comments are not decorated. Cursor-adjacent matching uses the GitHub pair feedback colors independently of the six text colors:

| Feedback | Light | Dark |
| --- | --- | --- |
| Match background | `#4AC26B40` | `#3FB95040` |
| Match border | `#4AC26B99` | `#3FB95099` |

Bracket colors are always enabled, add no setting, do not change automatic closing behavior, and do not replace parser or diagnostic errors.

## Language behavior

The palette is attached once in the shared editor extension pipeline. Every registered language receives it automatically:

- Python, Java, HTML, CSS, JavaScript, TypeScript, JSX, and TSX;
- JSON, YAML, XML, Markdown, SQL, and PHP;
- C/C++, Go, and Rust;
- any future language registered through the existing `LanguageRegistry` and shared editor pipeline.

Lezer tags are the semantic boundary. Language adapters may improve their parser classification, but they must not define private colors. When a parser cannot distinguish a token reliably, the theme falls back to the neutral foreground instead of guessing from source text.

The centralized parser-backed exceptions are:

- JSON property keys use the Tag role rather than the generic Property role.
- HTML and XML attribute names use neutral Foreground; attribute values keep String color.
- Java module keywords such as package/import use neutral Foreground where the parser exposes `moduleKeyword`.
- Markdown headings, quotes, inline code, list markers, strong/emphasis, strikethrough, and links use their shared semantic roles and text styles.

## Extension contract for future languages

1. Register the language through `src/client/languages/index.ts`; do not create a separate editor or syntax theme.
2. Use the most accurate standard Lezer tags available from the parser.
3. Do not add literal colors under a language directory.
4. Add a representative sample for the language to `tests/syntax-theme.test.ts`. The test must prove that the parser emits ranges recognized by the shared highlighter.
5. If GitHub Default requires a language-specific exception that Lezer can identify safely, add a scoped override in `src/client/editor/syntax-theme.ts`. Keep the color value in the shared palette and document the exception here.
6. Prefer neutral fallback when a reliable semantic distinction is unavailable. Do not classify identifiers by matching their source spelling.

This contract gives future languages immediate baseline colors while keeping all palette decisions reviewable in one place.

## Implementation ownership

| Path | Responsibility |
| --- | --- |
| `src/client/editor/syntax-theme.ts` | Pinned palettes, CSS variables, Lezer mappings, and scoped language exceptions |
| `src/client/editor/extensions/brackets.ts` | Parser-aware bracket discovery, pair validation, nesting levels, and shared CodeMirror decorations |
| `src/client/theme.ts` | CodeCraft/DSH stylesheet composition and generic editor chrome |
| `src/client/editor/index.ts` | Applies the shared theme to every editor instance |
| `tests/syntax-theme.test.ts` | Palette, semantic mapping, DSH scope, registered-language coverage, and future-language guard |

There is no Host, protocol, settings, storage, download, or network component.

## Boundaries

- Do not apply GitHub's page, editor-background, sidebar, tab, title-bar, panel, or status-bar colors to DSH Desktop.
- Do not add theme selection, custom colors, syntax toggles, font settings, or font downloads.
- Do not color angle-bracket comparison operators or brackets inside parser-recognized comments and literals.
- Do not introduce language-specific color literals or a parallel theme registry.
- Do not infer native macOS or Windows readability from automated tests; both platforms require real Light/Dark acceptance.

## Upstream references and attribution

- [GitHub VS Code Theme](https://github.com/primer/github-vscode-theme)
- [Official theme source](https://github.com/primer/github-vscode-theme/blob/main/src/theme.js)
- [Official color source](https://github.com/primer/github-vscode-theme/blob/main/src/colors.js)
- [GitHub Theme MIT license](https://github.com/primer/github-vscode-theme/blob/main/LICENSE)
- [6.3.4 Light Default generated snapshot](https://app.unpkg.com/github-vscode-themes@6.3.4/files/dist/light-default.json)
- [6.3.4 Dark Default generated snapshot](https://app.unpkg.com/github-vscode-themes@6.3.4/files/dist/dark-default.json)
- [CodeMirror styling guide](https://codemirror.net/examples/styling/)

The generated snapshot package is used only as a pinned, inspectable reference. CodeCraft does not install or execute it. Future upstream changes do not alter this palette automatically; adopting a newer snapshot requires an explicit documented change and regression cycle.
