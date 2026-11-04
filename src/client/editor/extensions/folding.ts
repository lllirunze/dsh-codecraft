/** Shared fold gutter and keyboard behavior. */

import { foldGutter, foldKeymap } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'

export function foldingExtensions(): Extension[] {
  return [foldGutter(), keymap.of(foldKeymap)]
}
