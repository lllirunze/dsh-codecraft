/** Shared bracket behavior for every supported language. */

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { bracketMatching } from '@codemirror/language'
import { EditorState, Prec, type Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'
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
    bracketMatching(),
    Prec.high(closeBracketsData),
    closeBrackets(),
    keymap.of(closeBracketsKeymap),
  ]
}
