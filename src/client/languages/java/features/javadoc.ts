import { snippet } from '@codemirror/autocomplete'
import { Prec, type EditorState, type Extension } from '@codemirror/state'
import { keymap, type Command, type EditorView } from '@codemirror/view'

export interface JavaParameter {
  name: string
  type: string
}

export interface JavaDeclaration {
  kind: 'type' | 'method' | 'constructor'
  name: string
  typeParameters: string[]
  parameters: JavaParameter[]
  returnType?: string
  throws: string[]
}

const MODIFIERS = new Set([
  'public', 'protected', 'private', 'abstract', 'static', 'final', 'native',
  'synchronized', 'strictfp', 'default', 'transient', 'volatile', 'sealed', 'non-sealed',
])

function balancedEnd(text: string, start: number, open: string, close: string): number | undefined {
  let depth = 0
  for (let index = start; index < text.length; index += 1) {
    const character = text[index]
    if (character === open) depth += 1
    else if (character === close) {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return undefined
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = []
  let start = 0
  let angle = 0
  let round = 0
  let square = 0
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '<') angle += 1
    else if (character === '>') angle = Math.max(0, angle - 1)
    else if (character === '(') round += 1
    else if (character === ')') round = Math.max(0, round - 1)
    else if (character === '[') square += 1
    else if (character === ']') square = Math.max(0, square - 1)
    else if (character === ',' && angle === 0 && round === 0 && square === 0) {
      parts.push(text.slice(start, index).trim())
      start = index + 1
    }
  }
  parts.push(text.slice(start).trim())
  return parts.filter(Boolean)
}

function stripAnnotations(text: string): string {
  let value = text.trim()
  while (value.startsWith('@')) {
    const match = /^@[\w$.]+/.exec(value)
    if (match === null) break
    let end = match[0].length
    while (/\s/u.test(value[end] ?? '')) end += 1
    if (value[end] === '(') {
      const annotationEnd = balancedEnd(value, end, '(', ')')
      if (annotationEnd === undefined) return value
      end = annotationEnd + 1
    }
    value = value.slice(end).trimStart()
  }
  return value
}

function typeParameters(text: string): { names: string[], rest: string } {
  const value = text.trimStart()
  if (!value.startsWith('<')) return { names: [], rest: value }
  const end = balancedEnd(value, 0, '<', '>')
  if (end === undefined) return { names: [], rest: value }
  const names = splitTopLevel(value.slice(1, end)).map(parameter => (
    /^[\p{ID_Start}_$][\p{ID_Continue}_$]*/u.exec(parameter)?.[0] ?? ''
  )).filter(Boolean)
  return { names, rest: value.slice(end + 1).trimStart() }
}

function withoutModifiers(text: string): string {
  const words = text.trim().split(/\s+/u)
  while (words.length > 0 && MODIFIERS.has(words[0] ?? '')) words.shift()
  return words.join(' ')
}

function parametersOf(text: string): JavaParameter[] | undefined {
  const parameters: JavaParameter[] = []
  for (const raw of splitTopLevel(text)) {
    const cleaned = stripAnnotations(raw).replace(/\bfinal\s+/gu, '').trim()
    const match = /([\p{ID_Start}_$][\p{ID_Continue}_$]*)\s*$/u.exec(cleaned)
    if (match === null) return undefined
    const type = cleaned.slice(0, match.index).trim()
    if (type === '') return undefined
    parameters.push({ name: match[1] ?? '', type })
  }
  return parameters
}

function declarationPrefix(source: string): string {
  const trimmed = source.trimStart()
  let end = trimmed.length
  let angle = 0
  let round = 0
  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index]
    if (character === '<') angle += 1
    else if (character === '>') angle = Math.max(0, angle - 1)
    else if (character === '(') round += 1
    else if (character === ')') round = Math.max(0, round - 1)
    else if ((character === '{' || character === ';') && angle === 0 && round === 0) {
      end = index
      break
    }
  }
  return trimmed.slice(0, end).trim()
}

/** Parse only the adjacent declaration forms needed for deterministic Javadoc. */
export function parseJavaDeclaration(source: string): JavaDeclaration | undefined {
  let header = stripAnnotations(declarationPrefix(source))
  const typeMatch = /^(?:(?:public|protected|private|abstract|static|final|strictfp|sealed|non-sealed)\s+)*(?:class|interface|enum|record)\s+([\p{ID_Start}_$][\p{ID_Continue}_$]*)(.*)$/us.exec(header)
  if (typeMatch !== null) {
    const generic = typeParameters((typeMatch[2] ?? '').trimStart())
    return {
      kind: 'type',
      name: typeMatch[1] ?? '',
      typeParameters: generic.names,
      parameters: [],
      throws: [],
    }
  }

  const open = header.indexOf('(')
  if (open < 0) return undefined
  const close = balancedEnd(header, open, '(', ')')
  if (close === undefined) return undefined
  const before = stripAnnotations(header.slice(0, open)).trim()
  const nameMatch = /([\p{ID_Start}_$][\p{ID_Continue}_$]*)\s*$/u.exec(before)
  if (nameMatch === null) return undefined
  const name = nameMatch[1] ?? ''
  let prefix = withoutModifiers(before.slice(0, nameMatch.index))
  const generic = typeParameters(prefix)
  prefix = generic.rest.trim()
  const parameters = parametersOf(header.slice(open + 1, close))
  if (parameters === undefined) return undefined
  const suffix = header.slice(close + 1).trim()
  const throwsMatch = /^throws\s+(.+)$/us.exec(suffix)
  const thrown = throwsMatch === null ? [] : splitTopLevel(throwsMatch[1] ?? '')
  const constructor = prefix === ''
  return {
    kind: constructor ? 'constructor' : 'method',
    name,
    typeParameters: generic.names,
    parameters,
    ...(constructor ? {} : { returnType: prefix }),
    throws: thrown,
  }
}

/** CodeCraft Structured Javadoc, without guessed business descriptions. */
export function structuredJavadoc(declaration: JavaDeclaration): string {
  const lines = ['/**', ` * ${declaration.name}`]
  const tags = [
    ...declaration.typeParameters.map(name => ` * @param <${name}> type parameter`),
    ...declaration.parameters.map(parameter => ` * @param ${parameter.name} ${parameter.type}`),
    ...(declaration.kind === 'method' && declaration.returnType !== 'void'
      ? [` * @return ${declaration.returnType}`]
      : []),
    ...declaration.throws.map(type => ` * @throws ${type}`),
  ]
  if (tags.length > 0) lines.push(' *', ...tags)
  lines.push(' */')
  return lines.join('\n')
}

function insertJavadoc(view: EditorView, from: number, to: number, source: string): boolean {
  if (source.trimStart().startsWith('/**')) return false
  const declaration = parseJavaDeclaration(source)
  const template = declaration === undefined
    ? '/**\n * ${1:Description.}\n */${}'
    : `${structuredJavadoc(declaration)}${'${}'}`
  snippet(template)(view, null, from, to)
  return true
}

export function applyJavadocCompletion(
  view: EditorView,
  _completion: unknown,
  from: number,
  to: number,
): void {
  insertJavadoc(view, from, to, view.state.sliceDoc(to))
}

function javadocRange(state: EditorState): { from: number, to: number } | undefined {
  if (state.selection.ranges.length !== 1 || !state.selection.main.empty) return undefined
  const to = state.selection.main.head
  const line = state.doc.lineAt(to)
  const before = state.sliceDoc(line.from, to)
  if (!/^\s*\/\*\*$/u.test(before)) return undefined
  return { from: line.from + (before.match(/^\s*/u)?.[0].length ?? 0), to }
}

/** Expand `/**` only when it occupies the declaration-adjacent line. */
export const insertStructuredJavadoc: Command = (view) => {
  const range = javadocRange(view.state)
  if (range === undefined) return false
  return insertJavadoc(view, range.from, range.to, view.state.sliceDoc(range.to))
}

export function javaJavadocExtensions(): Extension {
  return Prec.highest(keymap.of([{ key: 'Enter', run: insertStructuredJavadoc }]))
}
