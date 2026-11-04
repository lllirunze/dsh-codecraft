/** Shared bracket behavior for every supported language. */

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { bracketMatching } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'

export function bracketExtensions(): Extension[] {
  return [bracketMatching(), closeBrackets(), keymap.of(closeBracketsKeymap)]
}
