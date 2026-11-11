/** Standard HTML Hover backed by the bundled web custom data. */

import type { EditorState, Extension } from '@codemirror/state'
import { hoverTooltip } from '@codemirror/view'
import type { MarkupContent, MarkedString } from 'vscode-html-languageservice'
import { syntaxTree } from '@codemirror/language'
import {
  htmlLanguageService,
  htmlParsedDocument,
  htmlTextDocument,
  offsetAtPosition,
  servicePosition,
} from '../service.js'

function textOfContents(contents: MarkupContent | MarkedString | MarkedString[]): string {
  if (typeof contents === 'string') return contents
  if (Array.isArray(contents)) {
    return contents.map(part => typeof part === 'string' ? part : part.value).join('\n\n')
  }
  return contents.value
}

/** Flatten the limited Markdown used by the HTML data into readable plain text. */
export function plainTextDocumentation(value: string): string[] {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
    .filter(paragraph => paragraph.length > 0)
}

export interface HtmlHoverContent {
  from: number
  to: number
  paragraphs: string[]
}

function attributeNameOffset(state: EditorState, position: number): number | null {
  const resolved = syntaxTree(state).resolveInner(position, -1)
  for (let node: typeof resolved | null = resolved; node !== null; node = node.parent) {
    if (node.name !== 'Attribute') continue
    const name = node.getChild('AttributeName')
    return name === null ? null : name.from
  }
  return null
}

function resolvedHover(state: EditorState, position: number) {
  const text = state.doc
  const document = htmlTextDocument(text)
  const parsed = htmlParsedDocument(text)
  const options = { documentation: true, references: false }
  const hover = htmlLanguageService.doHover(document, servicePosition(text, position), parsed, options)
  if (hover !== null) return hover
  // A free-form value has no dedicated data entry. Hovering it still shows the
  // owning attribute's real description, which documents enumerated values.
  const attribute = attributeNameOffset(state, position)
  return attribute === null
    ? null
    : htmlLanguageService.doHover(document, servicePosition(text, attribute), parsed, options)
}

/** Resolve the real static Hover content for one document position. */
export function htmlHoverAt(state: EditorState, position: number): HtmlHoverContent | null {
  const text = state.doc
  const hover = resolvedHover(state, position)
  if (hover === null || hover.contents === undefined || hover.range === undefined) return null
  const paragraphs = plainTextDocumentation(textOfContents(hover.contents))
  if (paragraphs.length === 0) return null
  const from = offsetAtPosition(text, hover.range.start)
  const to = offsetAtPosition(text, hover.range.end)
  if (position < from || position > to) {
    return { from: position, to: Math.min(text.length, position + 1), paragraphs }
  }
  return { from, to: Math.max(from, to), paragraphs }
}

/** Hover for tag names, attributes, known values, and character references. */
export function htmlHoverExtensions(): Extension[] {
  return [
    hoverTooltip((view, position) => {
      const content = htmlHoverAt(view.state, position)
      if (content === null) return null
      return {
        pos: content.from,
        end: content.to,
        above: true,
        create: () => {
          const dom = window.document.createElement('div')
          dom.className = 'dsh-codecraft-hover'
          for (const paragraph of content.paragraphs) {
            const line = window.document.createElement('div')
            line.textContent = paragraph
            dom.appendChild(line)
          }
          return { dom }
        },
      }
    }, { hoverTime: 300 }),
  ]
}
