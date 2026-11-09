import { insertNewlineAndIndent } from '@codemirror/commands'
import { indentOnInput } from '@codemirror/language'
import { Prec, type Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'

/** HTML Enter uses the Lezer tree and the live shared indentation unit. */
export function htmlIndentationExtensions(): Extension {
  return [
    indentOnInput(),
    Prec.highest(keymap.of([
      { key: 'Enter', run: insertNewlineAndIndent },
    ])),
  ]
}
