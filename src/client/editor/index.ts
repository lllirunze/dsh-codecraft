/**
 * CodeMirror 6 configuration and small document helpers.
 *
 * The editor keeps its own authoritative document; React only mirrors status
 * (cursor, dirty, language) and drives explicit replacements when the file
 * changes on disk with no unsaved edit.
 *
 * @module dsh-codecraft/client/editor
 */

import {
  defaultKeymap,
  history,
  historyKeymap,
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
import type { IndentationSettings } from '../../settings/schema.js'
import type { IntelligenceRange } from '../../protocol.js'
import type { FileLanguage } from '../languages/index.js'
import type { CompletionSource } from '@codemirror/autocomplete'
import { editorThemeExtensions } from '../theme.js'
import { bracketExtensions } from './extensions/brackets.js'
import { completionExtensions } from './extensions/completion.js'
import { foldingExtensions } from './extensions/folding.js'
import { indentationExtensions } from './extensions/indentation.js'

export interface EditorOptions {
  language: FileLanguage
  indentation: IndentationSettings
  readOnly: boolean
  readOnlyCompartment: Compartment
  indentationCompartment: Compartment
  languageCompartment: Compartment
  javaEditingAssistanceEnabled: boolean
  htmlEditingAssistanceEnabled?: boolean
  onUpdate: (update: ViewUpdate) => void
  completionSource?: CompletionSource
  extraExtensions?: Extension
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

export function setEditorIndentation(
  view: EditorView,
  compartment: Compartment,
  settings: IndentationSettings,
): void {
  view.dispatch({ effects: compartment.reconfigure(indentationExtensions(settings)) })
}

/** Extensions controlled by the Java assistance setting; other languages remain enabled. */
export function languageExtensions(
  language: FileLanguage,
  javaEditingAssistanceEnabled: boolean,
  htmlEditingAssistanceEnabled = true,
): Extension {
  if (language.id === 'java' && !javaEditingAssistanceEnabled) return []
  if (language.id === 'html' && !htmlEditingAssistanceEnabled) return []
  if (language.initializationError === true) return []
  return [language.support ?? [], language.editorExtensions]
}

/** Apply the accepted Java feature gate without rebuilding an open editor. */
export function setJavaEditingAssistance(
  view: EditorView,
  compartment: Compartment,
  language: FileLanguage,
  enabled: boolean,
): void {
  if (language.id !== 'java') return
  view.dispatch({
    effects: compartment.reconfigure(languageExtensions(language, enabled, true)),
  })
}

export type HtmlEditingStatus = 'ready' | 'disabled' | 'error'

/** Apply the accepted HTML feature gate and safely fall back after a failure. */
export function setHtmlEditingAssistance(
  view: EditorView,
  compartment: Compartment,
  language: FileLanguage,
  enabled: boolean,
): HtmlEditingStatus | undefined {
  if (language.id !== 'html') return undefined
  if (!enabled) {
    try {
      view.dispatch({ effects: compartment.reconfigure([]) })
      return 'disabled'
    } catch {
      return 'error'
    }
  }
  if (language.initializationError === true) {
    try {
      view.dispatch({ effects: compartment.reconfigure([]) })
    } catch {
      // Retain the existing editable view and report the failed fallback.
    }
    return 'error'
  }
  try {
    view.dispatch({
      effects: compartment.reconfigure(languageExtensions(language, true, true)),
    })
    return 'ready'
  } catch {
    try {
      view.dispatch({ effects: compartment.reconfigure([]) })
    } catch {
      // The document remains owned by the existing EditorView even if fallback dispatch fails.
    }
    return 'error'
  }
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
    options.indentationCompartment.of(indentationExtensions(options.indentation)),
    ...bracketExtensions(options.language),
    ...completionExtensions(options.completionSource),
    rectangularSelection(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search({ top: true }),
    keymap.of([
      { key: 'Mod-/', run: toggleComment },
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
    ]),
    EditorView.updateListener.of(options.onUpdate),
    options.readOnlyCompartment.of(readOnlyExtensions(options.readOnly)),
    options.languageCompartment.of(languageExtensions(
      options.language,
      options.javaEditingAssistanceEnabled,
      options.htmlEditingAssistanceEnabled ?? true,
    )),
    options.extraExtensions ?? [],
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
 * there is no unsaved edit.
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

/** Reveal one zero-based UTF-16 LSP range and select its exact span. */
export function revealRange(view: EditorView, range: IntelligenceRange): boolean {
  const locate = (lineNumber: number, character: number): number | undefined => {
    if (!Number.isInteger(lineNumber) || !Number.isInteger(character)
      || lineNumber < 0 || lineNumber >= view.state.doc.lines || character < 0) return undefined
    const line = view.state.doc.line(lineNumber + 1)
    return character > line.length ? undefined : line.from + character
  }
  const from = locate(range.start.line, range.start.character)
  const to = locate(range.end.line, range.end.character)
  if (from === undefined || to === undefined || from > to) return false
  view.dispatch({
    selection: { anchor: from, head: to },
    effects: EditorView.scrollIntoView(from, { y: 'center' }),
  })
  view.focus()
  return true
}
