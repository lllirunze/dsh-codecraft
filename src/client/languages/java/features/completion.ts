import type { Completion, CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { applyJavadocCompletion } from './javadoc.js'
import { JAVA_SNIPPET_COMPLETIONS, JAVA_SNIPPET_LABELS } from './snippets.js'

const KEYWORDS = [
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'const', 'continue', 'default', 'do', 'double', 'else', 'extends', 'final',
  'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof',
  'int', 'interface', 'long', 'native', 'new', 'package', 'private', 'protected',
  'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch',
  'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
  'volatile', 'while', 'class', 'enum', 'record', 'sealed', 'permits', 'non-sealed',
  'var', 'yield', 'true', 'false', 'null',
] as const

const COMMON_TYPES = [
  'Integer', 'Long', 'Double', 'Float', 'Boolean', 'Character', 'Byte', 'Short',
  'String', 'Object', 'StringBuilder', 'StringBuffer', 'Math', 'System',
  'List', 'ArrayList', 'LinkedList', 'Map', 'HashMap', 'Set', 'HashSet',
  'Collection', 'Collections', 'Optional', 'Exception', 'RuntimeException',
  'IOException', 'BigDecimal', 'LocalDate', 'LocalDateTime',
] as const

const STATIC_COMPLETIONS: readonly Completion[] = [
  ...JAVA_SNIPPET_COMPLETIONS,
  {
    label: 'javadoc',
    detail: 'structured Javadoc',
    type: 'text',
    boost: 95,
    apply: applyJavadocCompletion,
  },
  ...KEYWORDS.filter(keyword => !JAVA_SNIPPET_LABELS.has(keyword)).map(label => ({
    label,
    type: 'keyword',
    boost: 70,
  })),
  ...COMMON_TYPES.map(label => ({
    label,
    type: 'class',
    detail: 'common Java type',
    boost: 50,
  })),
]

const RESERVED = new Set([...KEYWORDS, ...COMMON_TYPES, ...JAVA_SNIPPET_LABELS, 'javadoc'])

function excludedContext(context: CompletionContext): boolean {
  let node: SyntaxNode | null = syntaxTree(context.state).resolveInner(context.pos, -1)
  while (node !== null) {
    const name = node.name.toLowerCase()
    if (name.includes('comment') || name.includes('string') || name.includes('character')) return true
    node = node.parent
  }
  const line = context.state.doc.lineAt(context.pos)
  const prefix = context.state.sliceDoc(line.from, context.pos)
  let quote: '"' | "'" | undefined
  let escaped = false
  for (let index = 0; index < prefix.length; index += 1) {
    const character = prefix[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (character === '\\' && quote !== undefined) {
      escaped = true
      continue
    }
    if (quote !== undefined) {
      if (character === quote) quote = undefined
      continue
    }
    if (character === '"' || character === "'") quote = character
    else if (character === '/' && prefix[index + 1] === '/') return true
  }
  return quote !== undefined
}

function documentWords(context: CompletionContext, prefix: string): Completion[] {
  if (prefix.length < 2 || context.state.doc.length > 200_000) return []
  const words = new Set<string>()
  const source = context.state.sliceDoc()
  const pattern = /[\p{ID_Start}_$][\p{ID_Continue}_$]*/gu
  for (const match of source.matchAll(pattern)) {
    const word = match[0]
    if (word === prefix || !word.startsWith(prefix) || RESERVED.has(word)) continue
    words.add(word)
    if (words.size >= 100) break
  }
  return [...words].sort().map(label => ({
    label,
    type: 'variable',
    detail: 'current file',
    boost: 20,
  }))
}

/** Deterministic, offline Java completions with no project-level claims. */
export const javaCompletionSource: CompletionSource = (
  context: CompletionContext,
): CompletionResult | null => {
  if (excludedContext(context)) return null
  const token = context.matchBefore(/[\p{ID_Continue}_$]*/u)
  if (token === null || (!context.explicit && token.from === token.to)) return null
  const prefix = context.state.sliceDoc(token.from, token.to)
  return {
    from: token.from,
    options: [...STATIC_COMPLETIONS, ...documentWords(context, prefix)],
    validFor: /^[\p{ID_Continue}_$]*$/u,
  }
}
