import { python } from '@codemirror/lang-python'
import type { EditorLanguageAdapter } from '../EditorLanguageAdapter.js'
import { pythonIndentationExtensions } from './features/indentation.js'

/** Browser-side Python syntax and editor behavior. */
export const pythonEditorLanguage: EditorLanguageAdapter = {
  id: 'python',
  label: 'Python',
  extensions: ['py', 'pyi', 'pyw'],
  createSupport: python,
  createEditorExtensions: pythonIndentationExtensions,
}
