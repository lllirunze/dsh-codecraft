import type { LanguageSupport } from '@codemirror/language'

/** Browser-only language presentation used when creating a CodeMirror editor. */
export interface EditorLanguageAdapter {
  readonly id: string
  readonly label: string
  readonly extensions: readonly string[]
  readonly createSupport: () => LanguageSupport
}
