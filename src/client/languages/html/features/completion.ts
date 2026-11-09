import {
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete'
import { htmlCompletionSourceWith, htmlLanguage } from '@codemirror/lang-html'
import { indentUnit, syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'

const baseHtmlCompletion = htmlCompletionSourceWith({
  extraTags: {
    dialog: {},
    main: {},
    picture: {},
    search: {},
  },
})

const ENTITY_DEFINITIONS = [
  ['&amp;', 'ampersand'],
  ['&lt;', 'less-than sign'],
  ['&gt;', 'greater-than sign'],
  ['&quot;', 'double quotation mark'],
  ['&apos;', 'apostrophe'],
  ['&nbsp;', 'non-breaking space'],
  ['&copy;', 'copyright sign'],
  ['&reg;', 'registered sign'],
] as const

const ENTITIES: readonly Completion[] = ENTITY_DEFINITIONS.map(([label, detail]) => ({
  label,
  apply: label,
  detail,
  type: 'constant',
}))

type HtmlNode = ReturnType<typeof syntaxTree>['topNode']

function ancestor(node: HtmlNode | null, name: string): HtmlNode | null {
  for (let current = node; current !== null; current = current.parent) {
    if (current.name === name) return current
  }
  return null
}

function existingAttributes(state: EditorState, position: number): Set<string> {
  const resolved = syntaxTree(state).resolveInner(position, -1)
  const openTag = ancestor(resolved, 'OpenTag') ?? ancestor(resolved, 'SelfClosingTag')
  const currentAttribute = ancestor(resolved, 'Attribute')
  const existing = new Set<string>()
  if (openTag === null) return existing
  for (let child = openTag.firstChild; child !== null; child = child.nextSibling) {
    if (child.name !== 'Attribute' || child.from === currentAttribute?.from) continue
    const name = child.getChild('AttributeName')
    if (name !== null) existing.add(state.sliceDoc(name.from, name.to).toLowerCase())
  }
  return existing
}

function filterDuplicateAttributes(
  context: CompletionContext,
  result: CompletionResult,
): CompletionResult {
  if (!result.options.some(option => option.type === 'property')) return result
  const existing = existingAttributes(context.state, context.pos)
  if (existing.size === 0) return result
  return {
    ...result,
    options: result.options.filter(option => (
      option.type !== 'property' || !existing.has(option.label.toLowerCase())
    )),
  }
}

function snippetOptions(state: EditorState): Array<Completion & { abbreviation: string }> {
  const unit = state.facet(indentUnit)
  const page = [
    '<!doctype html>',
    '<html lang="${1:en}">',
    '<head>',
    `${unit}<meta charset="UTF-8">`,
    `${unit}<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    `${unit}<title>\${2:Document}</title>`,
    '</head>',
    '<body>',
    `${unit}\${3}`,
    '</body>',
    '</html>',
  ].join('\n')
  const form = [
    '<form action="${1:/submit}" method="${2:post}">',
    `${unit}<label for="\${3:field}">\${4:Label}</label>`,
    `${unit}<input id="\${3:field}" name="\${3:field}" type="\${5:text}">`,
    `${unit}<button type="submit">\${6:Submit}</button>`,
    '</form>',
  ].join('\n')
  const definitions: Array<[string, string, string, string]> = [
    ['doctype', '<!doctype html>', 'HTML5 DOCTYPE', 'keyword'],
    ['html5', page, 'HTML5 page skeleton', 'keyword'],
    ['meta-charset', '<meta charset="${1:UTF-8}">', 'Character encoding metadata', 'keyword'],
    ['link-css', '<link rel="stylesheet" href="${1:styles.css}">', 'Stylesheet link', 'keyword'],
    ['form', form, 'Basic form', 'keyword'],
  ]
  return definitions.map(([abbreviation, template, detail, type]) => ({
    ...snippetCompletion(template, { label: abbreviation, detail, type }),
    abbreviation,
  }))
}

function canOfferSnippets(context: CompletionContext): boolean {
  const node = syntaxTree(context.state).resolveInner(context.pos, -1)
  return node.name === 'Text' || node.name === 'Document'
}

function completeEntities(context: CompletionContext): CompletionResult | null {
  const match = context.matchBefore(/&[A-Za-z0-9]*$/u)
  if (match === null) return null
  const node = syntaxTree(context.state).resolveInner(context.pos, -1)
  const allowed = node.name === 'Text'
    || ancestor(node, 'AttributeValue') !== null
    || ancestor(node, 'UnquotedAttributeValue') !== null
  if (!allowed) return null
  return {
    from: match.from,
    options: ENTITIES,
    validFor: /^&[A-Za-z0-9]*$/u,
  }
}

function completeSnippets(context: CompletionContext): CompletionResult | null {
  if (!canOfferSnippets(context)) return null
  const match = context.matchBefore(/[A-Za-z][A-Za-z0-9-]*$/u)
  if (match === null && !context.explicit) return null
  const prefix = match?.text.toLowerCase() ?? ''
  const options = snippetOptions(context.state).filter(option => (
    prefix.length === 0 || option.abbreviation.startsWith(prefix)
  ))
  if (options.length === 0) return null
  return {
    from: match?.from ?? context.pos,
    options,
    validFor: /^[A-Za-z][A-Za-z0-9-]*$/u,
  }
}

/** One HTML completion source for standard metadata, entities, and snippets. */
export const htmlCompletionSource: CompletionSource = (context) => {
  const activePosition = Math.max(0, context.pos - 1)
  if (!htmlLanguage.isActiveAt(context.state, activePosition)) return null

  const entity = completeEntities(context)
  if (entity !== null) return entity

  const standard = baseHtmlCompletion(context)
  const snippets = completeSnippets(context)
  if (standard === null) return snippets
  const filtered = filterDuplicateAttributes(context, standard)
  if (snippets === null || snippets.from !== filtered.from) return filtered
  return {
    ...filtered,
    options: [...filtered.options, ...snippets.options],
  }
}
