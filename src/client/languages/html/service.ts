/**
 * Shared HTML language-service access for the local editor features.
 *
 * One service instance parses and describes the current CodeMirror document.
 * The bundled VS Code HTML data provides real tag, attribute, and value
 * descriptions, and the library ships inside the client bundle so no runtime
 * download or language server is involved.
 *
 * @module dsh-codecraft/client/languages/html/service
 */

import type { Text } from '@codemirror/state'
import {
  getLanguageService,
  TextDocument,
  type HTMLDocument,
  type Position,
} from 'vscode-html-languageservice'

export const htmlLanguageService = getLanguageService()

const DOCUMENT_URI = 'file:///dsh-codecraft/document.html'
const documents = new WeakMap<Text, TextDocument>()
const parsedDocuments = new WeakMap<Text, HTMLDocument>()

/** Convert one CodeMirror text offset to a zero-based language-service position. */
export function servicePosition(doc: Text, offset: number): Position {
  const limited = Math.min(Math.max(0, offset), doc.length)
  const line = doc.lineAt(limited)
  return { line: line.number - 1, character: limited - line.from }
}

/** Convert one language-service request position to a clamped text offset. */
export function offsetAtPosition(doc: Text, position: Position): number {
  const lineNumber = Math.min(Math.max(1, position.line + 1), doc.lines)
  const line = doc.line(lineNumber)
  return line.from + Math.min(Math.max(0, position.character), line.length)
}

/** Build or reuse the text document for one immutable CodeMirror text value. */
export function htmlTextDocument(text: Text): TextDocument {
  const existing = documents.get(text)
  if (existing !== undefined) return existing
  const created = TextDocument.create(DOCUMENT_URI, 'html', 0, text.toString())
  documents.set(text, created)
  return created
}

/** Parse one document once per immutable text value. */
export function htmlParsedDocument(text: Text): HTMLDocument {
  const existing = parsedDocuments.get(text)
  if (existing !== undefined) return existing
  const created = htmlLanguageService.parseHTMLDocument(htmlTextDocument(text))
  parsedDocuments.set(text, created)
  return created
}
