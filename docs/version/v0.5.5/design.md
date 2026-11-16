# DSH CodeCraft v0.5.5 Design

| Field | Value |
| --- | --- |
| Target version | 0.5.5 |
| Baseline | 0.5.4 at `db89bbc780dbe1866f7ae84eaeda9509b604d192` |
| Release type | Patch: editor syntax-color refinement |
| Platforms | DSH Desktop `0.2.2-rc.3` on macOS and Windows |
| Status | Implemented; automated regression passed; native Desktop acceptance pending |
| Scope | Unified syntax colors and live DSH Light/Dark adaptation |
| Validation | [validation.md](validation.md) |

## Scope Revision

The user revised the v0.5.5 scope on 2026-11-16 after confirming that DSH Desktop already owns font-family and font-size controls. This normalized record supersedes the broader raw planning proposal for implementation and validation.

The following planning requirements are removed from v0.5.5: `EVR-055-01` through `EVR-055-05` and `EVR-055-08` through `EVR-055-10`. CodeCraft must not add font selection, font-size selection, font download or storage, an Editor Appearance settings group, or additional editor-decoration behavior in this version.

Only the syntax-color requirements `EVR-055-06` and `EVR-055-07` remain in scope.

## Purpose

v0.5.5 replaces the previous saturated CodeCraft syntax colors with one restrained semantic palette shared by every existing language. The palette follows DSH Desktop's actual Light/Dark marker and remains scoped to the CodeCraft editor.

DSH Desktop continues to own typography. CodeCraft retains the existing DSH font-family and font-size CSS variables without introducing settings, protocol operations, downloads, persistence, or fallback repair for fonts.

## Requirements

| Requirement | Mandatory observable behavior | Failure and negative behavior |
| --- | --- | --- |
| `EVR-055-06` | One shared semantic palette maps CodeMirror/Lezer tags to foreground, keyword, string, number, function, type, property, and comment roles across every existing language | Language modules do not define private colors; unclassified text, punctuation, and operators remain neutral; diagnostics keep their existing independent presentation |
| `EVR-055-07` | CodeCraft follows DSH Desktop's `body[data-ds-dark-theme]` marker live and changes only editor-local syntax colors | Theme changes must preserve content, dirty state, history, selection, scrolling, folds, and native-tab identity; CodeCraft must not add a theme selector or style DSH-owned surfaces |

## Architecture and Ownership

| Capability | Runtime | Concrete path | Decision |
| --- | --- | --- | --- |
| Semantic palette variables | Client | `src/client/theme.ts` | Define light defaults under `.dsh-codecraft` and dark overrides under the existing DSH marker |
| Semantic tag mapping | Client | `src/client/theme.ts` | Keep one shared `HighlightStyle`; language adapters continue to provide Lezer tags without private palette logic |
| Typography | DSH Desktop / existing Client CSS | `src/client/theme.ts` | Preserve `--ds-font-family-code` and `--dsh-code-font-size`; add no CodeCraft setting or service |
| Focused verification | Test | `tests/syntax-theme.test.ts` | Assert both palettes remain scoped and typography remains DSH-owned |

No Host, protocol, settings-schema, persistence, network, storage, lifecycle, or language-module change is required.

## Semantic Palette

| Role | Light | Dark | Primary Lezer mappings |
| --- | --- | --- | --- |
| Foreground | `#30343B` | `#D7DCE3` | variables, punctuation, operators, unclassified text |
| Keyword | `#74549C` | `#B8A3D5` | keywords and control/module/definition keywords |
| String | `#39724D` | `#9EBF9C` | strings and regular expressions |
| Number | `#91613C` | `#D4B087` | numbers, booleans, nulls, and atoms |
| Function | `#376D9A` | `#98B9D8` | function/method names and labels |
| Type | `#776421` | `#C8BC93` | types, classes, namespaces, and tags |
| Property | `#536A88` | `#A5B5C8` | properties, fields, and HTML attributes |
| Comment | `#68727E` | `#9DA7B4` | line, block, and documentation comments |

Existing heading, invalid, and diagnostic treatments remain unchanged. Existing editor chrome, line, gutter, selection, bracket, search, fold, caret, and typography rules are not part of this version.

## Explicit Exclusions

- Font-family and font-size settings or CodeCraft-owned defaults.
- Downloadable, bundled, cached, uploaded, or system-installed fonts.
- Font-related Client/Host protocol, network, storage, status, retry, or license behavior.
- Editor Appearance settings UI or localization.
- New styling for indentation guides, search matches, folds, gutters, selections, brackets, carets, or containers.
- A CodeCraft theme selector, custom colors, theme import/export, or DSH-global styling.
- New languages, language behavior, editor replacement, release metadata, commit, tag, or publication work.

## Requirement-to-Code Plan

| Requirement | Observable behavior | Owning file | Automated evidence | Native evidence |
| --- | --- | --- | --- | --- |
| `EVR-055-06` | All registered languages use one semantic role mapping | `src/client/theme.ts` | `tests/syntax-theme.test.ts` plus language regressions | Representative existing-language samples in Light and Dark |
| `EVR-055-07` | DSH appearance changes switch scoped palette variables without editor reconstruction | `src/client/theme.ts` | Scope/marker assertions and editor regressions | Live appearance switching with state preservation |

## Definition of Done

- Only `EVR-055-06` and `EVR-055-07` remain implemented and documented for v0.5.5.
- No font-family, font-size, font-installation, Editor Appearance, or extra editor-decoration code remains from the superseded scope.
- One shared palette covers every existing language through the existing CodeMirror tag pipeline.
- Light and Dark colors remain scoped below CodeCraft and follow DSH Desktop's marker.
- Focused checks and `npm run check` pass on the final source revision.
- Native macOS and Windows Light/Dark checks remain visibly unverified until reported by the user.
