/**
 * GitHub Default syntax colors shared by every CodeCraft language adapter.
 *
 * Values are pinned to the GitHub Light Default and GitHub Dark Default 6.3.4
 * snapshots. Language adapters provide Lezer tags only; they do not own colors.
 */

import {
  HighlightStyle,
  syntaxHighlighting,
  type LanguageSupport,
  type TagStyle,
} from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { tags } from '@lezer/highlight'

export type SyntaxColorRole =
  | 'foreground'
  | 'comment'
  | 'keyword'
  | 'string'
  | 'constant'
  | 'function'
  | 'definition'
  | 'support'
  | 'property'
  | 'tag'
  | 'invalid'

export type SyntaxPalette = Readonly<Record<SyntaxColorRole, string>>

export type BracketColorRole =
  | 'level1'
  | 'level2'
  | 'level3'
  | 'level4'
  | 'level5'
  | 'level6'
  | 'invalid'
  | 'matchBackground'
  | 'matchBorder'

export type BracketPalette = Readonly<Record<BracketColorRole, string>>

export const GITHUB_SYNTAX_PALETTES: Readonly<Record<'light' | 'dark', SyntaxPalette>> = {
  light: {
    foreground: '#1F2328',
    comment: '#6E7781',
    keyword: '#CF222E',
    string: '#0A3069',
    constant: '#0550AE',
    function: '#8250DF',
    definition: '#953800',
    support: '#0550AE',
    property: '#0550AE',
    tag: '#116329',
    invalid: '#82071E',
  },
  dark: {
    foreground: '#E6EDF3',
    comment: '#8B949E',
    keyword: '#FF7B72',
    string: '#A5D6FF',
    constant: '#79C0FF',
    function: '#D2A8FF',
    definition: '#FFA657',
    support: '#79C0FF',
    property: '#79C0FF',
    tag: '#7EE787',
    invalid: '#FFA198',
  },
}

export const GITHUB_BRACKET_PALETTES: Readonly<Record<'light' | 'dark', BracketPalette>> = {
  light: {
    level1: '#0969DA',
    level2: '#1A7F37',
    level3: '#9A6700',
    level4: '#CF222E',
    level5: '#BF3989',
    level6: '#8250DF',
    invalid: '#656D76',
    matchBackground: '#4AC26B40',
    matchBorder: '#4AC26B99',
  },
  dark: {
    level1: '#79C0FF',
    level2: '#56D364',
    level3: '#E3B341',
    level4: '#FFA198',
    level5: '#FF9BCE',
    level6: '#D2A8FF',
    invalid: '#7D8590',
    matchBackground: '#3FB95040',
    matchBorder: '#3FB95099',
  },
}

function paletteDeclarations(palette: SyntaxPalette): string {
  return Object.entries(palette)
    .map(([role, value]) => `  --cc-syn-${role}: ${value};`)
    .join('\n')
}

function bracketDeclarations(palette: BracketPalette): string {
  return [
    ...([1, 2, 3, 4, 5, 6] as const)
      .map(level => `  --cc-bracket-level-${level}: ${palette[`level${level}`]};`),
    `  --cc-bracket-invalid: ${palette.invalid};`,
    `  --cc-bracket-match-background: ${palette.matchBackground};`,
    `  --cc-bracket-match-border: ${palette.matchBorder};`,
  ].join('\n')
}

/** CSS variables follow DSH's live appearance marker without rebuilding editors. */
export const GITHUB_SYNTAX_PALETTE_CSS = `
.dsh-codecraft {
${paletteDeclarations(GITHUB_SYNTAX_PALETTES.light)}
${bracketDeclarations(GITHUB_BRACKET_PALETTES.light)}
}
body[data-ds-dark-theme] .dsh-codecraft {
${paletteDeclarations(GITHUB_SYNTAX_PALETTES.dark)}
${bracketDeclarations(GITHUB_BRACKET_PALETTES.dark)}
}
`

const color = (role: SyntaxColorRole): string => `var(--cc-syn-${role})`

/**
 * Language-neutral semantic mapping. More precise rules intentionally follow
 * broad rules because CodeMirror emits their CSS later and gives them priority.
 */
export const GITHUB_SYNTAX_TAG_STYLES: readonly TagStyle[] = [
  { tag: [tags.name, tags.variableName], color: color('foreground') },
  { tag: [tags.operator, tags.punctuation, tags.bracket, tags.separator], color: color('foreground') },
  { tag: [tags.content, tags.strong, tags.emphasis, tags.strikethrough], color: color('foreground') },
  {
    tag: [
      tags.keyword,
      tags.modifier,
      tags.operatorKeyword,
      tags.controlKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
    ],
    color: color('keyword'),
  },
  {
    tag: [tags.string, tags.docString, tags.attributeValue, tags.regexp, tags.url],
    color: color('string'),
  },
  {
    tag: [tags.number, tags.bool, tags.null, tags.atom, tags.unit, tags.color],
    color: color('constant'),
  },
  { tag: [tags.typeName, tags.className, tags.namespace], color: color('definition') },
  { tag: tags.definition(tags.variableName), color: color('definition') },
  { tag: tags.definition(tags.propertyName), color: color('definition') },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.labelName], color: color('function') },
  { tag: [tags.propertyName, tags.macroName], color: color('property') },
  { tag: tags.attributeName, color: color('foreground') },
  { tag: tags.tagName, color: color('tag') },
  {
    tag: [
      tags.standard(tags.variableName),
      tags.standard(tags.propertyName),
      tags.standard(tags.typeName),
      tags.special(tags.variableName),
    ],
    color: color('support'),
  },
  { tag: tags.escape, color: color('tag'), fontWeight: '600' },
  { tag: tags.character, color: color('keyword') },
  {
    tag: [tags.meta, tags.annotation, tags.processingInstruction, tags.documentMeta],
    color: color('support'),
  },
  {
    tag: [
      tags.comment,
      tags.lineComment,
      tags.blockComment,
      tags.docComment,
    ],
    color: color('comment'),
    fontStyle: 'italic',
  },
  {
    tag: [tags.heading, tags.heading1, tags.heading2, tags.heading3, tags.heading4, tags.heading5, tags.heading6],
    color: color('support'),
    fontWeight: '600',
  },
  { tag: tags.quote, color: color('tag') },
  { tag: tags.monospace, color: color('support') },
  { tag: tags.list, color: color('definition') },
  { tag: tags.link, color: color('string'), textDecoration: 'underline' },
  { tag: tags.strong, fontWeight: '600' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.inserted, color: color('tag') },
  { tag: tags.deleted, color: color('invalid') },
  { tag: tags.changed, color: color('definition') },
  { tag: tags.invalid, color: color('invalid') },
]

export const githubSyntaxHighlightStyle = HighlightStyle.define(GITHUB_SYNTAX_TAG_STYLES)

interface SyntaxThemeLanguage {
  id: string
  support: LanguageSupport | null
}

function languageOverride(language: SyntaxThemeLanguage): HighlightStyle | undefined {
  if (language.support === null) return undefined
  const scope = language.support.language
  if (language.id === 'json') {
    return HighlightStyle.define([
      { tag: [tags.propertyName, tags.attributeName], color: color('tag') },
    ], { scope })
  }
  if (language.id === 'html' || language.id === 'xml') {
    return HighlightStyle.define([
      { tag: [tags.propertyName, tags.attributeName], color: color('foreground') },
    ], { scope })
  }
  if (language.id === 'java') {
    return HighlightStyle.define([
      { tag: tags.moduleKeyword, color: color('foreground') },
    ], { scope })
  }
  return undefined
}

/**
 * Every registered language receives the shared highlighter automatically.
 * A small number of parser-backed GitHub exceptions remain centralized here.
 */
export function githubSyntaxThemeExtensions(language: SyntaxThemeLanguage): Extension[] {
  const extensions: Extension[] = [syntaxHighlighting(githubSyntaxHighlightStyle)]
  const override = languageOverride(language)
  if (override !== undefined) extensions.push(syntaxHighlighting(override))
  return extensions
}
