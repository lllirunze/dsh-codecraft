import { java, javaLanguage } from '@codemirror/lang-java'
import type { EditorLanguageAdapter } from '../EditorLanguageAdapter.js'
import { javaCompletionSource } from './features/completion.js'
import { javaJavadocExtensions } from './features/javadoc.js'

/** Browser-only Java support: parser, local completion, snippets, and Javadoc. */
export const javaEditorLanguage: EditorLanguageAdapter = {
  id: 'java',
  label: 'Java',
  extensions: ['java'],
  createSupport: java,
  createEditorExtensions: () => [
    javaLanguage.data.of({ autocomplete: javaCompletionSource }),
    javaJavadocExtensions(),
  ],
}
