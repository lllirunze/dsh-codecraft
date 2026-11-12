/** Offline, evidence-based diagnostics for the current HTML document. */

import { syntaxTree } from '@codemirror/language'
import { linter, type Diagnostic } from '@codemirror/lint'
import type { EditorState, Extension } from '@codemirror/state'
import { getDefaultHTMLDataProvider } from 'vscode-html-languageservice'

type TreeNode = ReturnType<typeof syntaxTree>['topNode']

export type HtmlDiagnosticSeverity = 'error' | 'warning' | 'info'

export interface HtmlDiagnostic {
  ruleId: string
  severity: HtmlDiagnosticSeverity
  from: number
  to: number
  message: string
}

interface HtmlAttributeRecord {
  name: string
  value: string | undefined
  from: number
  to: number
  nameFrom: number
  nameTo: number
  valueFrom: number | undefined
  valueTo: number | undefined
}

interface HtmlElementRecord {
  tag: string
  from: number
  to: number
  nameFrom: number
  nameTo: number
  parentTag: string | undefined
  attributes: HtmlAttributeRecord[]
}

const dataProvider = getDefaultHTMLDataProvider()
const standardTags = new Set(dataProvider.provideTags().map(tag => tag.name.toLowerCase()))

const DEPRECATED_ELEMENTS = new Set([
  'acronym', 'applet', 'basefont', 'big', 'blink', 'center', 'dir', 'font',
  'frame', 'frameset', 'isindex', 'keygen', 'marquee', 'menuitem', 'nobr',
  'noembed', 'param', 'plaintext', 'strike', 'tt', 'xmp',
])

const DEPRECATED_ATTRIBUTES = new Set([
  'align', 'alink', 'background', 'bgcolor', 'border', 'cellpadding',
  'cellspacing', 'char', 'charoff', 'clear', 'compact', 'frame', 'hspace',
  'language', 'link', 'marginheight', 'marginwidth', 'noshade', 'nowrap',
  'rules', 'scrolling', 'size', 'text', 'valign', 'vlink', 'vspace',
])

const FORM_CONTROL_TAGS = new Set([
  'button', 'input', 'meter', 'output', 'progress', 'select', 'textarea',
])

const INVALID_DIRECT_PARENTS: Readonly<Record<string, readonly string[]>> = {
  head: ['html'],
  body: ['html'],
  tr: ['table', 'thead', 'tbody', 'tfoot'],
  td: ['tr'],
  th: ['tr'],
}

function unquoteRange(state: EditorState, node: TreeNode): { value: string, from: number, to: number } {
  const raw = state.sliceDoc(node.from, node.to)
  const quoted = raw.length >= 2
    && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
  return quoted
    ? { value: raw.slice(1, -1), from: node.from + 1, to: node.to - 1 }
    : { value: raw, from: node.from, to: node.to }
}

function tagNameNode(node: TreeNode | null): TreeNode | null {
  return node?.getChild('TagName') ?? null
}

function containingElement(node: TreeNode | null): TreeNode | null {
  for (let current = node; current !== null; current = current.parent) {
    if (current.name === 'Element') return current
  }
  return null
}

function elementTag(state: EditorState, element: TreeNode | null): string | undefined {
  const tag = tagNameNode(element?.firstChild ?? null)
  return tag === null ? undefined : state.sliceDoc(tag.from, tag.to).toLowerCase()
}

function readAttribute(state: EditorState, node: TreeNode): HtmlAttributeRecord | undefined {
  const nameNode = node.getChild('AttributeName')
  if (nameNode === null) return undefined
  const valueNode = node.getChild('AttributeValue')
  const value = valueNode === null ? undefined : unquoteRange(state, valueNode)
  return {
    name: state.sliceDoc(nameNode.from, nameNode.to).toLowerCase(),
    value: value?.value,
    from: node.from,
    to: node.to,
    nameFrom: nameNode.from,
    nameTo: nameNode.to,
    valueFrom: value?.from,
    valueTo: value?.to,
  }
}

function collectElements(state: EditorState): HtmlElementRecord[] {
  const result: HtmlElementRecord[] = []
  syntaxTree(state).iterate({
    enter(cursor) {
      if (cursor.name !== 'Element') return
      const element = cursor.node
      const tagNode = element.firstChild
      if (tagNode === null || (tagNode.name !== 'OpenTag' && tagNode.name !== 'SelfClosingTag')) return
      const name = tagNameNode(tagNode)
      if (name === null) return
      const attributes: HtmlAttributeRecord[] = []
      for (let child = tagNode.firstChild; child !== null; child = child.nextSibling) {
        if (child.name !== 'Attribute') continue
        const attribute = readAttribute(state, child)
        if (attribute !== undefined) attributes.push(attribute)
      }
      result.push({
        tag: state.sliceDoc(name.from, name.to).toLowerCase(),
        from: element.from,
        to: element.to,
        nameFrom: name.from,
        nameTo: name.to,
        parentTag: elementTag(state, containingElement(element.parent)),
        attributes,
      })
    },
  })
  return result
}

function add(
  diagnostics: HtmlDiagnostic[],
  ruleId: string,
  severity: HtmlDiagnosticSeverity,
  from: number,
  to: number,
  message: string,
  length: number,
): void {
  const safeFrom = Math.min(Math.max(0, from), length)
  const safeTo = Math.min(Math.max(safeFrom + (length > safeFrom ? 1 : 0), to), length)
  diagnostics.push({ ruleId, severity, from: safeFrom, to: safeTo, message })
}

function attributeOf(element: HtmlElementRecord, name: string): HtmlAttributeRecord | undefined {
  return element.attributes.find(attribute => attribute.name === name)
}

function structureDiagnostics(state: EditorState, diagnostics: HtmlDiagnostic[]): void {
  const length = state.doc.length
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === 'MismatchedCloseTag') {
        const name = tagNameNode(node.node)
        add(diagnostics, 'html.structure.mismatched-close', 'error', name?.from ?? node.from, name?.to ?? node.to,
          'This closing tag does not match the parsed opening tag.', length)
      } else if (node.type.isError) {
        add(diagnostics, 'html.structure.syntax', 'error', node.from, node.to,
          'The HTML parser found invalid or incomplete markup here.', length)
      }
    },
  })
}

function attributeDiagnostics(
  state: EditorState,
  elements: readonly HtmlElementRecord[],
  diagnostics: HtmlDiagnostic[],
): void {
  for (const element of elements) {
    const seen = new Set<string>()
    const knownTag = standardTags.has(element.tag)
    const allowed = knownTag
      ? new Set(dataProvider.provideAttributes(element.tag).map(attribute => attribute.name.toLowerCase()))
      : undefined
    for (const attribute of element.attributes) {
      if (seen.has(attribute.name)) {
        add(diagnostics, 'html.attribute.duplicate', 'error', attribute.nameFrom, attribute.nameTo,
          `Duplicate attribute “${attribute.name}”.`, state.doc.length)
      }
      seen.add(attribute.name)

      const extensible = attribute.name.startsWith('data-')
        || attribute.name.startsWith('aria-')
        || attribute.name.includes(':')
      if (allowed !== undefined && !allowed.has(attribute.name) && !extensible) {
        add(diagnostics, 'html.attribute.unsupported', 'warning', attribute.nameFrom, attribute.nameTo,
          `The standard <${element.tag}> element does not allow “${attribute.name}”.`, state.doc.length)
      }

      if (attribute.value !== undefined && knownTag) {
        const values = dataProvider.provideValues(element.tag, attribute.name)
        if (values.length > 0 && !values.some(value => value.name.toLowerCase() === attribute.value?.toLowerCase())) {
          add(diagnostics, 'html.attribute.invalid-value', 'error', attribute.valueFrom ?? attribute.from,
            attribute.valueTo ?? attribute.to,
            `“${attribute.value}” is not a valid value for ${attribute.name}.`, state.doc.length)
        }
      }
    }
  }
}

function documentDiagnostics(
  state: EditorState,
  elements: readonly HtmlElementRecord[],
  diagnostics: HtmlDiagnostic[],
): void {
  const text = state.doc.toString()
  const doctype = /<!doctype\b[^>]*>/i.exec(text)
  const complete = doctype !== null || elements.some(element => ['html', 'head', 'body'].includes(element.tag))
  if (!complete) return
  if (doctype === null) {
    add(diagnostics, 'html.document.doctype', 'info', 0, Math.min(1, state.doc.length),
      'A complete HTML document should begin with <!doctype html>.', state.doc.length)
  } else if (!/^<!doctype\s+html\s*>$/i.test(doctype[0])) {
    add(diagnostics, 'html.document.doctype-invalid', 'error', doctype.index, doctype.index + doctype[0].length,
      'Use the HTML5 <!doctype html> declaration.', state.doc.length)
  }
  for (const tag of ['html', 'head', 'body']) {
    const matches = elements.filter(element => element.tag === tag)
    if (matches.length === 0) {
      add(diagnostics, `html.document.missing-${tag}`, 'warning', 0, Math.min(1, state.doc.length),
        `This complete document is missing a <${tag}> element.`, state.doc.length)
    } else if (matches.length > 1) {
      for (const duplicate of matches.slice(1)) {
        add(diagnostics, `html.document.duplicate-${tag}`, 'error', duplicate.nameFrom, duplicate.nameTo,
          `A complete document must not contain multiple <${tag}> elements.`, state.doc.length)
      }
    }
  }
}

function relationshipDiagnostics(
  state: EditorState,
  elements: readonly HtmlElementRecord[],
  diagnostics: HtmlDiagnostic[],
): void {
  const ids = new Map<string, HtmlAttributeRecord[]>()
  for (const element of elements) {
    const id = attributeOf(element, 'id')
    if (id?.value === undefined || id.value === '') continue
    const list = ids.get(id.value)
    if (list === undefined) ids.set(id.value, [id])
    else list.push(id)
  }
  for (const [id, records] of ids) {
    if (records.length < 2) continue
    for (const record of records) {
      add(diagnostics, 'html.id.duplicate', 'warning', record.valueFrom ?? record.from, record.valueTo ?? record.to,
        `The id “${id}” is not unique in this document.`, state.doc.length)
    }
  }

  for (const element of elements) {
    const href = attributeOf(element, 'href')
    if (href?.value?.startsWith('#') && href.value.length > 1 && !ids.has(href.value.slice(1))) {
      add(diagnostics, 'html.id.missing-fragment', 'warning', href.valueFrom ?? href.from, href.valueTo ?? href.to,
        `No element has the id “${href.value.slice(1)}”.`, state.doc.length)
    }
    if (element.tag === 'img' && attributeOf(element, 'alt') === undefined) {
      add(diagnostics, 'html.a11y.missing-alt', 'warning', element.nameFrom, element.nameTo,
        'Add an alt attribute to this image; use alt="" for a decorative image.', state.doc.length)
    }
    if (element.tag === 'label') {
      const target = attributeOf(element, 'for')
      if (target?.value !== undefined) {
        const controls = elements.filter(candidate => FORM_CONTROL_TAGS.has(candidate.tag)
          && attributeOf(candidate, 'id')?.value === target.value)
        if (controls.length === 0) {
          add(diagnostics, 'html.a11y.missing-label-target', 'warning', target.valueFrom ?? target.from,
            target.valueTo ?? target.to, `No form control has the id “${target.value}”.`, state.doc.length)
        }
      }
    }

    if (DEPRECATED_ELEMENTS.has(element.tag)) {
      add(diagnostics, 'html.deprecated.element', 'warning', element.nameFrom, element.nameTo,
        `The <${element.tag}> element is obsolete in HTML5.`, state.doc.length)
    }
    for (const attribute of element.attributes) {
      if (!DEPRECATED_ATTRIBUTES.has(attribute.name)) continue
      add(diagnostics, 'html.deprecated.attribute', 'warning', attribute.nameFrom, attribute.nameTo,
        `The “${attribute.name}” attribute is obsolete in HTML5.`, state.doc.length)
    }

    const allowedParents = INVALID_DIRECT_PARENTS[element.tag]
    if (allowedParents !== undefined && (element.parentTag === undefined || !allowedParents.includes(element.parentTag))) {
      add(diagnostics, 'html.structure.invalid-parent', 'error', element.nameFrom, element.nameTo,
        `<${element.tag}> is not valid directly inside ${element.parentTag === undefined ? 'the document' : `<${element.parentTag}>`}.`,
        state.doc.length)
    }
  }
}

/** Analyze one immutable editor state without filesystem, network, or runtime services. */
export function analyzeHtml(state: EditorState): HtmlDiagnostic[] {
  if (state.doc.length === 0) return []
  const diagnostics: HtmlDiagnostic[] = []
  const elements = collectElements(state)
  structureDiagnostics(state, diagnostics)
  attributeDiagnostics(state, elements, diagnostics)
  documentDiagnostics(state, elements, diagnostics)
  relationshipDiagnostics(state, elements, diagnostics)
  const unique = new Map<string, HtmlDiagnostic>()
  for (const diagnostic of diagnostics) {
    unique.set(`${diagnostic.ruleId}:${diagnostic.from}:${diagnostic.to}`, diagnostic)
  }
  return [...unique.values()].sort((left, right) => left.from - right.from || left.to - right.to)
}

/** CodeMirror ranges, tooltips, and lint navigation for the active HTML editor. */
export function htmlDiagnosticExtensions(): Extension[] {
  return [
    linter(view => analyzeHtml(view.state).map((diagnostic): Diagnostic => ({
      from: diagnostic.from,
      to: diagnostic.to,
      severity: diagnostic.severity,
      message: diagnostic.message,
      source: diagnostic.ruleId,
    })), { delay: 300 }),
  ]
}
