import { snippet } from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'
import { Prec, type EditorState, type Extension } from '@codemirror/state'
import { keymap, type Command } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'

interface DocstringContext {
  from: number
  to: number
  owner: SyntaxNode
}

function directChildren(node: SyntaxNode): SyntaxNode[] {
  const children: SyntaxNode[] = []
  for (let child = node.firstChild; child !== null; child = child.nextSibling) children.push(child)
  return children
}

function eligibleContext(state: EditorState): DocstringContext | undefined {
  const selection = state.selection.main
  if (state.selection.ranges.length !== 1
    || !selection.empty
    || selection.head < 3
    || selection.head + 3 > state.doc.length) return undefined
  const from = selection.head - 3
  const to = selection.head + 3
  if (state.sliceDoc(from, selection.head) !== '"""' || state.sliceDoc(selection.head, to) !== '"""') {
    return undefined
  }
  const string = syntaxTree(state).resolveInner(selection.head, -1)
  if (string.name !== 'String' || string.from !== from || string.to !== to) return undefined
  if (state.sliceDoc(string.from, string.to) !== '""""""') return undefined
  const statement = string.parent
  const body = statement?.parent
  const owner = body?.parent
  if (statement?.name !== 'ExpressionStatement' || body?.name !== 'Body') return undefined
  if (statement.from !== string.from || statement.to !== string.to) return undefined
  if (owner?.name !== 'FunctionDefinition' && owner?.name !== 'ClassDefinition') return undefined
  const firstStatement = directChildren(body)
    .find(child => child.name !== ':' && child.name !== 'Comment')
  if (firstStatement?.from !== statement.from || firstStatement.to !== statement.to) return undefined
  const line = state.doc.lineAt(from)
  if (state.sliceDoc(line.from, from).trim() !== '') return undefined
  if (state.sliceDoc(to, line.to).trim() !== '') return undefined
  return { from, to, owner }
}

function decoratorText(state: EditorState, decorated: SyntaxNode | undefined): string[] {
  if (decorated === undefined) return []
  return directChildren(decorated)
    .filter(child => child.name === 'Decorator')
    .map(child => state.sliceDoc(child.from, child.to).trim())
}

function methodContext(
  state: EditorState,
  owner: SyntaxNode,
): { method: boolean, classMethod: boolean, staticMethod: boolean } {
  let container = owner.parent
  let decorated: SyntaxNode | undefined
  if (container?.name === 'DecoratedStatement') {
    decorated = container
    container = container.parent
  }
  const method = container?.name === 'Body' && container.parent?.name === 'ClassDefinition'
  const decorators = decoratorText(state, decorated)
  return {
    method,
    classMethod: method && decorators.includes('@classmethod'),
    staticMethod: method && decorators.includes('@staticmethod'),
  }
}

function parameterNames(state: EditorState, owner: SyntaxNode): string[] {
  const params = directChildren(owner).find(child => child.name === 'ParamList')
  if (params === undefined) return []
  const children = directChildren(params)
  const commas = children.filter(child => child.name === ',')
  const names: string[] = []
  const segments: Array<{ from: number, to: number }> = []
  let start = params.from + 1
  for (const comma of commas) {
    segments.push({ from: start, to: comma.from })
    start = comma.to
  }
  segments.push({ from: start, to: params.to - 1 })
  for (const { from, to } of segments) {
    if (from >= to) continue
    const segment = state.sliceDoc(from, to).trim()
    if (segment === '' || segment === '/' || segment === '*') continue
    const variable = children.find(child => child.name === 'VariableName' && child.from >= from && child.to <= to)
    if (variable === undefined) continue
    const prefix = segment.startsWith('**') ? '**' : segment.startsWith('*') ? '*' : ''
    names.push(`${prefix}${state.sliceDoc(variable.from, variable.to)}`)
  }
  const { method, classMethod, staticMethod } = methodContext(state, owner)
  if (method && !staticMethod && names[0] === 'self') names.shift()
  if (classMethod && names[0] === 'cls') names.shift()
  return names
}

function returnAnnotation(state: EditorState, owner: SyntaxNode): string | undefined {
  const type = directChildren(owner).find(child => child.name === 'TypeDef')
  if (type === undefined) return undefined
  const annotation = state.sliceDoc(type.from, type.to).replace(/^\s*->\s*/u, '').trim()
  return annotation === '' || annotation === 'None' ? undefined : annotation
}

function containsYield(node: SyntaxNode, root: SyntaxNode): boolean {
  for (const child of directChildren(node)) {
    if (child.name === 'YieldStatement' || child.name === 'YieldExpression') return true
    if (child !== root && (child.name === 'FunctionDefinition' || child.name === 'ClassDefinition')) continue
    if (containsYield(child, root)) return true
  }
  return false
}

function snippetLiteral(value: string): string {
  return value.replaceAll('${', '$\\{').replaceAll('#{', '#\\{')
}

function docstringTemplate(state: EditorState, owner: SyntaxNode): string {
  let field = 1
  const placeholder = (text: string): string => `\${${field++}:${text}}`
  const lines = [`"""${placeholder('Summary.')}`]
  if (owner.name === 'FunctionDefinition') {
    const parameters = parameterNames(state, owner)
    if (parameters.length > 0) {
      lines.push('', 'Args:')
      for (const parameter of parameters) lines.push(`\t${parameter}: ${placeholder('Description.')}`)
    }
    const annotation = returnAnnotation(state, owner)
    const body = directChildren(owner).find(child => child.name === 'Body')
    const generator = body !== undefined && containsYield(body, owner)
    if (generator) {
      lines.push('', 'Yields:')
      lines.push(`\t${annotation === undefined ? '' : `${snippetLiteral(annotation)}: `}${placeholder('Description.')}`)
    } else if (annotation !== undefined) {
      lines.push('', 'Returns:')
      lines.push(`\t${snippetLiteral(annotation)}: ${placeholder('Description.')}`)
    }
  }
  lines.push(`"""\${0}`)
  return lines.join('\n')
}

/** Generate one syntax-guarded Google Style Docstring at a valid Python definition body. */
export const insertGoogleStyleDocstring: Command = (view) => {
  const context = eligibleContext(view.state)
  if (context === undefined) return false
  snippet(docstringTemplate(view.state, context.owner))(view, null, context.from, context.to)
  return true
}

/** Python-only Docstring generation layered ahead of the normal Enter command. */
export function pythonDocstringExtensions(): Extension {
  return Prec.highest(keymap.of([
    { key: 'Enter', run: insertGoogleStyleDocstring },
  ]))
}
