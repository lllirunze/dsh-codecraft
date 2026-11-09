import { html } from '@codemirror/lang-html'
import type { EditorLanguageAdapter } from '../EditorLanguageAdapter.js'
import { htmlCompletionSource } from './features/completion.js'
import { htmlIndentationExtensions } from './features/indentation.js'
import { htmlTagClosingExtensions } from './features/tags.js'

/** Browser-only HTML parsing, completion, input assistance, and indentation. */
export const htmlEditorLanguage: EditorLanguageAdapter = {
  id: 'html',
  label: 'HTML',
  extensions: ['html', 'htm'],
  createSupport: () => html({ autoCloseTags: false }),
  createEditorExtensions: () => [
    htmlTagClosingExtensions(),
    htmlIndentationExtensions(),
  ],
  completionSource: htmlCompletionSource,
}
