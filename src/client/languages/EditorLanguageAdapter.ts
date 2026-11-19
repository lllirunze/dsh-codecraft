import type { LanguageSupport } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import type { CompletionSource } from '@codemirror/autocomplete'
import type { Translate } from '../i18n/contract.js'

/** Browser-only language presentation used when creating a CodeMirror editor. */
export interface EditorLanguageAdapter {
  readonly id: string
  readonly label: string
  readonly extensions: readonly string[]
  readonly createSupport: () => LanguageSupport
  readonly createEditorExtensions: (getTranslate?: () => Translate) => Extension
  readonly completionSource?: CompletionSource
}
