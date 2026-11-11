/** A small, explicit Emmet markup expander for the required HTML subset. */

import {
  snippet,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete'
import { indentUnit, syntaxTree } from '@codemirror/language'
import type { EditorState, Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { HTML_VOID_ELEMENTS } from './tags.js'
import { htmlFeatureHost } from './host.js'

interface EmmetAttribute {
  name: string
  value: string | undefined
}

interface EmmetItem {
  name: string
  classes: string[]
  id: string | undefined
  attributes: EmmetAttribute[]
  text: string | undefined
  repeat: number
  children: EmmetItem[]
}

const ELEMENT_NAME = /^[A-Za-z][A-Za-z0-9:-]*/
const IDENTIFIER = /^[A-Za-z0-9_$-]+/
const ATTRIBUTE_NAME = /^[A-Za-z_:][-A-Za-z0-9_:.]*/
const PLACEHOLDER = '\u0000'
const ABBREVIATION = /[A-Za-z0-9.#>+*$\[\]{}="'_:@/?&%-]+$/
const STRUCTURAL = /[>+*.#[{]/

class EmmetParser {
  #index = 0
  constructor(private readonly source: string) {}

  parse(): EmmetItem[] | undefined {
    const items = this.#sequence()
    if (items === undefined || this.#index !== this.source.length) return undefined
    return items
  }

  #sequence(): EmmetItem[] | undefined {
    const items: EmmetItem[] = []
    for (;;) {
      const item = this.#item()
      if (item === undefined) return undefined
      items.push(item)
      if (this.#peek() === '>') {
        this.#index += 1
        const children = this.#sequence()
        if (children === undefined) return undefined
        item.children = children
      }
      if (this.#peek() === '+') {
        this.#index += 1
        continue
      }
      break
    }
    return items.length === 0 ? undefined : items
  }

  #peek(): string {
    return this.source[this.#index] ?? ''
  }

  #item(): EmmetItem | undefined {
    const rest = this.source.slice(this.#index)
    const nameMatch = ELEMENT_NAME.exec(rest)
    let name = ''
    if (nameMatch !== null) {
      name = nameMatch[0]
      this.#index += name.length
    }
    const classes: string[] = []
    let id: string | undefined
    const attributes: EmmetAttribute[] = []
    let text: string | undefined
    let repeat = 1

    for (;;) {
      const marker = this.#peek()
      if (marker === '.') {
        this.#index += 1
        const identifier = IDENTIFIER.exec(this.source.slice(this.#index))
        if (identifier === null) return undefined
        classes.push(identifier[0])
        this.#index += identifier[0].length
      } else if (marker === '#') {
        this.#index += 1
        const identifier = IDENTIFIER.exec(this.source.slice(this.#index))
        if (identifier === null) return undefined
        id = identifier[0]
        this.#index += identifier[0].length
      } else if (marker === '[') {
        const parsed = this.#attributeGroup()
        if (parsed === undefined) return undefined
        attributes.push(...parsed)
      } else if (marker === '*') {
        this.#index += 1
        const digits = /^\d+/.exec(this.source.slice(this.#index))
        if (digits === null) return undefined
        repeat = Math.min(100, Math.max(1, Number(digits[0])))
        this.#index += digits[0].length
      } else if (marker === '{') {
        const value = this.#balanced('{', '}')
        if (value === undefined) return undefined
        text = value
      } else {
        break
      }
    }

    if (name === '' && classes.length === 0 && id === undefined && attributes.length === 0) return undefined
    if (name === '') name = 'div'
    return { name, classes, id, attributes, text, repeat, children: [] }
  }

  #balanced(open: string, close: string): string | undefined {
    if (this.#peek() !== open) return undefined
    this.#index += 1
    let depth = 1
    let value = ''
    while (this.#index < this.source.length) {
      const character = this.source[this.#index] as string
      this.#index += 1
      if (character === '\\' && this.#index < this.source.length) {
        value += this.source[this.#index]
        this.#index += 1
        continue
      }
      if (character === open) depth += 1
      if (character === close) {
        depth -= 1
        if (depth === 0) return value
      }
      value += character
    }
    return undefined
  }

  #attributeGroup(): EmmetAttribute[] | undefined {
    if (this.#peek() !== '[') return undefined
    this.#index += 1
    const tokens: string[] = []
    let current = ''
    let quote = ''
    while (this.#index < this.source.length) {
      const character = this.source[this.#index] as string
      this.#index += 1
      if (quote !== '') {
        if (character === quote) quote = ''
        else current += character
        continue
      }
      if (character === '"' || character === "'") {
        quote = character
        continue
      }
      if (character === ']') {
        if (current.length > 0) tokens.push(current)
        const attributes: EmmetAttribute[] = []
        for (const token of tokens) {
          const equals = token.indexOf('=')
          if (equals === -1) {
            const name = ATTRIBUTE_NAME.exec(token)
            if (name === null || name[0].length !== token.length) return undefined
            attributes.push({ name: token, value: undefined })
          } else {
            const name = ATTRIBUTE_NAME.exec(token.slice(0, equals))
            if (name === null || name[0].length !== equals) return undefined
            attributes.push({ name: name[0], value: token.slice(equals + 1) })
          }
        }
        return attributes
      }
      if (/\s/.test(character)) {
        if (current.length > 0) tokens.push(current)
        current = ''
        continue
      }
      current += character
    }
    return undefined
  }
}

function numberText(value: string, index: number): string {
  return value.replace(/\$+/g, match => String(index).padStart(match.length, '0'))
}

function attributeText(item: EmmetItem, index: number): string {
  const parts: string[] = []
  if (item.id !== undefined) parts.push(`id="${numberText(item.id, index)}"`)
  if (item.classes.length > 0) {
    const names = item.classes.map(name => numberText(name, index)).join(' ')
    parts.push(`class="${names}"`)
  }
  for (const attribute of item.attributes) {
    if (attribute.value === undefined) {
      parts.push(attribute.name)
    } else {
      parts.push(`${attribute.name}="${numberText(attribute.value, index)}"`)
    }
  }
  return parts.length === 0 ? '' : ` ${parts.join(' ')}`
}

function inlineLeaf(item: EmmetItem, index: number): string {
  const name = numberText(item.name, index).toLowerCase()
  const attributes = attributeText(item, index)
  if (HTML_VOID_ELEMENTS.has(name)) return `<${name}${attributes}>`
  if (item.text !== undefined) {
    return `<${name}${attributes}>${numberText(item.text, index)}</${name}>`
  }
  return `<${name}${attributes}>${PLACEHOLDER}</${name}>`
}

function emitItems(
  items: readonly EmmetItem[],
  depth: number,
  unit: string,
  lines: string[],
  parentIndex?: number,
): void {
  for (const item of items) {
    for (let index = 1; index <= item.repeat; index += 1) {
      const effectiveIndex = item.repeat > 1 ? index : (parentIndex ?? index)
      const name = numberText(item.name, effectiveIndex).toLowerCase()
      const attributes = attributeText(item, effectiveIndex)
      const indent = unit.repeat(depth)
      const voidElement = HTML_VOID_ELEMENTS.has(name)
      if (item.text !== undefined) {
        const text = numberText(item.text, effectiveIndex)
        lines.push(`${indent}<${name}${attributes}>${text}${voidElement ? '' : `</${name}>`}`)
      } else if (item.children.length > 0) {
        const inline = item.children.length === 1
          && item.children[0]?.children.length === 0
          && (item.children[0]?.repeat ?? 1) === 1
        lines.push(`${indent}<${name}${attributes}>${inline ? inlineLeaf(item.children[0] as EmmetItem, effectiveIndex) : ''}`)
        if (!inline) {
          emitItems(item.children, depth + 1, unit, lines, effectiveIndex)
          if (!voidElement) lines.push(`${indent}</${name}>`)
        } else if (!voidElement) {
          lines[lines.length - 1] = `${lines[lines.length - 1] as string}</${name}>`
        }
      } else if (voidElement) {
        lines.push(`${indent}<${name}${attributes}>`)
      } else {
        lines.push(`${indent}<${name}${attributes}>${PLACEHOLDER}</${name}>`)
      }
    }
  }
}

export interface EmmetExpansion {
  /** Snippet text with `${}` fields for empty element bodies. */
  snippet: string
  /** First line of the expansion, for completion details. */
  preview: string
}

/** Expand one abbreviation using the active indentation unit. */
export function expandEmmet(abbreviation: string, unit: string): EmmetExpansion | undefined {
  if (abbreviation.trim() === '') return undefined
  const items = new EmmetParser(abbreviation).parse()
  if (items === undefined) return undefined
  const lines: string[] = []
  emitItems(items, 0, unit, lines)
  if (lines.length === 0) return undefined
  const text = lines.join('\n').split(PLACEHOLDER).join('${}')
  return { snippet: text, preview: text.split('\n')[0] ?? text }
}

function abbreviationText(state: EditorState, position: number): { from: number, text: string } | undefined {
  const line = state.doc.lineAt(position)
  const before = state.sliceDoc(line.from, position)
  const match = ABBREVIATION.exec(before)
  if (match === null) return undefined
  const text = match[0]
  if (text.length < 2 || !STRUCTURAL.test(text)) return undefined
  return { from: position - text.length, text }
}

function insideComment(state: EditorState, position: number): boolean {
  const node = syntaxTree(state).resolveInner(position, -1)
  for (let current: typeof node | null = node; current !== null; current = current.parent) {
    if (current.name === 'Comment') return true
  }
  return false
}

function indentationUnit(state: EditorState): string {
  return state.facet(indentUnit) || '  '
}

/** Add Emmet candidates to the existing HTML completion result. */
export function htmlEmmetCompletionSource(next: CompletionSource): CompletionSource {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const base = await next(context)
    if (insideComment(context.state, context.pos)) return base
    const abbreviation = abbreviationText(context.state, context.pos)
    if (abbreviation === undefined) return base
    const expanded = expandEmmet(abbreviation.text, indentationUnit(context.state))
    if (expanded === undefined) return base
    const applySnippet = snippet(expanded.snippet)
    const option: Completion = {
      label: `Emmet: ${abbreviation.text}`,
      detail: expanded.preview,
      type: 'text',
      apply: (view, completion, _from, _to) => {
        applySnippet(view, completion, abbreviation.from, context.pos)
      },
    }
    if (base === null) {
      return {
        from: abbreviation.from,
        options: [option],
        validFor: /^[A-Za-z0-9.#>+*$\[\]{}="'_:@/?&%-]*$/,
      }
    }
    return {
      ...base,
      options: [option, ...base.options],
    }
  }
}

function expandAtCursor(view: EditorView): boolean {
  const abbreviation = abbreviationText(view.state, view.state.selection.main.head)
  if (abbreviation === undefined) return false
  const expanded = expandEmmet(abbreviation.text, indentationUnit(view.state))
  if (expanded === undefined) return false
  const applySnippet = snippet(expanded.snippet)
  applySnippet(view, null as unknown as Completion, abbreviation.from, view.state.selection.main.head)
  return true
}

const TEMPLATE = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '  <meta charset="UTF-8">',
  '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '  <title>${1:Document}</title>',
  '</head>',
  '<body>',
  '  ${2}',
  '</body>',
  '</html>',
].join('\n')

/** Insert the HTML5 template without replacing unrelated content. */
export function insertHtmlTemplate(view: EditorView): boolean {
  if (view.state.readOnly) return false
  const selection = view.state.selection.main
  const text = view.state.doc.toString()
  const blank = text.trim() === ''
  const from = blank ? 0 : selection.from
  const to = blank ? view.state.doc.length : selection.to
  const template = TEMPLATE.replace(/^  /gm, indentationUnit(view.state) === '\t' ? '\t' : indentationUnit(view.state))
  snippet(template)(view, null as unknown as Completion, from, to)
  return true
}

function reportInvalid(view: EditorView): void {
  htmlFeatureHost(view)?.report('emmet-invalid')
}

/** Emmet command and HTML5 template command bindings. */
export function htmlEmmetExtensions(): Extension[] {
  return [
    keymap.of([
      {
        key: 'Mod-Alt-e',
        run: view => expandAtCursor(view) || (reportInvalid(view), false),
      },
      {
        key: 'Mod-Alt-t',
        run: insertHtmlTemplate,
      },
    ]),
  ]
}
