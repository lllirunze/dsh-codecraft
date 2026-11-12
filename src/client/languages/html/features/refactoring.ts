/** Syntax-aware, current-document HTML rename planning. */

import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'

type TreeNode = ReturnType<typeof syntaxTree>['topNode']

export interface HtmlRefactorChange {
  from: number
  to: number
  insert: string
  before: string
}

export interface HtmlRefactorPlan {
  kind: 'tag' | 'id'
  oldName: string
  newName: string
  changes: HtmlRefactorChange[]
  /** Immutable CodeMirror document identity used to reject stale previews. */
  document: EditorState['doc']
}

export type HtmlRefactorError =
  | 'not-tag'
  | 'not-id'
  | 'invalid-name'
  | 'unsafe-tag'
  | 'duplicate-id'
  | 'id-conflict'
  | 'unchanged'

export type HtmlRefactorResult =
  | { plan: HtmlRefactorPlan }
  | { error: HtmlRefactorError }

export interface HtmlRefactorApplyState {
  active: boolean
  readOnly: boolean
  conflicted: boolean
  saving: boolean
}

/** Pure local portion of the confirmation guard; disk version is checked by the tab owner. */
export function canApplyHtmlRefactor(
  plan: HtmlRefactorPlan,
  state: EditorState,
  applyState: HtmlRefactorApplyState,
): boolean {
  return applyState.active
    && !applyState.readOnly
    && !applyState.conflicted
    && !applyState.saving
    && state.doc === plan.document
}

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
])

function ancestor(node: TreeNode | null, names: ReadonlySet<string>): TreeNode | null {
  for (let current = node; current !== null; current = current.parent) {
    if (names.has(current.name)) return current
  }
  return null
}

function nameNode(tag: TreeNode | null): TreeNode | null {
  return tag?.getChild('TagName') ?? null
}

function unquotedValue(state: EditorState, node: TreeNode): { value: string, from: number, to: number } {
  const raw = state.sliceDoc(node.from, node.to)
  const quoted = raw.length >= 2
    && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
  return quoted
    ? { value: raw.slice(1, -1), from: node.from + 1, to: node.to - 1 }
    : { value: raw, from: node.from, to: node.to }
}

function validTagName(name: string): boolean {
  return /^[A-Za-z][A-Za-z0-9._:-]*$/.test(name) && !VOID_ELEMENTS.has(name.toLowerCase())
}

function validId(name: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_.:-]*$/.test(name)
}

/** Plan a paired start/end tag rename at the current syntax position. */
export function planHtmlTagRename(
  state: EditorState,
  position: number,
  requestedName: string,
): HtmlRefactorResult {
  const newName = requestedName.trim()
  if (!validTagName(newName)) return { error: 'invalid-name' }
  const resolved = syntaxTree(state).resolveInner(Math.min(Math.max(0, position), state.doc.length), -1)
  const tag = ancestor(resolved, new Set(['OpenTag', 'CloseTag', 'SelfClosingTag', 'MismatchedCloseTag']))
  if (tag === null) return { error: 'not-tag' }
  if (tag.name !== 'OpenTag' && tag.name !== 'CloseTag') return { error: 'unsafe-tag' }
  const element = tag.parent
  if (element === null || element.name !== 'Element') return { error: 'unsafe-tag' }
  const open = element.firstChild
  const close = element.lastChild
  if (open === null || close === null || open.name !== 'OpenTag' || close.name !== 'CloseTag') {
    return { error: 'unsafe-tag' }
  }
  const openName = nameNode(open)
  const closeName = nameNode(close)
  if (openName === null || closeName === null) return { error: 'unsafe-tag' }
  const oldName = state.sliceDoc(openName.from, openName.to)
  if (oldName.toLowerCase() !== state.sliceDoc(closeName.from, closeName.to).toLowerCase()) {
    return { error: 'unsafe-tag' }
  }
  if (oldName === newName) return { error: 'unchanged' }
  return {
    plan: {
      kind: 'tag',
      oldName,
      newName,
      document: state.doc,
      changes: [openName, closeName].map(node => ({
        from: node.from,
        to: node.to,
        before: state.sliceDoc(node.from, node.to),
        insert: newName,
      })),
    },
  }
}

interface AttributeValue {
  name: string
  value: string
  from: number
  to: number
  node: TreeNode
}

function attributeValue(state: EditorState, node: TreeNode): AttributeValue | undefined {
  const name = node.getChild('AttributeName')
  const value = node.getChild('AttributeValue')
  if (name === null || value === null) return undefined
  const unquoted = unquotedValue(state, value)
  return {
    name: state.sliceDoc(name.from, name.to).toLowerCase(),
    value: unquoted.value,
    from: unquoted.from,
    to: unquoted.to,
    node,
  }
}

function allAttributes(state: EditorState): AttributeValue[] {
  const values: AttributeValue[] = []
  syntaxTree(state).iterate({
    enter(cursor) {
      if (cursor.name !== 'Attribute') return
      const value = attributeValue(state, cursor.node)
      if (value !== undefined) values.push(value)
    },
  })
  return values
}

/** Return the id value at one caret position, for pre-filling the rename UI. */
export function htmlIdAt(state: EditorState, position: number): string | undefined {
  const resolved = syntaxTree(state).resolveInner(Math.min(Math.max(0, position), state.doc.length), -1)
  const attribute = ancestor(resolved, new Set(['Attribute']))
  if (attribute === null) return undefined
  const value = attributeValue(state, attribute)
  return value?.name === 'id' ? value.value : undefined
}

/** Return the paired tag name at one caret position, for pre-filling the rename UI. */
export function htmlTagAt(state: EditorState, position: number): string | undefined {
  const resolved = syntaxTree(state).resolveInner(Math.min(Math.max(0, position), state.doc.length), -1)
  const tag = ancestor(resolved, new Set(['OpenTag', 'CloseTag']))
  const name = nameNode(tag)
  return name === null ? undefined : state.sliceDoc(name.from, name.to)
}

/** Plan one unique id definition and its exact same-document fragment links. */
export function planHtmlIdRename(
  state: EditorState,
  position: number,
  requestedName: string,
): HtmlRefactorResult {
  const newName = requestedName.trim()
  if (!validId(newName)) return { error: 'invalid-name' }
  const oldName = htmlIdAt(state, position)
  if (oldName === undefined || oldName === '') return { error: 'not-id' }
  if (oldName === newName) return { error: 'unchanged' }
  const attributes = allAttributes(state)
  const definitions = attributes.filter(attribute => attribute.name === 'id' && attribute.value === oldName)
  if (definitions.length !== 1) return { error: 'duplicate-id' }
  if (attributes.some(attribute => attribute.name === 'id' && attribute.value === newName)) {
    return { error: 'id-conflict' }
  }
  const references = attributes.filter(attribute => attribute.name === 'href' && attribute.value === `#${oldName}`)
  const definition = definitions[0] as AttributeValue
  const changes: HtmlRefactorChange[] = [{
    from: definition.from,
    to: definition.to,
    before: definition.value,
    insert: newName,
  }]
  for (const reference of references) {
    changes.push({
      from: reference.from,
      to: reference.to,
      before: reference.value,
      insert: `#${newName}`,
    })
  }
  changes.sort((left, right) => left.from - right.from)
  return {
    plan: {
      kind: 'id',
      oldName,
      newName,
      changes,
      document: state.doc,
    },
  }
}
