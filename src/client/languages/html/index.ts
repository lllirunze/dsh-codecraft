import { LanguageSupport } from '@codemirror/language'
import { html, htmlLanguage } from '@codemirror/lang-html'
import type { EditorLanguageAdapter } from '../EditorLanguageAdapter.js'
import { htmlCompletionSource } from './features/completion.js'
import { htmlEmmetCompletionSource, htmlEmmetExtensions } from './features/emmet.js'
import { htmlFormattingExtensions } from './features/formatting.js'
import { htmlHoverExtensions } from './features/hover.js'
import { htmlIndentationExtensions } from './features/indentation.js'
import { htmlNavigationExtensions } from './features/navigation.js'
import { htmlCommentFolding, htmlStructureExtensions } from './features/structure.js'
import { htmlTagClosingExtensions } from './features/tags.js'

function htmlSupport(): LanguageSupport {
  const base = html({ autoCloseTags: false })
  try {
    return new LanguageSupport(
      htmlLanguage.configure({ props: [htmlCommentFolding()] }),
      base.support,
    )
  } catch {
    return base
  }
}

/** Browser-only HTML parsing, structure, editing productivity, and indentation. */
export const htmlEditorLanguage: EditorLanguageAdapter = {
  id: 'html',
  label: 'HTML',
  extensions: ['html', 'htm'],
  createSupport: htmlSupport,
  createEditorExtensions: () => [
    htmlTagClosingExtensions(),
    htmlIndentationExtensions(),
    htmlStructureExtensions(),
    htmlHoverExtensions(),
    htmlFormattingExtensions(),
    htmlEmmetExtensions(),
    htmlNavigationExtensions(),
  ],
  completionSource: htmlEmmetCompletionSource(htmlCompletionSource),
}
