/** Shared completion UI; language packages may contribute completion sources. */

import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import type { CompletionSource } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'

/** Avoid macOS Option bindings that can insert composed input characters. */
export const codeCraftCompletionKeymap = completionKeymap.filter(binding => (
  binding.mac !== 'Alt-i' && binding.mac !== 'Alt-`'
))

export function completionExtensions(source?: CompletionSource): Extension[] {
  return [
    autocompletion(source === undefined ? {} : { override: [source] }),
    keymap.of(codeCraftCompletionKeymap),
  ]
}
