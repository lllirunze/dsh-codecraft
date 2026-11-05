import { insertNewlineAndIndent } from '@codemirror/commands'
import { indentOnInput } from '@codemirror/language'
import { Prec, type Extension } from '@codemirror/state'
import { keymap, type Command } from '@codemirror/view'

/** Python Enter behavior backed by CodeMirror's Python syntax tree. */
export const newlineWithPythonIndent: Command = insertNewlineAndIndent

/** Python-only indentation behavior layered above the language-neutral fallback. */
export function pythonIndentationExtensions(): Extension {
  return [
    indentOnInput(),
    Prec.highest(keymap.of([
      { key: 'Enter', run: newlineWithPythonIndent },
    ])),
  ]
}
