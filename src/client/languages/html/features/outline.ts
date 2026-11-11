/** Nested element Outline for the current HTML document. */

import type { EditorState } from '@codemirror/state'
import type { DocumentSymbol } from 'vscode-html-languageservice'
import {
  htmlLanguageService,
  htmlParsedDocument,
  htmlTextDocument,
  offsetAtPosition,
} from '../service.js'

export interface HtmlOutlineNode {
  /** Tag name plus a compact id/class hint, as shown in the tree. */
  label: string
  /** Raw tag name. */
  tag: string
  /** Offset of the element's real `<` start. */
  from: number
  /** Offset just after the element's end. */
  to: number
  /** Offset of the first character of the start-tag name. */
  nameFrom: number
  children: HtmlOutlineNode[]
}

function tagOfLabel(label: string): string {
  const match = /^[A-Za-z][A-Za-z0-9:-]*/.exec(label)
  return match === null ? '' : match[0].toLowerCase()
}

function nameOffset(state: EditorState, elementStart: number): number {
  const limit = Math.min(state.doc.length, elementStart + 80)
  const text = state.sliceDoc(elementStart, limit)
  const match = /^<\s*([A-Za-z][A-Za-z0-9:-]*)/.exec(text)
  if (match === null) return state.doc.lineAt(elementStart).from
  return elementStart + match[0].length - (match[1] ?? '').length
}

function convert(state: EditorState, symbol: DocumentSymbol): HtmlOutlineNode | undefined {
  const tag = tagOfLabel(symbol.name)
  if (tag.length === 0) return undefined
  const from = offsetAtPosition(state.doc, symbol.range.start)
  const to = offsetAtPosition(state.doc, symbol.range.end)
  return {
    label: symbol.name,
    tag,
    from,
    to,
    nameFrom: nameOffset(state, from),
    children: (symbol.children ?? [])
      .map(child => convert(state, child))
      .filter((child): child is HtmlOutlineNode => child !== undefined),
  }
}

/** Build the element tree for one editor state, preserving document nesting. */
export function htmlOutline(state: EditorState): HtmlOutlineNode[] {
  const symbols = htmlLanguageService.findDocumentSymbols2(
    htmlTextDocument(state.doc),
    htmlParsedDocument(state.doc),
  )
  return symbols
    .map(symbol => convert(state, symbol))
    .filter((node): node is HtmlOutlineNode => node !== undefined)
}

/** Flatten an Outline tree into document order, for keyboard navigation tests. */
export function flattenOutline(nodes: readonly HtmlOutlineNode[]): HtmlOutlineNode[] {
  const result: HtmlOutlineNode[] = []
  const walk = (list: readonly HtmlOutlineNode[]): void => {
    for (const node of list) {
      result.push(node)
      walk(node.children)
    }
  }
  walk(nodes)
  return result
}
