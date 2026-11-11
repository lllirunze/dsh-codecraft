/** Whole-document and selection formatting for HTML with shared indentation. */

import { indentUnit, syntaxTree } from '@codemirror/language'
import type { ChangeSpec, EditorState, Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import type { TextEdit } from 'vscode-html-languageservice'
import {
  htmlLanguageService,
  htmlTextDocument,
  offsetAtPosition,
  servicePosition,
} from '../service.js'
import { htmlFeatureHost } from './host.js'

export type HtmlFormatError =
  | 'empty-document'
  | 'unsupported-selection'
  | 'formatter-failed'
  | 'outside-selection'

export interface HtmlFormatPlan {
  changes: ChangeSpec[]
  /** True when the formatted text differs from the current text. */
  changed: boolean
}

export interface HtmlLineRange {
  from: number
  to: number
  lastLine: number
}

const PROTECTED_TAGS = 'pre,textarea,script,style'

function options(indentSize: number, endWithNewline: boolean) {
  return {
    tabSize: Math.max(1, indentSize),
    insertSpaces: true,
    indentEmptyLines: false,
    wrapLineLength: 0,
    unformatted: PROTECTED_TAGS,
    contentUnformatted: PROTECTED_TAGS,
    indentInnerHtml: false,
    wrapAttributes: 'auto' as const,
    preserveNewLines: true,
    maxPreserveNewLines: 2,
    indentHandlebars: false,
    endWithNewline,
    extraLiners: '',
    indentScripts: 'keep' as const,
    unformattedContentDelimiter: '',
  }
}

function plansFromEdits(
  state: EditorState,
  edits: readonly TextEdit[],
  within?: { from: number, to: number },
): HtmlFormatPlan | { error: HtmlFormatError } {
  const changes: ChangeSpec[] = []
  const doc = state.doc
  for (const edit of edits) {
    const from = offsetAtPosition(doc, edit.range.start)
    const to = offsetAtPosition(doc, edit.range.end)
    if (within !== undefined && (from < within.from || to > within.to)) {
      return { error: 'outside-selection' }
    }
    if (from === to && edit.newText === '') continue
    changes.push({ from, to, insert: edit.newText })
  }
  if (changes.length === 0) return { error: 'formatter-failed' }
  return { changes, changed: true }
}

function selectionIndent(state: EditorState, from: number): string {
  const line = state.doc.lineAt(from)
  const text = state.sliceDoc(line.from, line.to)
  return /^[ \t]*/.exec(text)?.[0] ?? ''
}

function indentText(text: string, baseIndent: string): string {
  if (baseIndent === '') return text
  return text
    .split('\n')
    .map(line => line.length === 0 ? line : `${baseIndent}${line}`)
    .join('\n')
}

/** Plan whole-document formatting using the accepted indentation size. */
export function planFormatDocument(
  state: EditorState,
  indentSize: number,
): HtmlFormatPlan | { error: HtmlFormatError } {
  if (state.doc.length === 0) return { error: 'empty-document' }
  const text = state.doc.toString()
  const edits = htmlLanguageService.format(
    htmlTextDocument(state.doc),
    {
      start: { line: 0, character: 0 },
      end: servicePosition(state.doc, state.doc.length),
    },
    options(indentSize, text.endsWith('\n')),
  )
  return plansFromEdits(state, edits)
}

/** Treat the selection as complete lines; anything else is unsupported. */
export function selectedLineRange(state: EditorState): HtmlLineRange | { error: HtmlFormatError } {
  const selection = state.selection.main
  if (selection.empty) return { error: 'unsupported-selection' }
  const startLine = state.doc.lineAt(selection.from)
  if (selection.from !== startLine.from) return { error: 'unsupported-selection' }
  const endLine = state.doc.lineAt(selection.to)
  let lastLine: number
  let to: number
  if (selection.to === endLine.from && endLine.number > startLine.number) {
    lastLine = endLine.number - 1
    to = endLine.from
  } else if (selection.to === endLine.to) {
    lastLine = endLine.number
    to = endLine.to
  } else {
    return { error: 'unsupported-selection' }
  }
  if (lastLine < startLine.number) return { error: 'unsupported-selection' }
  return { from: startLine.from, to, lastLine }
}

const MARKUP_NODES = new Set([
  'OpenTag',
  'CloseTag',
  'SelfClosingTag',
  'Attribute',
  'AttributeValue',
  'Comment',
])

function insideIncompleteMarkup(state: EditorState, offset: number): boolean {
  if (offset <= 0 || offset > state.doc.length) return false
  const last = state.sliceDoc(offset - 1, offset)
  const node = syntaxTree(state).resolveInner(offset - 1, -1)
  for (let current: typeof node | null = node; current !== null; current = current.parent) {
    if (!MARKUP_NODES.has(current.name)) continue
    if (current.to > offset) return true
    if (current.to === offset) {
      if (current.name === 'Comment') return true
      if (last !== '>') return true
    }
  }
  return false
}

/** Plan selection formatting without changing anything outside the selection. */
export function planFormatSelection(
  state: EditorState,
  indentSize: number,
): HtmlFormatPlan | { error: HtmlFormatError } {
  const range = selectedLineRange(state)
  if ('error' in range) return range
  if (range.from === range.to) return { error: 'unsupported-selection' }
  if (insideIncompleteMarkup(state, range.from) || insideIncompleteMarkup(state, range.to)) {
    return { error: 'unsupported-selection' }
  }
  const edits = htmlLanguageService.format(
    htmlTextDocument(state.doc),
    {
      start: servicePosition(state.doc, range.from),
      end: servicePosition(state.doc, range.to),
    },
    options(indentSize, false),
  )
  const plan = plansFromEdits(state, edits, { from: range.from, to: range.to })
  if ('error' in plan) return plan
  const baseIndent = selectionIndent(state, range.from)
  const changes: ChangeSpec[] = []
  for (const change of plan.changes) {
    const spec = change as { from: number, to?: number, insert?: unknown }
    changes.push({
      from: spec.from,
      ...(spec.to === undefined ? {} : { to: spec.to }),
      insert: indentText(String(spec.insert ?? ''), baseIndent),
    })
  }
  return { changes, changed: true }
}

function report(view: EditorView, code: HtmlFormatError): void {
  htmlFeatureHost(view)?.report(code)
}

function applyPlan(view: EditorView, plan: HtmlFormatPlan | { error: HtmlFormatError }): boolean {
  if ('error' in plan) {
    report(view, plan.error)
    return true
  }
  view.dispatch({
    changes: plan.changes,
    userEvent: 'input.format',
    scrollIntoView: true,
  })
  return true
}

function indentSizeOf(state: EditorState): number {
  return Math.max(1, state.facet(indentUnit).length)
}

/** Format the whole HTML document as one undoable transaction. */
export function formatHtmlDocument(view: EditorView): boolean {
  if (view.state.readOnly) return false
  return applyPlan(view, planFormatDocument(view.state, indentSizeOf(view.state)))
}

/** Format the selected complete lines as one undoable transaction. */
export function formatHtmlSelection(view: EditorView): boolean {
  if (view.state.readOnly) return false
  return applyPlan(view, planFormatSelection(view.state, indentSizeOf(view.state)))
}

/** Standard HTML formatting shortcuts. */
export function htmlFormattingExtensions(): Extension[] {
  return [
    keymap.of([
      { key: 'Shift-Alt-f', run: formatHtmlDocument },
      { key: 'Mod-k Mod-f', run: formatHtmlSelection },
    ]),
  ]
}
