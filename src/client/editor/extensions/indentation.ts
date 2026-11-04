/** Language-neutral, space-only indentation commands and editor extensions. */

import { indentUnit } from '@codemirror/language'
import {
  countColumn,
  EditorSelection,
  EditorState,
  Prec,
  type ChangeSpec,
  type Extension,
  type TransactionSpec,
} from '@codemirror/state'
import { EditorView, keymap, type Command } from '@codemirror/view'
import type { IndentationSettings } from '../../../settings/schema.js'

const CLOSER_FOR: Readonly<Record<string, string>> = {
  '(': ')',
  '[': ']',
  '{': '}',
}

const OPENER_FOR: Readonly<Record<string, string>> = {
  ')': '(',
  ']': '[',
  '}': '{',
}

export function nextIndentBoundary(current: number, width: number): number {
  return (Math.floor(Math.max(0, current) / width) + 1) * width
}

export function previousIndentBoundary(current: number, width: number): number {
  return Math.max(0, (Math.ceil(Math.max(0, current) / width) - 1) * width)
}

function leadingWhitespace(text: string): string {
  return /^[ \t]*/.exec(text)?.[0] ?? ''
}

function visualIndent(prefix: string, width: number): number {
  return countColumn(prefix, width)
}

function selectedLineStarts(state: EditorState): number[] {
  const starts = new Set<number>()
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from)
    let last = state.doc.lineAt(range.to)
    if (!range.empty && range.to === last.from && last.number > first.number) {
      last = state.doc.line(last.number - 1)
    }
    for (let number = first.number; number <= last.number; number += 1) {
      starts.add(state.doc.line(number).from)
    }
  }
  return [...starts].sort((left, right) => left - right)
}

function changeSelectedLines(view: EditorView, width: number, direction: 'more' | 'less'): boolean {
  const { state } = view
  const specs: ChangeSpec[] = []
  for (const start of selectedLineStarts(state)) {
    const line = state.doc.lineAt(start)
    if (line.text.trim().length === 0) continue
    const prefix = leadingWhitespace(line.text)
    const current = visualIndent(prefix, width)
    const target = direction === 'more'
      ? nextIndentBoundary(current, width)
      : previousIndentBoundary(current, width)
    if (target === current && prefix === ' '.repeat(target)) continue
    specs.push({ from: line.from, to: line.from + prefix.length, insert: ' '.repeat(target) })
  }

  if (specs.length === 0) return true
  const changes = state.changes(specs)
  view.dispatch({
    changes,
    selection: state.selection.map(changes),
    userEvent: direction === 'more' ? 'input.indent' : 'input.dedent',
  })
  return true
}

export function indentMoreByBoundary(width: number): Command {
  return (view) => {
    const selection = view.state.selection
    if (selection.ranges.length > 1 || !selection.main.empty) {
      return changeSelectedLines(view, width, 'more')
    }

    const caret = selection.main.head
    const line = view.state.doc.lineAt(caret)
    const prefix = leadingWhitespace(line.text)
    const codeStart = line.from + prefix.length
    if (line.text.trim().length === 0) {
      const target = nextIndentBoundary(visualIndent(prefix, width), width)
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: ' '.repeat(target) },
        selection: EditorSelection.cursor(line.from + target),
        userEvent: 'input.indent',
      })
      return true
    }
    if (caret > codeStart) {
      view.dispatch({
        changes: { from: caret, insert: ' '.repeat(width) },
        selection: EditorSelection.cursor(caret + width),
        userEvent: 'input.type',
      })
      return true
    }
    return changeSelectedLines(view, width, 'more')
  }
}

export function indentLessByBoundary(width: number): Command {
  return (view) => {
    const selection = view.state.selection
    if (selection.ranges.length === 1 && selection.main.empty) {
      const caret = selection.main.head
      const line = view.state.doc.lineAt(caret)
      if (line.text.trim().length === 0) {
        const prefix = leadingWhitespace(line.text)
        const target = previousIndentBoundary(visualIndent(prefix, width), width)
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: ' '.repeat(target) },
          selection: EditorSelection.cursor(line.from + target),
          userEvent: 'input.dedent',
        })
        return true
      }
    }
    return changeSelectedLines(view, width, 'less')
  }
}

export function newlineWithGenericIndent(width: number): Command {
  return (view) => {
    const state = view.state
    const spec = state.changeByRange((range) => {
      const line = state.doc.lineAt(range.from)
      const sameLine = state.doc.lineAt(range.to).number === line.number
      const before = state.doc.sliceString(line.from, range.from)
      const after = sameLine ? state.doc.sliceString(range.to, line.to) : ''
      const base = ' '.repeat(visualIndent(leadingWhitespace(line.text), width))
      const trimmedBefore = before.trimEnd()
      const opener = trimmedBefore.at(-1) ?? ''
      const closer = CLOSER_FOR[opener]

      if (range.empty && closer !== undefined) {
        const closerOffset = after.search(/\S/)
        if (closerOffset >= 0 && after[closerOffset] === closer) {
          const gapFrom = line.from + trimmedBefore.length
          const gapTo = range.to + closerOffset
          const insert = `\n${base}${' '.repeat(width)}\n${base}`
          return {
            changes: { from: gapFrom, to: gapTo, insert },
            range: EditorSelection.cursor(gapFrom + 1 + base.length + width),
          }
        }

        const gapFrom = line.from + trimmedBefore.length
        const insert = `\n${base}${' '.repeat(width)}`
        return {
          changes: { from: gapFrom, to: range.to, insert },
          range: EditorSelection.cursor(gapFrom + insert.length),
        }
      }

      const insert = `\n${base}`
      return {
        changes: { from: range.from, to: range.to, insert },
        range: EditorSelection.cursor(range.from + insert.length),
      }
    })
    view.dispatch({ ...spec, userEvent: 'input' })
    return true
  }
}

function matchingOpener(state: EditorState, position: number, closer: string): number | undefined {
  const opener = OPENER_FOR[closer]
  if (opener === undefined) return undefined
  let depth = 0
  for (let index = position - 1; index >= 0; index -= 1) {
    const character = state.doc.sliceString(index, index + 1)
    if (character === closer) depth += 1
    else if (character === opener) {
      if (depth === 0) return index
      depth -= 1
    }
  }
  return undefined
}

/** Build the aligned closer edit separately so it can be tested without a DOM. */
export function alignedClosingDelimiter(
  state: EditorState,
  position: number,
  closer: string,
): TransactionSpec | undefined {
  const line = state.doc.lineAt(position)
  if (state.doc.sliceString(line.from, position).trim().length !== 0) return undefined
  const opener = matchingOpener(state, position, closer)
  if (opener === undefined) return undefined
  const openerLine = state.doc.lineAt(opener)
  const target = ' '.repeat(visualIndent(leadingWhitespace(openerLine.text), state.tabSize))
  const existingCloser = state.doc.sliceString(position, position + 1) === closer
  return {
    changes: {
      from: line.from,
      to: existingCloser ? position + 1 : position,
      insert: `${target}${closer}`,
    },
    selection: EditorSelection.cursor(line.from + target.length + 1),
    userEvent: 'input.type',
  }
}

function closingDelimiterHandler(view: EditorView, from: number, to: number, text: string): boolean {
  if (from !== to || text.length !== 1 || OPENER_FOR[text] === undefined) return false
  if (view.state.selection.ranges.length !== 1 || view.state.selection.main.head !== from) return false
  const spec = alignedClosingDelimiter(view.state, from, text)
  if (spec === undefined) return false
  view.dispatch(spec)
  return true
}

export function indentationExtensions(settings: IndentationSettings): Extension[] {
  const width = settings.indentSize
  return [
    EditorState.tabSize.of(width),
    indentUnit.of(' '.repeat(width)),
    Prec.high(keymap.of([
      { key: 'Enter', run: newlineWithGenericIndent(width) },
      { key: 'Tab', run: indentMoreByBoundary(width), shift: indentLessByBoundary(width) },
    ])),
    Prec.high(EditorView.inputHandler.of(closingDelimiterHandler)),
  ]
}
