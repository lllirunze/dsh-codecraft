/** Shared bracket behavior for every supported language. */

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { bracketMatching, syntaxTree } from '@codemirror/language'
import { EditorState, Prec, type Extension } from '@codemirror/state'
import {
  Decoration,
  keymap,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from '@codemirror/view'
import { highlightTree, tagHighlighter, tags } from '@lezer/highlight'
import type { FileLanguage } from '../../languages/index.js'

const COMMON_BRACKETS = ['(', '[', '{', "'", '"'] as const
const BACKTICK_LANGUAGES = new Set([
  'javascript',
  'javascript-jsx',
  'typescript',
  'typescript-jsx',
  'markdown',
  'go',
  'sql',
])

const EXCLUDED_BRACKET_HIGHLIGHTER = tagHighlighter([{
  tag: [
    tags.comment,
    tags.lineComment,
    tags.blockComment,
    tags.docComment,
    tags.string,
    tags.docString,
    tags.character,
    tags.attributeValue,
    tags.regexp,
  ],
  class: 'excluded',
}])

const ANGLE_BRACKET_HIGHLIGHTER = tagHighlighter([{
  tag: tags.angleBracket,
  class: 'angle',
}])

const OPEN_TO_CLOSE = new Map<string, string>([
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
  ['<', '>'],
])

const CLOSERS = new Set(OPEN_TO_CLOSE.values())

export type BracketColorLevel = 1 | 2 | 3 | 4 | 5 | 6 | 'invalid'

export interface BracketColorRange {
  from: number
  to: number
  character: string
  level: BracketColorLevel
}

interface TextRange {
  from: number
  to: number
}

interface BracketToken {
  from: number
  character: string
}

function highlightedRanges(state: EditorState, kind: 'excluded' | 'angle'): TextRange[] {
  const ranges: TextRange[] = []
  highlightTree(
    syntaxTree(state),
    kind === 'excluded' ? EXCLUDED_BRACKET_HIGHLIGHTER : ANGLE_BRACKET_HIGHLIGHTER,
    (from, to) => ranges.push({ from, to }),
  )
  return ranges
}

function containsPosition(ranges: readonly TextRange[], position: number, cursor: { index: number }): boolean {
  while (cursor.index < ranges.length && ranges[cursor.index]!.to <= position) cursor.index += 1
  const range = ranges[cursor.index]
  return range !== undefined && range.from <= position && position < range.to
}

function bracketTokens(state: EditorState): BracketToken[] {
  const text = state.doc.toString()
  const excluded = highlightedRanges(state, 'excluded')
  const angle = highlightedRanges(state, 'angle')
  const excludedCursor = { index: 0 }
  const angleCursor = { index: 0 }
  const tokens: BracketToken[] = []
  for (let position = 0; position < text.length; position += 1) {
    const character = text[position]!
    if (!OPEN_TO_CLOSE.has(character) && !CLOSERS.has(character)) continue
    if (containsPosition(excluded, position, excludedCursor)) continue
    if ((character === '<' || character === '>')
      && !containsPosition(angle, position, angleCursor)) continue
    tokens.push({ from: position, character })
  }
  return tokens
}

/** Resolve parser-safe bracket pairs into six repeating GitHub nesting levels. */
export function bracketColorRanges(state: EditorState): readonly BracketColorRange[] {
  const tokens = bracketTokens(state)
  const levels: Array<BracketColorLevel | undefined> = Array(tokens.length)
  const stack: Array<{ index: number; level: Exclude<BracketColorLevel, 'invalid'> }> = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!
    if (OPEN_TO_CLOSE.has(token.character)) {
      const level = ((stack.length % 6) + 1) as Exclude<BracketColorLevel, 'invalid'>
      stack.push({ index, level })
      continue
    }
    const opener = stack.at(-1)
    if (opener !== undefined
      && OPEN_TO_CLOSE.get(tokens[opener.index]!.character) === token.character) {
      stack.pop()
      levels[opener.index] = opener.level
      levels[index] = opener.level
    } else {
      levels[index] = 'invalid'
    }
  }
  for (const opener of stack) levels[opener.index] = 'invalid'
  return tokens.map((token, index) => ({
    from: token.from,
    to: token.from + 1,
    character: token.character,
    level: levels[index] ?? 'invalid',
  }))
}

function bracketColorDecorations(state: EditorState): DecorationSet {
  return Decoration.set(bracketColorRanges(state).map(range => Decoration.mark({
    class: range.level === 'invalid'
      ? 'dsh-codecraft-bracket dsh-codecraft-bracket-invalid'
      : `dsh-codecraft-bracket dsh-codecraft-bracket-level-${range.level}`,
  }).range(range.from, range.to)), true)
}

class BracketColorView {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = bracketColorDecorations(view.state)
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
      this.decorations = bracketColorDecorations(update.state)
    }
  }
}

const bracketColorExtension = ViewPlugin.fromClass(BracketColorView, {
  decorations: value => value.decorations,
})

/** CodeCraft's explicit pairing set, including language-specific additions. */
export function closeBracketTokens(languageId: string): readonly string[] {
  if (languageId === 'python') return [...COMMON_BRACKETS, "'''", '"""']
  if (BACKTICK_LANGUAGES.has(languageId)) return [...COMMON_BRACKETS, '`']
  return COMMON_BRACKETS
}

export function bracketExtensions(language: Pick<FileLanguage, 'id'>): Extension[] {
  const closeBracketsData = EditorState.languageData.of(() => [{
    closeBrackets: {
      brackets: closeBracketTokens(language.id),
    },
  }])
  return [
    bracketColorExtension,
    bracketMatching(),
    Prec.high(closeBracketsData),
    closeBrackets(),
    keymap.of(closeBracketsKeymap),
  ]
}
