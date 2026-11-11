/** Local static-resource and same-document anchor navigation for HTML. */

import { syntaxTree } from '@codemirror/language'
import type { EditorState, Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { htmlFeatureHost } from './host.js'

type TreeNode = ReturnType<typeof syntaxTree>['topNode']

const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'poster',
  'data',
  'action',
  'formaction',
  'cite',
  'background',
  'longdesc',
])

const EXTERNAL_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/

export type HtmlNavigationError =
  | 'outside-workspace'
  | 'root-relative'
  | 'unsupported-url'
  | 'unresolved-path'
  | 'missing-id'
  | 'duplicate-id'

export type HtmlNavigationResult =
  | { status: 'none' }
  | { status: 'external' }
  | { status: 'error', code: HtmlNavigationError }
  | { status: 'file', path: string }
  | { status: 'anchor', id: string, from: number, to: number }

function ancestor(node: TreeNode | null, name: string): TreeNode | null {
  for (let current = node; current !== null; current = current.parent) {
    if (current.name === name) return current
  }
  return null
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2) {
    const first = trimmed[0]
    const last = trimmed.at(-1)
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1)
    }
  }
  return trimmed
}

export interface HtmlAttributeValue {
  name: string
  value: string
  from: number
  to: number
}

/** Resolve the HTML attribute whose name or value sits at one offset. */
export function htmlAttributeAt(state: EditorState, position: number): HtmlAttributeValue | undefined {
  const tree = syntaxTree(state)
  const resolved = tree.resolveInner(position, -1)
  const attribute = ancestor(resolved, 'Attribute')
  if (attribute === null) return undefined
  const nameNode = attribute.getChild('AttributeName')
  const valueNode = attribute.getChild('AttributeValue')
  if (nameNode === null) return undefined
  const name = state.sliceDoc(nameNode.from, nameNode.to).toLowerCase()
  if (!URL_ATTRIBUTES.has(name)) return undefined
  const value = valueNode === null ? '' : unquote(state.sliceDoc(valueNode.from, valueNode.to))
  return { name, value, from: attribute.from, to: attribute.to }
}

function tagNameOffset(openTag: TreeNode): number {
  const name = openTag.getChild('TagName')
  return name === null ? openTag.from + 1 : name.from
}

function idTarget(state: EditorState, id: string): HtmlNavigationResult {
  const tree = syntaxTree(state)
  const matches: Array<{ from: number, to: number }> = []
  tree.iterate({
    enter(node) {
      if (node.name !== 'Element') return
      const openTag = node.node.firstChild
      if (openTag === null || openTag.name !== 'OpenTag') return
      for (let child = openTag.firstChild; child !== null; child = child.nextSibling) {
        if (child.name !== 'Attribute') continue
        const name = child.getChild('AttributeName')
        const value = child.getChild('AttributeValue')
        if (name === null || value === null) continue
        if (state.sliceDoc(name.from, name.to).toLowerCase() !== 'id') continue
        if (unquote(state.sliceDoc(value.from, value.to)) !== id) continue
        matches.push({ from: tagNameOffset(openTag), to: openTag.to })
      }
    },
  })
  if (matches.length === 0) return { status: 'error', code: 'missing-id' }
  if (matches.length > 1) return { status: 'error', code: 'duplicate-id' }
  const target = matches[0] as { from: number, to: number }
  return { status: 'anchor', id, from: target.from, to: target.to }
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)
}

function normalizeSegments(segments: readonly string[], workspaceRelative: boolean): string[] | undefined {
  const output: string[] = []
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (output.length === 0) {
        if (workspaceRelative) return undefined
        continue
      }
      output.pop()
      continue
    }
    output.push(segment)
  }
  return output
}

/** Resolve one relative resource value against the current document path. */
export function resolveLocalResource(currentPath: string, rawValue: string): HtmlNavigationResult {
  const value = rawValue.trim()
  if (value === '') return { status: 'none' }
  if (value.startsWith('#')) return { status: 'external' }
  if (value.startsWith('//') || EXTERNAL_SCHEME.test(value)) return { status: 'external' }
  if (value.startsWith('/')) return { status: 'error', code: 'root-relative' }
  const rawPath = value.split(/[?#]/, 1)[0] ?? ''
  if (rawPath === '') return { status: 'none' }

  let decoded: string
  try {
    decoded = decodeURIComponent(rawPath).replaceAll('\\', '/')
  } catch {
    return { status: 'error', code: 'unresolved-path' }
  }
  if (decoded.startsWith('/') || EXTERNAL_SCHEME.test(decoded)) {
    return { status: 'error', code: 'unsupported-url' }
  }
  const normalizedCurrent = currentPath.replaceAll('\\', '/')
  const currentAbsolute = isAbsolutePath(normalizedCurrent)
  const currentSegments = normalizedCurrent.split('/')
  const directorySegments = currentAbsolute
    ? currentSegments.slice(0, -1)
    : currentSegments.slice(0, -1)
  const combined = [...directorySegments, ...decoded.split('/')]
  const prefix = currentAbsolute
    ? (normalizedCurrent.startsWith('/') ? '/' : `${currentSegments[0]}/`)
    : ''
  const normalized = normalizeSegments(
    currentAbsolute && prefix !== '/' ? combined.slice(1) : combined,
    !currentAbsolute,
  )
  if (normalized === undefined) return { status: 'error', code: 'outside-workspace' }
  if (normalized.length === 0) return { status: 'error', code: 'unresolved-path' }
  const path = currentAbsolute
    ? (prefix === '/' ? `/${normalized.join('/')}` : `${prefix}${normalized.join('/')}`)
    : normalized.join('/')
  return { status: 'file', path }
}

/** Resolve the navigation target at one offset in the current document. */
export function resolveHtmlNavigation(
  state: EditorState,
  position: number,
  currentPath: string,
): HtmlNavigationResult {
  const attribute = htmlAttributeAt(state, position)
  if (attribute === undefined) return { status: 'none' }
  const value = attribute.value.trim()
  if (value.startsWith('#')) {
    const id = value.slice(1)
    if (id === '') return { status: 'error', code: 'unresolved-path' }
    return idTarget(state, id)
  }
  return resolveLocalResource(currentPath, value)
}

function navigateAt(view: EditorView, position: number): boolean {
  const host = htmlFeatureHost(view)
  if (host === undefined) return false
  const result = resolveHtmlNavigation(view.state, position, host.currentPath())
  if (result.status === 'none' || result.status === 'external') return false
  if (result.status === 'error') {
    host.report(result.code)
    return true
  }
  if (result.status === 'file') {
    host.openFile(result.path)
    return true
  }
  host.revealAnchor(result.from, result.to)
  return true
}

function modifierClick(): Extension {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      const modifier = mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
      if (event.button !== 0 || !modifier || event.altKey || event.shiftKey) return false
      const offset = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (offset === null) return false
      if (!navigateAt(view, offset)) return false
      event.preventDefault()
      event.stopPropagation()
      return true
    },
  })
}

/** Modifier-click and F12 navigation for local HTML attributes. */
export function htmlNavigationExtensions(): Extension[] {
  return [
    modifierClick(),
    keymap.of([
      {
        key: 'F12',
        run: view => navigateAt(view, view.state.selection.main.head),
      },
    ]),
  ]
}
