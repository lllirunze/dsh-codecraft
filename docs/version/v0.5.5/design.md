# DSH CodeCraft v0.5.5 Design

| Field | Value |
| --- | --- |
| Target version | 0.5.5 |
| Baseline | 0.5.4 at `db89bbc780dbe1866f7ae84eaeda9509b604d192` |
| Release type | Patch: shared editor syntax-color refinement |
| Platforms | DSH Desktop `0.2.2-rc.3` on macOS and Windows |
| Status | Syntax and bracket colors implemented; automated regression passed; native Desktop acceptance pending |
| Scope | GitHub Light/Dark Default syntax and bracket colors for every CodeCraft language |
| Long-lived color guide | [GitHub Default syntax colors](../../guide/github-syntax-colors.md) |
| Validation | [validation.md](validation.md) |

## Scope and source interpretation

The user revised v0.5.5 on 2026-11-16 after confirming that DSH Desktop already owns font-family and font-size controls. The same-day GitHub Theme color specification is now the color-value and semantic-mapping source for the remaining syntax-color work.

The explicit request is to apply GitHub Light/Dark font colors to CodeCraft source text, update the version records, document the palette, and make the mapping extensible across every current and future language. Therefore:

- `EVR-055-06` and `EVR-055-07` remain in scope.
- The user subsequently reintroduced the bracket portion of `EVR-055-08`: all bracket shapes must use the supplied GitHub pair palette and match feedback.
- The GitHub specification's syntax tables and language rules are authoritative for fixed colors and mappings.
- Font selection, font size, font download/storage, and Editor Appearance settings remain removed because DSH Desktop owns them.
- Other `EVR-055-08` decoration proposals remain excluded. Existing selections, search matches, active lines, gutters, indent guides, folds, carets, and diagnostics retain their current behavior.
- CodeCraft does not install or execute a GitHub theme package and does not style DSH-owned surfaces.

## Requirements

| Requirement | Mandatory observable behavior | Failure and negative behavior |
| --- | --- | --- |
| `EVR-055-06` | One pinned GitHub Light/Dark Default semantic palette covers every registered CodeCraft language through the shared CodeMirror/Lezer pipeline; common roles and documented JSON, HTML/XML, Java, and Markdown distinctions are preserved | Language modules define no private colors; future registered languages inherit the base mapping; unreliable distinctions fall back to neutral foreground instead of source-text guessing |
| `EVR-055-07` | CodeCraft follows DSH Desktop's live `body[data-ds-dark-theme]` marker and updates syntax variables without rebuilding the editor | Theme changes preserve document state, dirty state, history, selection, scrolling, folds, and native-tab identity; no theme setting, global body rule, or GitHub page/background color is introduced |
| `EVR-055-08` | Round, square, curly, and parser-recognized angle brackets use GitHub's six repeating nesting colors; invalid/unmatched brackets and cursor-adjacent matching use the supplied fixed colors | Brackets in comments/literals are ignored; comparison operators are not treated as angle brackets; automatic closing and diagnostics remain independent; no user setting or unrelated decoration feature is added |

## Current architecture

- `src/client/languages/index.ts` registers all language adapters through one duplicate-safe `LanguageRegistry`.
- Every editor instance is composed through `src/client/editor/index.ts`, independent of the selected language.
- CodeMirror language packages emit standard Lezer tags. A language adapter owns parsing and language behavior, not visual color values.
- `src/client/theme.ts` is the existing CodeCraft-scoped stylesheet and generic editor-chrome owner.
- DSH Desktop's `body[data-ds-dark-theme]` marker already supports live CSS-variable switching without an editor reconstruction or Host request.

## Architecture and ownership

| Capability | Category / runtime | Concrete path | Reused contract and reason |
| --- | --- | --- | --- |
| Pinned semantic palettes | Language-neutral Client editor | `src/client/editor/syntax-theme.ts` | One fixed Light/Dark source of truth prevents per-language color drift |
| Lezer semantic mapping | Language-neutral Client editor | `src/client/editor/syntax-theme.ts` | One base `HighlightStyle` automatically covers every parser registered through the shared editor |
| Parser-backed exceptions | Language-neutral Client editor | `src/client/editor/syntax-theme.ts` | Scoped JSON, HTML/XML, and Java overrides preserve GitHub semantics without private language palettes or text matching |
| Bracket pairing and levels | Language-neutral Client editor | `src/client/editor/extensions/brackets.ts` | Extends the existing shared bracket extension with parser-aware six-level decorations and invalid-pair handling |
| DSH mode integration | Client stylesheet | `src/client/theme.ts` | Reuses the live DSH marker and CodeCraft root scope; no new lifecycle or theme subscriber |
| Editor application | Client editor composition | `src/client/editor/index.ts` | Passes the active language to the shared theme once for every CodeCraft editor instance |
| Long-lived maintenance contract | Documentation | `docs/guide/github-syntax-colors.md` | Explains colors, boundaries, all-language behavior, and future language onboarding |
| Coverage guard | Test | `tests/syntax-theme.test.ts` | Enumerates every registered adapter and requires representative parser output to match the shared highlighter |

This is a Client-only, language-neutral editor capability. It adds no Host, protocol, settings, persistence, network, storage, external runtime, or teardown responsibility.

## GitHub Default semantic palette

The values are pinned to the supplied `github-vscode-themes@6.3.4` Light Default and Dark Default reference snapshots, cross-checked by the source document against `primer/github-vscode-theme`.

| Role | Light | Dark | Primary Lezer behavior |
| --- | --- | --- | --- |
| Foreground | `#1F2328` | `#E6EDF3` | Plain variables/parameters, punctuation, operators, unclassified text |
| Comment | `#6E7781` | `#8B949E` | Line, block, and documentation comments |
| Keyword | `#CF222E` | `#FF7B72` | Control, declaration, modifier, and operator keywords |
| String | `#0A3069` | `#A5D6FF` | Strings, regular expressions, URLs, and attribute values |
| Constant | `#0550AE` | `#79C0FF` | Numbers, booleans, nulls, atoms, units, and color literals |
| Function | `#8250DF` | `#D2A8FF` | Functions, methods, and labels |
| Definition | `#953800` | `#FFA657` | Types, classes, namespaces, definitions, and Markdown list markers |
| Support | `#0550AE` | `#79C0FF` | Standard names, metadata, annotations, headings, and inline code |
| Property | `#0550AE` | `#79C0FF` | Properties, fields, and macros |
| Tag | `#116329` | `#7EE787` | HTML/XML tags, JSON keys, Markdown quotes, escapes, inserted text |
| Invalid | `#82071E` | `#FFA198` | Parser-recognized invalid syntax and deleted text |

Diagnostics remain separate from syntax text. The palette does not replace error/warning underlines, messages, Hover, completion, navigation, or problem presentation.

## Bracket palette and behavior

| Level | Light | Dark |
| --- | --- | --- |
| 1 | `#0969DA` | `#79C0FF` |
| 2 | `#1A7F37` | `#56D364` |
| 3 | `#9A6700` | `#E3B341` |
| 4 | `#CF222E` | `#FFA198` |
| 5 | `#BF3989` | `#FF9BCE` |
| 6 | `#8250DF` | `#D2A8FF` |
| Invalid/unmatched | `#656D76` | `#7D8590` |

Valid pairs share the opening bracket's nesting level, and levels repeat after six. Round, square, and curly brackets are detected across CodeCraft editors outside parser-recognized comments and literals. Angle brackets are included only when Lezer marks them as `angleBracket`, preventing comparisons from being misclassified.

Cursor-adjacent matching uses background `#4AC26B40` / `#3FB95040` and border `#4AC26B99` / `#3FB95099` for Light/Dark respectively. Pair text colors and matching feedback are independent, so selection and diagnostics retain their existing ownership.

## Language coverage and extension behavior

The base mapping applies automatically to Python, Java, HTML, CSS, JavaScript, TypeScript, JSX/TSX, JSON, YAML, XML, Markdown, SQL, PHP, C/C++, Go, and Rust. Plain text uses Foreground.

Centralized exceptions are limited to parser semantics the current CodeMirror packages expose reliably:

- JSON properties use Tag green for keys.
- HTML/XML attributes use neutral Foreground while values remain String blue.
- Java `moduleKeyword` uses neutral Foreground for GitHub's package/import exception.
- Markdown headings, quotes, inline code, lists, links, emphasis, strong, and strikethrough use the shared document roles.

A future language gets the base palette by registering through the existing registry and shared editor. Its adapter must emit standard Lezer tags and must not contain color literals. A representative sample must be added to the syntax-theme coverage table; a genuinely required parser-specific exception stays scoped and centralized in `syntax-theme.ts`.

## Failure, compatibility, and isolation

- Missing or coarse parser tags fall back to neutral Foreground; CodeCraft does not classify identifiers from spelling.
- A language parser initialization failure continues to use the existing plain editor fallback and does not affect saving.
- CSS variable changes do not recreate CodeMirror, so document and history state remain untouched.
- Bracket decorations are recomputed only when the document or syntax tree changes and contain no asynchronous work or lifecycle resource.
- Parser-recognized comments/literals are excluded; parser-recognized angle brackets are required to avoid comparison-operator false positives.
- Host backgrounds, containers, tabs, sidebars, settings, and other plugins are outside the selector scope.
- Offline operation is identical because all values and mappings are local constants.
- No platform-specific code or external dependency is introduced; actual readability still requires native macOS and Windows Light/Dark acceptance.

## Explicit exclusions

- Font-family or font-size settings, defaults, downloads, storage, licenses, or protocol actions.
- A CodeCraft theme selector, custom colors, theme import/export, or runtime GitHub theme dependency.
- GitHub editor/page backgrounds or DSH sidebar, tab, status-bar, title-bar, panel, button, or settings colors.
- New selection, search, active-line, line-number, indent-guide, fold, caret, Diff, Git, or diagnostic features beyond the explicitly requested bracket colors.
- New language support, new language semantics, editor replacement, package-version changes, changelog release entries, commits, tags, or publication.

## Requirement-to-evidence plan

| Requirement | Source files | Focused automation | Native evidence |
| --- | --- | --- | --- |
| `EVR-055-06` | `syntax-theme.ts`, `theme.ts`, `editor/index.ts` | Exact palette and tag assertions; every registered parser produces ranges recognized by the shared highlighter; language/editor regression | Representative supported languages in DSH Light and Dark; diagnostic and language-feature coexistence |
| `EVR-055-07` | `syntax-theme.ts`, `theme.ts` | DSH marker and selector-scope assertions; typecheck/build/editor regression | Live appearance switching with document/history/selection/scroll/fold preservation on macOS and Windows |
| `EVR-055-08` | `syntax-theme.ts`, `extensions/brackets.ts`, `theme.ts` | Exact six-level/match palettes; nesting, cycling, invalid pairs, literal/comment exclusion, parser-safe angle brackets, existing bracket behavior | All bracket shapes, six levels, invalid pairs, match feedback, selection overlap, and Light/Dark switching on macOS and Windows |

## Definition of done

- The supplied GitHub Default values replace the earlier custom v0.5.5 syntax palette.
- One palette module and one base Lezer mapping are the only syntax-color source.
- Every current registered parser is covered by the shared highlighter test, and the test guards future registrations.
- Language-specific distinctions are centralized, parser-backed, and use shared palette roles.
- All supported bracket shapes use the six GitHub levels; invalid pairs and matching feedback use the fixed GitHub colors without false-positive angle comparisons.
- The long-lived color guide documents user behavior, semantic mappings, boundaries, attribution, and future-language rules.
- Focused tests and `npm run check` pass on the final source revision.
- Native macOS and Windows Light/Dark acceptance remains unchecked until the user reports observed results.
