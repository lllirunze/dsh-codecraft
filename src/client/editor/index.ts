/**
 * CodeMirror 6 configuration and small document helpers.
 *
 * The editor keeps its own authoritative document; React only mirrors status
 * (cursor, dirty, language) and drives explicit replacements when the file
 * changes on disk with no local draft.
 *
 * @module dsh-codecraft/client/editor
 */

import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  toggleComment,
} from '@codemirror/commands'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { EditorState, type Compartment, type Extension } from '@codemirror/state'
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
  type ViewUpdate,
} from '@codemirror/view'
import type { IndentStyle } from '../../protocol.js'
import type { FileLanguage } from '../languages/index.js'
import { editorThemeExtensions } from '../theme.js'
import { bracketExtensions } from './extensions/brackets.js'
import { completionExtensions } from './extensions/completion.js'
import { foldingExtensions } from './extensions/folding.js'
import { indentationExtensions } from './extensions/indentation.js'

export interface EditorOptions {
  language: FileLanguage
  indent: IndentStyle
  readOnly: boolean
  readOnlyCompartment: Compartment
  onUpdate: (update: ViewUpdate) => void
}

/** Editable/read-only extensions, kept reconfigurable without rebuilding the view. */
export function readOnlyExtensions(readOnly: boolean): Extension {
  return [
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
  ]
}

/** Switch an existing editor between editable and read-only. */
export function setEditorReadOnly(view: EditorView, compartment: Compartment, readOnly: boolean): void {
  view.dispatch({ effects: compartment.reconfigure(readOnlyExtensions(readOnly)) })
}

/** Build the full extension set for one editor instance. */
export function buildEditorExtensions(options: EditorOptions): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    ...foldingExtensions(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    ...indentationExtensions(options.indent),
    ...bracketExtensions(),
    ...completionExtensions(),
    rectangularSelection(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search({ top: true }),
    keymap.of([
      { key: 'Mod-/', run: toggleComment },
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      indentWithTab,
    ]),
    EditorView.updateListener.of(options.onUpdate),
    options.readOnlyCompartment.of(readOnlyExtensions(options.readOnly)),
    options.language.support ?? [],
    ...editorThemeExtensions(),
  ]
}

/** The caret and anchor line/column positions, for preserving selection. */
export interface LineColumnSelection {
  anchorLine: number
  anchorColumn: number
  headLine: number
  headColumn: number
}

export function selectionInLines(view: EditorView): LineColumnSelection {
  const selection = view.state.selection.main
  const anchorLine = view.state.doc.lineAt(selection.anchor)
  const headLine = view.state.doc.lineAt(selection.head)
  return {
    anchorLine: anchorLine.number,
    anchorColumn: selection.anchor - anchorLine.from,
    headLine: headLine.number,
    headColumn: selection.head - headLine.from,
  }
}

function positionAt(doc: EditorState['doc'], lineNumber: number, column: number): number {
  const line = doc.line(Math.min(Math.max(1, lineNumber), doc.lines))
  return Math.min(line.from + Math.max(0, column), line.to)
}

/**
 * Replace the whole document while keeping the logical cursor location and
 * scroll offsets. Used for silent refreshes when the file changed on disk and
 * there is no local draft.
 */
export function applyTextPreservingSelection(view: EditorView, text: string): void {
  if (view.state.doc.toString() === text) return
  const selection = selectionInLines(view)
  const scrollTop = view.scrollDOM.scrollTop
  const scrollLeft = view.scrollDOM.scrollLeft
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
  const doc = view.state.doc
  view.dispatch({
    selection: {
      anchor: positionAt(doc, selection.anchorLine, selection.anchorColumn),
      head: positionAt(doc, selection.headLine, selection.headColumn),
    },
  })
  view.scrollDOM.scrollTop = scrollTop
  view.scrollDOM.scrollLeft = scrollLeft
}

/** Read the caret as 1-based line and column numbers. */
export function cursorPosition(view: EditorView): { line: number, column: number } {
  const position = view.state.selection.main.head
  const line = view.state.doc.lineAt(position)
  return { line: line.number, column: position - line.from + 1 }
}

/** Scroll one 1-based source line into view and place the caret there. */
export function revealLine(view: EditorView, lineNumber: number): void {
  const doc = view.state.doc
  const line = doc.line(Math.min(Math.max(1, Math.floor(lineNumber)), doc.lines))
  view.dispatch({
    selection: { anchor: line.from },
    effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
  })
}
