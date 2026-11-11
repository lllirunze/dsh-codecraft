/** DOM structure, selection, folding, and matching-tag behavior for HTML. */

import { foldNodeProp, syntaxTree } from '@codemirror/language'
import {
  EditorSelection,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
} from '@codemirror/state'
import { Decoration, EditorView, keymap } from '@codemirror/view'

type TreeNode = ReturnType<typeof syntaxTree>['topNode']

interface StructuralNode {
  name: string
  from: number
  to: number
  nameFrom: number
}

function ancestor(node: TreeNode | null, name: string): TreeNode | null {
  for (let current = node; current !== null; current = current.parent) {
    if (current.name === name) return current
  }
  return null
}

function tagNameNode(node: TreeNode | null): TreeNode | null {
  if (node === null) return null
  if (node.name === 'TagName') return node
  return node.getChild('TagName')
}

function elementName(state: EditorState, node: TreeNode | null): string {
  const element = node?.name === 'Element' ? node : ancestor(node, 'Element')
  const name = tagNameNode(element?.firstChild ?? null)
  return name === null ? '' : state.sliceDoc(name.from, name.to).toLowerCase()
}

function elementChain(state: EditorState, position: number): StructuralNode[] {
  const tree = syntaxTree(state)
  const result: StructuralNode[] = []
  let node: TreeNode | null = tree.resolveInner(position, -1)
  const element = ancestor(node, 'Element')
  for (let current = element; current !== null; current = ancestor(current.parent, 'Element')) {
    const name = elementName(state, current)
    if (name.length === 0) continue
    const nameNode = tagNameNode(current.firstChild)
    result.push({
      name,
      from: current.from,
      to: current.to,
      nameFrom: nameNode?.from ?? current.from + 1,
    })
  }
  return result.reverse()
}

export interface HtmlBreadcrumb {
  name: string
  from: number
  to: number
  /** Offset of the first start-tag name character. */
  nameFrom: number
}

/** Ancestor chain from the document root to the element containing the caret. */
export function htmlBreadcrumbs(state: EditorState, position = state.selection.main.head): HtmlBreadcrumb[] {
  return elementChain(state, position).map(({ name, from, to, nameFrom }) => ({ name, from, to, nameFrom }))
}

/** Source range of the element containing the caret, when one exists. */
export function htmlCurrentElement(state: EditorState, position = state.selection.main.head): { from: number, to: number } | null {
  const chain = elementChain(state, position)
  const current = chain.at(-1)
  return current === undefined ? null : { from: current.from, to: current.to }
}

function scopeDecorations(state: EditorState) {
  const range = htmlCurrentElement(state)
  const builder = new RangeSetBuilder<Decoration>()
  if (range !== null && range.to > range.from) {
    builder.add(range.from, range.to, Decoration.mark({ class: 'dsh-codecraft-html-scope' }))
  }
  return builder.finish()
}

/** Keep one subtle decoration over the element containing the caret. */
export function htmlScopeExtensions(): Extension[] {
  const field = StateField.define({
    create: state => scopeDecorations(state),
    update(value, transaction) {
      if (!transaction.docChanged && !transaction.selection) return value
      return scopeDecorations(transaction.state)
    },
    provide: fieldValue => EditorView.decorations.from(fieldValue),
  })
  return [field]
}

/** Fold multiline comments in addition to the package's element folding. */
export function htmlCommentFolding(): ReturnType<typeof foldNodeProp.add> {
  return foldNodeProp.add({
    Comment(node) {
      return node.to > node.from ? { from: node.from, to: node.to } : null
    },
  })
}

function matchingTagName(state: EditorState, position: number): { from: number, to: number } | null {
  let node: TreeNode | null = syntaxTree(state).resolveInner(position, -1)
  const tag = ancestor(node, 'OpenTag') ?? ancestor(node, 'CloseTag') ?? ancestor(node, 'SelfClosingTag')
  if (tag === null) return null
  if (tag.name === 'SelfClosingTag') return null
  if (tag.name === 'OpenTag') {
    const element = tag.parent
    const close = element?.lastChild
    if (element === null || element === undefined || close?.name !== 'CloseTag') return null
    const name = tagNameNode(close)
    return name === null ? null : { from: name.from, to: name.to }
  }
  const open = tag.parent?.firstChild
  if (open === null || open === undefined || open.name !== 'OpenTag') return null
  const name = tagNameNode(open)
  return name === null ? null : { from: name.from, to: name.to }
}

/** Move the caret between a start tag and its parsed matching end tag. */
export function jumpToMatchingTag(view: EditorView): boolean {
  const target = matchingTagName(view.state, view.state.selection.main.head)
  if (target === null) return false
  view.dispatch({
    selection: EditorSelection.cursor(target.from),
    effects: EditorView.scrollIntoView(target.from, { y: 'center' }),
  })
  return true
}

interface SelectionLevel {
  from: number
  to: number
}

function selectionLevels(state: EditorState, position: number): SelectionLevel[] {
  const tree = syntaxTree(state)
  const resolved = tree.resolveInner(position, -1)
  const levels: SelectionLevel[] = []
  const add = (from: number, to: number): void => {
    if (to <= from) return
    if (levels.some(level => level.from === from && level.to === to)) return
    levels.push({ from, to })
  }

  const attribute = ancestor(resolved, 'Attribute')
  if (attribute !== null) {
    const value = attribute.getChild('AttributeValue')
    if (value !== null) {
      const text = state.sliceDoc(value.from, value.to)
      const quoted = (text.startsWith('"') && text.endsWith('"'))
        || (text.startsWith("'") && text.endsWith("'"))
      if (quoted && value.to - value.from > 2) add(value.from + 1, value.to - 1)
      else add(value.from, value.to)
    }
    add(attribute.from, attribute.to)
  }

  const openTag = ancestor(resolved, 'OpenTag') ?? ancestor(resolved, 'SelfClosingTag')
  if (openTag !== null) add(openTag.from, openTag.to)

  const element = ancestor(resolved, 'Element')
  if (element !== null) add(element.from, element.to)

  for (let current = element?.parent ?? null; current !== null; current = current.parent) {
    if (current.name === 'Element') add(current.from, current.to)
  }
  return levels
}

interface SelectionStack {
  levels: SelectionLevel[]
  index: number
}

const setSelectionStack = StateEffect.define<SelectionStack | null>()

const selectionStackField = StateField.define<SelectionStack | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setSelectionStack)) return effect.value
    }
    if (transaction.docChanged || transaction.selection) return null
    return value
  },
})

function sameLevel(
  level: SelectionLevel | undefined,
  selection: { from: number, to: number },
): boolean {
  return level !== undefined && level.from === selection.from && level.to === selection.to
}

function initialStack(
  state: EditorState,
  selection: { from: number, to: number, head: number },
): SelectionStack | undefined {
  const levels = selectionLevels(state, selection.head)
  const exact = levels.findIndex(level => sameLevel(level, selection))
  const index = exact >= 0
    ? exact
    : levels.findIndex(level => level.from <= selection.from && level.to >= selection.to)
  return index < 0 ? undefined : { levels, index }
}

export function expandHtmlSelection(view: EditorView): boolean {
  const selection = view.state.selection.main
  const stored = view.state.field(selectionStackField)
  const continued = stored !== null && sameLevel(stored.levels[stored.index], selection)
  const stack = continued ? stored : initialStack(view.state, selection)
  if (stack === undefined || stack === null) return false
  const nextIndex = continued ? stack.index + 1 : stack.index
  const next = stack.levels[nextIndex]
  if (next === undefined) return false
  view.dispatch({
    selection: EditorSelection.range(next.from, next.to),
    effects: setSelectionStack.of({ levels: stack.levels, index: nextIndex }),
    userEvent: 'select.expand',
  })
  return true
}

export function shrinkHtmlSelection(view: EditorView): boolean {
  const selection = view.state.selection.main
  const stored = view.state.field(selectionStackField)
  if (stored === null || !sameLevel(stored.levels[stored.index], selection)) return false
  const nextIndex = stored.index - 1
  const next = stored.levels[nextIndex]
  if (next === undefined) return false
  view.dispatch({
    selection: EditorSelection.range(next.from, next.to),
    effects: setSelectionStack.of({ levels: stored.levels, index: nextIndex }),
    userEvent: 'select.shrink',
  })
  return true
}

/** Syntax-aware expand/shrink and matching-tag commands for HTML editors. */
export function htmlStructureExtensions(): Extension[] {
  return [
    ...htmlScopeExtensions(),
    selectionStackField,
    keymap.of([
      { key: 'Shift-Alt-ArrowRight', run: expandHtmlSelection },
      { key: 'Shift-Alt-ArrowLeft', run: shrinkHtmlSelection },
      { key: 'Mod-Shift-\\', run: jumpToMatchingTag },
    ]),
  ]
}

/** Exposed for focused tests and diagnostics. */
export function htmlSelectionLevels(state: EditorState, position: number): SelectionLevel[] {
  return selectionLevels(state, position)
}

