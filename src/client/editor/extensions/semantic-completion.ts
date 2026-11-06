import type {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from '@codemirror/autocomplete'
import { snippet } from '@codemirror/autocomplete'
import type { Text } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { completeIntelligence, type IntelligenceDocumentInput } from '../../api.js'
import type {
  IntelligenceCompletionItem,
  IntelligencePosition,
  IntelligenceRange,
} from '../../../protocol.js'

export interface SemanticCompletionInput extends IntelligenceDocumentInput {
  enabled: boolean
}

export interface SemanticCompletionOptions {
  getInput: () => SemanticCompletionInput | undefined
  onReady?: () => void
  onError?: (message: string) => void
}

function protocolPosition(doc: Text, offset: number): IntelligencePosition {
  const line = doc.lineAt(offset)
  return { line: line.number - 1, character: offset - line.from }
}

export function offsetAt(doc: Text, position: IntelligencePosition): number | undefined {
  if (position.line < 0 || position.line >= doc.lines || position.character < 0) return undefined
  const line = doc.line(position.line + 1)
  if (position.character > line.length) return undefined
  return line.from + position.character
}

function offsets(doc: Text, range: IntelligenceRange): { from: number; to: number } | undefined {
  const from = offsetAt(doc, range.start)
  const to = offsetAt(doc, range.end)
  return from === undefined || to === undefined || from > to ? undefined : { from, to }
}

function kindOf(kind: number | undefined): string | undefined {
  switch (kind) {
    case 2:
    case 3: return 'function'
    case 4: return 'class'
    case 5:
    case 6: return 'property'
    case 7: return 'variable'
    case 8: return 'class'
    case 9: return 'namespace'
    case 10: return 'property'
    case 14: return 'keyword'
    case 17:
    case 18: return 'constant'
    default: return undefined
  }
}

function hasOverlap(changes: Array<{ from: number; to: number }>): boolean {
  const ordered = [...changes].sort((a, b) => a.from - b.from || a.to - b.to)
  return ordered.some((change, index) => index > 0 && change.from < (ordered[index - 1]?.to ?? 0))
}

function hasBalancedGrouping(value: string): boolean {
  const stack: string[] = []
  const closing: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
  for (const character of value) {
    if (character === '(' || character === '[' || character === '{') {
      stack.push(character)
    } else if (character === ')' || character === ']' || character === '}') {
      if (stack.pop() !== closing[character]) return false
    }
  }
  return stack.length === 0
}

function isInvocationContext(doc: Text, from: number): boolean {
  const line = doc.lineAt(from)
  const prefix = doc.sliceString(line.from, from)
  if (/^\s*(?:from\b.*\bimport|import|def|async\s+def|class)\b/.test(prefix)) return false
  if (/^\s*@[^\s]*$/.test(prefix)) return false
  if (/^\s*(?:(?:return|yield|await|raise)\s+)?$/.test(prefix)) return true
  const expression = prefix.replace(/^\s*(?:(?:return|yield|await|raise)\s+)?/, '')
  if (!/\.\s*$/.test(expression) || /[=,+\-*/%<>:&|^~;]/.test(expression)) return false
  return hasBalancedGrouping(expression)
}

function callableCompletionText(
  item: IntelligenceCompletionItem,
  text: string,
  doc: Text,
  range: { from: number; to: number },
): string | undefined {
  if (item.kind !== 2 && item.kind !== 3 && item.kind !== 4) return undefined
  if (item.insertTextFormat === 2 || !/^[_\p{ID_Start}][_\p{ID_Continue}]*$/u.test(text)) return undefined
  if (/^\s*\(/.test(doc.sliceString(range.to))) return undefined
  if (!isInvocationContext(doc, range.from)) return undefined
  return `${text}()`
}

function applyItem(
  item: IntelligenceCompletionItem,
  fallbackFrom: number,
  fallbackTo: number,
): (view: EditorView, completion: Completion, from: number, to: number) => void {
  return (view, completion, from, to) => {
    const primaryRange = item.textEdit === undefined
      ? { from: fallbackFrom === fallbackTo ? from : fallbackFrom, to: fallbackFrom === fallbackTo ? to : fallbackTo }
      : offsets(view.state.doc, item.textEdit.range)
    if (primaryRange === undefined) return
    const originalText = item.textEdit?.newText ?? item.insertText ?? item.label
    if (item.insertTextFormat === 2 && (item.additionalTextEdits?.length ?? 0) === 0) {
      snippet(originalText)(view, completion, primaryRange.from, primaryRange.to)
      return
    }
    const callableText = callableCompletionText(item, originalText, view.state.doc, primaryRange)
    const text = callableText ?? originalText
    const changes = [{ ...primaryRange, insert: text }]
    for (const additional of item.additionalTextEdits ?? []) {
      const editRange = offsets(view.state.doc, additional.range)
      if (editRange === undefined) return
      changes.push({ ...editRange, insert: additional.newText })
    }
    if (hasOverlap(changes)) return
    if (callableText === undefined) {
      view.dispatch({ changes })
      return
    }
    const changeSet = view.state.changes(changes)
    const insertedFrom = changeSet.mapPos(primaryRange.from)
    view.dispatch({
      changes: changeSet,
      selection: { anchor: insertedFrom + callableText.length - 1 },
    })
  }
}

/** Build the asynchronous CodeMirror source backed by the Host Python provider. */
export function semanticCompletionSource(options: SemanticCompletionOptions): CompletionSource {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const input = options.getInput()
    if (input === undefined || !input.enabled) return null
    const token = context.matchBefore(/\w*/)
    const followsDot = context.pos > 0 && context.state.sliceDoc(context.pos - 1, context.pos) === '.'
    if (!context.explicit && (token === null || (token.from === token.to && !followsDot))) return null
    const controller = new AbortController()
    context.addEventListener('abort', () => controller.abort(), { onDocChange: true })
    try {
      const result = await completeIntelligence({
        sessionId: input.sessionId,
        path: input.path,
        tabId: input.tabId,
        revision: input.revision,
        content: input.content,
        position: protocolPosition(context.state.doc, context.pos),
      }, controller.signal)
      if (controller.signal.aborted || result.revision !== input.revision) return null
      options.onReady?.()
      const fallbackFrom = token?.from ?? context.pos
      return {
        from: fallbackFrom,
        options: result.items.map((item, index): Completion => ({
          label: item.label,
          ...(item.detail === undefined ? {} : { detail: item.detail }),
          ...(kindOf(item.kind) === undefined ? {} : { type: kindOf(item.kind) }),
          boost: Math.max(-99, 99 - index * 0.25),
          apply: applyItem(item, fallbackFrom, context.pos),
        })),
      }
    } catch (error) {
      if (!controller.signal.aborted) options.onError?.(error instanceof Error ? error.message : String(error))
      return null
    }
  }
}
