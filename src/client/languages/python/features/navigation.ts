import { syntaxTree } from '@codemirror/language'
import type { EditorState, Extension, Text } from '@codemirror/state'
import { EditorView, hoverTooltip, type Tooltip } from '@codemirror/view'
import { hoverIntelligence, type IntelligenceDocumentInput } from '../../../api.js'
import type { IntelligencePosition, IntelligenceRange } from '../../../../protocol.js'

export interface PythonNavigationInput extends IntelligenceDocumentInput {
  enabled: boolean
}

export interface PythonNavigationClick {
  position: IntelligencePosition
  range: IntelligenceRange
}

export interface PythonNavigationOptions {
  getInput: () => PythonNavigationInput | undefined
  onNavigate: (click: PythonNavigationClick) => void
  onReady?: () => void
  onError?: (message: string) => void
}

export function protocolPosition(doc: Text, offset: number): IntelligencePosition {
  const line = doc.lineAt(offset)
  return { line: line.number - 1, character: offset - line.from }
}

export function identifierRangeAt(state: EditorState, offset: number): { from: number, to: number } | undefined {
  if (offset < 0 || offset > state.doc.length) return undefined
  if (state.sliceDoc(offset, offset + 1) === '.') return undefined
  let node = syntaxTree(state).resolveInner(offset, -1)
  if (node.name !== 'VariableName' && node.name !== 'PropertyName') {
    node = syntaxTree(state).resolveInner(offset, 1)
  }
  if (node.name !== 'VariableName' && node.name !== 'PropertyName') return undefined
  const value = state.sliceDoc(node.from, node.to)
  return /^[_\p{ID_Start}][_\p{ID_Continue}]*$/u.test(value)
    ? { from: node.from, to: node.to }
    : undefined
}

function appendPlainMarkdown(root: HTMLElement, value: string): void {
  const parts = value.split(/```(?:[^\n]*)\n([\s\S]*?)```/g)
  for (let index = 0; index < parts.length; index++) {
    const valuePart = parts[index]
    if (valuePart === undefined || valuePart.trim() === '') continue
    if (index % 2 === 1) {
      const pre = document.createElement('pre')
      const code = document.createElement('code')
      code.textContent = valuePart.replace(/\n$/, '')
      pre.appendChild(code)
      root.appendChild(pre)
    } else {
      const paragraph = document.createElement('div')
      paragraph.textContent = valuePart.trim()
      root.appendChild(paragraph)
    }
  }
}

function tooltipFor(result: Awaited<ReturnType<typeof hoverIntelligence>>, from: number, to: number): Tooltip | null {
  if (result.contents === undefined && result.source === undefined) return null
  return {
    pos: from,
    end: to,
    above: true,
    create: () => {
      const dom = document.createElement('div')
      dom.className = 'dsh-codecraft-hover'
      if (result.contents !== undefined) appendPlainMarkdown(dom, result.contents.value)
      if (result.source !== undefined) {
        const source = document.createElement('div')
        source.className = 'dsh-codecraft-hover-source'
        source.textContent = `${result.source.path}:${result.source.range.start.line + 1}:${result.source.range.start.character + 1}`
        dom.appendChild(source)
      }
      return { dom }
    },
  }
}

function modifierClick(options: PythonNavigationOptions): Extension {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      const modifier = mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
      if (event.button !== 0 || !modifier || event.altKey || event.shiftKey) return false
      const offset = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (offset === null) return false
      const identifier = identifierRangeAt(view.state, offset)
      const input = options.getInput()
      if (identifier === undefined || input === undefined || !input.enabled) return false
      event.preventDefault()
      event.stopPropagation()
      options.onNavigate({
        position: protocolPosition(view.state.doc, identifier.from),
        range: {
          start: protocolPosition(view.state.doc, identifier.from),
          end: protocolPosition(view.state.doc, identifier.to),
        },
      })
      return true
    },
  })
}

/** Python-only Hover and modifier-click interaction backed by the active Pyright session. */
export function pythonNavigationExtensions(options: PythonNavigationOptions): Extension[] {
  let generation = 0
  let active: AbortController | undefined
  const hover = hoverTooltip(async (view, position): Promise<Tooltip | null> => {
    const identifier = identifierRangeAt(view.state, position)
    const input = options.getInput()
    if (identifier === undefined || input === undefined || !input.enabled) return null
    active?.abort()
    const controller = new AbortController()
    active = controller
    const requestGeneration = ++generation
    try {
      const result = await hoverIntelligence({
        sessionId: input.sessionId,
        path: input.path,
        tabId: input.tabId,
        revision: input.revision,
        content: input.content,
        position: protocolPosition(view.state.doc, identifier.from),
      }, controller.signal)
      const current = options.getInput()
      if (controller.signal.aborted || requestGeneration !== generation || result.revision !== input.revision
        || current === undefined || current.tabId !== input.tabId || current.revision !== input.revision
        || current.content !== input.content) return null
      options.onReady?.()
      return tooltipFor(result, identifier.from, identifier.to)
    } catch (error) {
      if (!controller.signal.aborted) options.onError?.(error instanceof Error ? error.message : String(error))
      return null
    }
  }, { hoverTime: 350 })
  return [hover, modifierClick(options)]
}
