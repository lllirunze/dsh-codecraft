/** Shared completion UI; language packages may contribute completion sources. */

import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'

export function completionExtensions(): Extension[] {
  return [autocompletion(), keymap.of(completionKeymap)]
}
