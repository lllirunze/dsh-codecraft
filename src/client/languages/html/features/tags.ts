import { htmlLanguage } from '@codemirror/lang-html'
import { syntaxTree } from '@codemirror/language'
import type { EditorState, Extension } from '@codemirror/state'
import { EditorSelection } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

export const HTML_VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
])

export const HTML_OPTIONAL_END_ELEMENTS = new Set([
  'html',
  'head',
  'body',
  'p',
  'li',
  'dt',
  'dd',
  'rt',
  'rp',
  'optgroup',
  'option',
  'colgroup',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
])

type HtmlNode = ReturnType<typeof syntaxTree>['topNode']

function elementName(state: EditorState, node: HtmlNode | null, maximum = state.doc.length): string {
  const tag = node?.name === 'Element' ? node.firstChild : node
  const name = tag?.getChild('TagName')
  return name === null || name === undefined
    ? ''
    : state.sliceDoc(name.from, Math.min(name.to, maximum)).toLowerCase()
}

export interface HtmlClosingEdit {
  from: number
  to: number
  insert: string
  cursor?: number
}

/** Resolve the additional edit after `>` or `/` has already been inserted. */
export function htmlClosingEdit(
  state: EditorState,
  text: '>' | '/',
  head = state.selection.main.head,
): HtmlClosingEdit | undefined {
  const after = syntaxTree(state).resolveInner(head, -1)
  if (text === '>' && after.name === 'EndTag') {
    const openTag = after.parent
    const element = openTag?.parent
    const name = elementName(state, openTag, head)
    if (element !== null && element !== undefined
      && name.length > 0
      && !HTML_VOID_ELEMENTS.has(name)
      && !HTML_OPTIONAL_END_ELEMENTS.has(name)
      && !isClosed(state, element, name)) {
      const to = head + (state.sliceDoc(head, head + 1) === '>' ? 1 : 0)
      return { from: head, to, insert: `</${name}>` }
    }
  } else if (text === '/' && after.name === 'IncompleteCloseTag') {
    const element = after.parent
    const name = elementName(state, element, head)
    if (after.from === head - 2
      && element?.lastChild?.name !== 'CloseTag'
      && name.length > 0
      && !HTML_VOID_ELEMENTS.has(name)) {
      const to = head + (state.sliceDoc(head, head + 1) === '>' ? 1 : 0)
      const insert = `${name}>`
      return { from: head, to, insert, cursor: head + insert.length }
    }
  }
  return undefined
}

function findParentElement(node: HtmlNode | null): HtmlNode | null {
  for (let current = node; current !== null; current = current.parent) {
    if (current.name === 'Element') return current
  }
  return null
}

function isClosed(state: EditorState, element: HtmlNode, name: string): boolean {
  let current = element
  for (;;) {
    if (current.lastChild?.name !== 'CloseTag') return false
    const parent = current.parent
    if (parent === null || elementName(state, parent) !== name) return true
    current = parent
  }
}

/** Standards-aware local close-tag insertion without forcing optional end tags. */
export function htmlTagClosingExtensions(): Extension {
  return EditorView.inputHandler.of((view, from, to, text, insertTransaction) => {
    if (view.composing || view.state.readOnly || from !== to || (text !== '>' && text !== '/')) return false
    if (!htmlLanguage.isActiveAt(view.state, from, -1)) return false

    const base = insertTransaction()
    const state = base.state
    const closeTags = state.changeByRange((range) => {
      const didType = state.sliceDoc(range.from - 1, range.to) === text
      if (!didType) return { range }
      const edit = htmlClosingEdit(state, text, range.head)
      if (edit !== undefined) return {
        range: edit.cursor === undefined ? range : EditorSelection.cursor(edit.cursor, -1),
        changes: { from: edit.from, to: edit.to, insert: edit.insert },
      }
      return { range }
    })
    if (closeTags.changes.empty) return false
    view.dispatch([
      base,
      state.update(closeTags, {
        userEvent: 'input.complete',
        scrollIntoView: true,
      }),
    ])
    return true
  })
}
