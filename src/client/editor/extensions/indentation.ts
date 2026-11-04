/** Shared indentation policy derived from the file's detected style. */

import { indentOnInput, indentUnit } from '@codemirror/language'
import { EditorState, type Extension } from '@codemirror/state'
import type { IndentStyle } from '../../../protocol.js'

export function indentationExtensions(indent: IndentStyle): Extension[] {
  const unit = indent.kind === 'tabs' ? '\t' : ' '.repeat(indent.size)
  return [
    indentOnInput(),
    EditorState.tabSize.of(indent.size),
    indentUnit.of(unit),
  ]
}
