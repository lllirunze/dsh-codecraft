import { CompletionContext } from '@codemirror/autocomplete'
import { indentUnit, foldable } from '@codemirror/language'
import { EditorSelection, EditorState, Transaction, type SelectionRange, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { afterEach, describe, expect, it } from 'vitest'
import { htmlEditorLanguage } from '../src/client/languages/html/index.js'
import { languageForFile } from '../src/client/languages/index.js'
import { languageExtensions } from '../src/client/editor/index.js'
import { htmlCompletionSource } from '../src/client/languages/html/features/completion.js'
import { htmlHoverAt } from '../src/client/languages/html/features/hover.js'
import { flattenOutline, htmlOutline } from '../src/client/languages/html/features/outline.js'
import {
  expandHtmlSelection,
  htmlBreadcrumbs,
  htmlSelectionLevels,
  jumpToMatchingTag,
  shrinkHtmlSelection,
} from '../src/client/languages/html/features/structure.js'
import {
  planFormatDocument,
  planFormatSelection,
  type HtmlFormatPlan,
} from '../src/client/languages/html/features/formatting.js'
import {
  expandEmmet,
  htmlEmmetCompletionSource,
  insertHtmlTemplate,
  type EmmetExpansion,
} from '../src/client/languages/html/features/emmet.js'
import { resolveHtmlNavigation } from '../src/client/languages/html/features/navigation.js'
import {
  bindHtmlPreviewOpener,
  htmlPreviewController,
  isHtmlFilePath,
  openPreviewPath,
  previewOpenerAvailable,
  setHtmlPreviewController,
} from '../src/client/languages/html/preview.js'

function htmlState(doc: string, selection?: EditorSelection | SelectionRange, width = 2): EditorState {
  return EditorState.create({
    doc,
    ...(selection === undefined ? {} : { selection }),
    extensions: [
      htmlEditorLanguage.createSupport(),
      htmlEditorLanguage.createEditorExtensions(),
      indentUnit.of(' '.repeat(width)),
    ],
  })
}

function applyPlan(state: EditorState, plan: HtmlFormatPlan | { error: string }): EditorState {
  if ('error' in plan) throw new Error(`unexpected formatting error: ${plan.error}`)
  return state.update({ changes: plan.changes }).state
}

function commandHarness(state: EditorState): { view: EditorView, read: () => EditorState } {
  let current = state
  const view = {
    get state() { return current },
    dispatch: (spec: Transaction | TransactionSpec) => {
      current = spec instanceof Transaction ? spec.state : current.update(spec).state
    },
    focus: () => undefined,
  } as unknown as EditorView
  return { view, read: () => current }
}

function offsetOf(doc: string, needle: string, extra = 0): number {
  const index = doc.indexOf(needle)
  if (index < 0) throw new Error(`missing ${needle}`)
  return index + extra
}

afterEach(() => {
  bindHtmlPreviewOpener(async () => false)()
})

describe('HTML Hover', () => {
  const doc = '<a href="https://example.com" target="_blank">link</a>'

  it('shows real standard text for a tag, attribute, and attribute value', () => {
    const state = htmlState(doc)
    const tag = htmlHoverAt(state, 1)
    expect(tag).not.toBeNull()
    expect(tag?.paragraphs.join(' ')).toMatch(/hyperlink/i)

    const href = htmlHoverAt(state, doc.indexOf('href'))
    expect(href?.paragraphs.join(' ')).toMatch(/URL/i)

    const targetValue = htmlHoverAt(state, doc.indexOf('_blank') + 2)
    expect(targetValue?.paragraphs.join(' ')).toMatch(/_blank|browsing context/i)
  })

  it('returns no invented content for an unknown attribute and entity', () => {
    const state = htmlState('<a data-unknown="value">link</a>')
    expect(htmlHoverAt(state, state.doc.toString().indexOf('data-unknown') + 4)).toBeNull()
  })
})

describe('HTML structure', () => {
  const nested = '<html><body><div><span>hi</span></div></body></html>'

  it('builds breadcrumbs from the root to the current element', () => {
    const state = htmlState(nested)
    const crumbs = htmlBreadcrumbs(state, offsetOf(nested, 'hi'))
    expect(crumbs.map(crumb => crumb.name)).toEqual(['html', 'body', 'div', 'span'])
    expect(crumbs.at(-1)?.nameFrom).toBe(offsetOf(nested, '<span') + 1)
  })

  it('builds a nested Outline with real start-tag offsets', () => {
    const state = htmlState(nested)
    const outline = htmlOutline(state)
    const flat = flattenOutline(outline)
    expect(flat.map(node => node.tag)).toEqual(['html', 'body', 'div', 'span'])
    expect(flat.find(node => node.tag === 'span')?.nameFrom).toBe(offsetOf(nested, '<span') + 1)
  })

  it('includes void elements and maps start tags after non-ASCII lines', () => {
    const doc = '<div>\n  <img src="x.png">\n  <p>中文</p>\n</div>'
    const state = htmlState(doc)
    const flat = flattenOutline(htmlOutline(state))
    expect(flat.map(node => node.tag)).toEqual(['div', 'img', 'p'])
    expect(flat.find(node => node.tag === 'img')?.children).toEqual([])
    expect(flat.find(node => node.tag === 'p')?.nameFrom).toBe(doc.indexOf('<p>') + 1)
  })

  it('offers the required selection levels around an attribute value', () => {
    const doc = '<div class="card"><span>hi</span></div>'
    const state = htmlState(doc)
    const position = offsetOf(doc, 'card') + 1
    const levels = htmlSelectionLevels(state, position)
    expect(levels.length).toBeGreaterThanOrEqual(4)
    expect(state.sliceDoc(levels[0]?.from, levels[0]?.to)).toBe('card')
    expect(state.sliceDoc(levels[1]?.from, levels[1]?.to)).toBe('class="card"')
    expect(state.sliceDoc(levels[2]?.from, levels[2]?.to)).toBe('<div class="card">')
    expect(state.sliceDoc(levels[3]?.from, levels[3]?.to)).toBe('<div class="card"><span>hi</span></div>')
  })

  it('expands and shrinks the selection through the structural levels', () => {
    const doc = '<div class="card"><span>hi</span></div>'
    const position = offsetOf(doc, 'card') + 1
    const harness = commandHarness(htmlState(doc, EditorSelection.cursor(position)))
    const seen: string[] = []
    for (let step = 0; step < 4; step += 1) {
      expect(expandHtmlSelection(harness.view)).toBe(true)
      const selection = harness.read().selection.main
      seen.push(harness.read().sliceDoc(selection.from, selection.to))
    }
    expect(seen).toEqual([
      'card',
      'class="card"',
      '<div class="card">',
      '<div class="card"><span>hi</span></div>',
    ])
    for (let step = 0; step < 3; step += 1) expect(shrinkHtmlSelection(harness.view)).toBe(true)
    const finalSelection = harness.read().selection.main
    expect(harness.read().sliceDoc(finalSelection.from, finalSelection.to)).toBe('card')
  })

  it('jumps between a start tag and its matching end tag', () => {
    const doc = '<div><span>hi</span></div>'
    const state = htmlState(doc, EditorSelection.cursor(1))
    const harness = commandHarness(state)
    expect(jumpToMatchingTag(harness.view)).toBe(true)
    expect(harness.read().selection.main.head).toBe(doc.indexOf('</div>') + 2)
    expect(jumpToMatchingTag(harness.view)).toBe(true)
    expect(harness.read().selection.main.head).toBe(1)
  })

  it('folds multiline comments and leaves one-line comments intact', () => {
    const doc = '<!-- first line\nsecond line -->\n<div>text</div>'
    const state = htmlState(doc)
    expect(foldable(state, 0, state.doc.line(1).to)).toBeDefined()
    const oneLine = htmlState('<!-- note -->\n<div>text</div>')
    expect(foldable(oneLine, 0, oneLine.doc.line(1).to)).toBeFalsy()
  })
})

describe('HTML formatting', () => {
  it('formats a document with the configured two spaces and is idempotent', () => {
    const doc = '<div><p>a</p><p>b</p></div>'
    const state = htmlState(doc)
    const plan = planFormatDocument(state, 2)
    const formatted = applyPlan(state, plan)
    expect(formatted.doc.toString()).toBe('<div>\n  <p>a</p>\n  <p>b</p>\n</div>')
    const again = applyPlan(formatted, planFormatDocument(formatted, 2))
    expect(again.doc.toString()).toBe(formatted.doc.toString())
  })

  it('uses four spaces when the shared indentation setting is four', () => {
    const state = htmlState('<div><p>a</p></div>')
    const formatted = applyPlan(state, planFormatDocument(state, 4))
    expect(formatted.doc.toString()).toContain('    <p>a</p>')
  })

  it('keeps the doctype and document structure', () => {
    const doc = '<!doctype html><html><head><title>x</title></head><body><p>a</p></body></html>'
    const state = htmlState(doc)
    const formatted = applyPlan(state, planFormatDocument(state, 2)).doc.toString()
    expect(formatted.startsWith('<!doctype html>')).toBe(true)
    expect(formatted).toContain('<title>x</title>')
  })

  it('preserves pre, textarea, and inline text whitespace', () => {
    const doc = '<div><pre>  keep\n   me</pre><textarea>  x\n y</textarea><p>one <b>two</b> three</p></div>'
    const state = htmlState(doc)
    const formatted = applyPlan(state, planFormatDocument(state, 2)).doc.toString()
    expect(formatted).toContain('<pre>  keep\n   me</pre>')
    expect(formatted).toContain('<textarea>  x\n y</textarea>')
    expect(formatted).toContain('one <b>two</b> three')
  })

  it('changes only complete selected lines and keeps the base indentation', () => {
    const doc = '<div>\n  <section>\n    <p>x</p>\n  </section>\n</div>'
    const state = htmlState(doc, EditorSelection.range(
      stateLineFrom(doc, 2),
      stateLineFrom(doc, 4),
    ))
    const plan = planFormatSelection(state, 2)
    const formatted = applyPlan(state, plan).doc.toString()
    const prefix = doc.slice(0, stateLineFrom(doc, 2))
    const suffix = doc.slice(stateLineFrom(doc, 4))
    expect(formatted.slice(0, prefix.length)).toBe(prefix)
    expect(formatted.endsWith(suffix)).toBe(true)
    expect(formatted).toContain('  <section>')
    expect(formatted).toContain('    <p>x</p>')
  })

  it('rejects a partial-line selection instead of widening the edit', () => {
    const doc = '<div><p>x</p></div>'
    const state = htmlState(doc, EditorSelection.range(1, 4))
    expect(planFormatSelection(state, 2)).toEqual({ error: 'unsupported-selection' })
  })
})

function stateLineFrom(doc: string, lineNumber: number): number {
  const lines = doc.split('\n')
  let offset = 0
  for (let index = 0; index < lineNumber - 1; index += 1) offset += (lines[index]?.length ?? 0) + 1
  return offset
}

describe('Emmet and template', () => {
  it('expands the required nested, repeated, class, and text abbreviation', () => {
    const expansion = expandEmmet('ul>li.item$*3>a{Item $}', '  ')
    expect(expansion?.snippet).toBe([
      '<ul>',
      '  <li class="item1"><a>Item 1</a></li>',
      '  <li class="item2"><a>Item 2</a></li>',
      '  <li class="item3"><a>Item 3</a></li>',
      '</ul>',
    ].join('\n'))
  })

  it('supports siblings, implicit div, attributes, and void elements', () => {
    expect(expandEmmet('p+p', '  ')?.snippet).toBe('<p>${}</p>\n<p>${}</p>')
    expect(expandEmmet('.card#main', '  ')?.snippet).toBe('<div id="main" class="card">${}</div>')
    expect(expandEmmet('a[href=https://example.com target=_blank]{Link}', '  ')?.snippet)
      .toBe('<a href="https://example.com" target="_blank">Link</a>')
    expect(expandEmmet('img[src=logo.png]', '  ')?.snippet).toBe('<img src="logo.png">')
  })

  it('rejects unsupported syntax without offering an expansion', () => {
    expect(expandEmmet('div>>span', '  ')).toBeUndefined()
    expect(expandEmmet('div[', '  ')).toBeUndefined()
  })

  it('adds an explicit completion candidate for a structural abbreviation', async () => {
    const doc = 'ul>li.item'
    const state = htmlState(doc)
    const source = htmlEmmetCompletionSource(htmlCompletionSource)
    const result = await source(new CompletionContext(state, doc.length, true))
    expect(result?.options.some(option => option.label.startsWith('Emmet: ul>li.item'))).toBe(true)
  })

  it('inserts a template into a blank document and only the selection otherwise', () => {
    const blank = commandHarness(htmlState(''))
    expect(insertHtmlTemplate(blank.view)).toBe(true)
    expect(blank.read().doc.toString()).toContain('<!doctype html>')
    expect(blank.read().doc.toString()).toContain('<title>')

    const doc = '<p>keep</p>'
    const nonEmpty = commandHarness(htmlState(doc, EditorSelection.range(doc.indexOf('keep'), doc.indexOf('keep') + 4)))
    expect(insertHtmlTemplate(nonEmpty.view)).toBe(true)
    expect(nonEmpty.read().doc.toString().startsWith('<p>')).toBe(true)
    expect(nonEmpty.read().doc.toString()).toContain('<!doctype html>')
    expect(nonEmpty.read().doc.toString()).toContain('</p>')
  })
})

describe('HTML local navigation', () => {
  function at(doc: string, value: string): EditorState {
    return htmlState(doc)
  }

  it('resolves a relative src against the current document directory', () => {
    const doc = '<img src="images/logo.png">'
    const state = htmlState(doc)
    expect(resolveHtmlNavigation(state, offsetOf(doc, 'logo'), 'site/index.html'))
      .toEqual({ status: 'file', path: 'site/images/logo.png' })
  })

  it('resolves same-document ids and reports missing and duplicate ids', () => {
    const doc = '<a href="#target">go</a><section id="target"></section>'
    const state = htmlState(doc)
    const result = resolveHtmlNavigation(state, offsetOf(doc, '#target') + 2, 'index.html')
    expect(result.status).toBe('anchor')
    if (result.status === 'anchor') expect(result.from).toBe(offsetOf(doc, '<section') + 1)

    const missing = htmlState('<a href="#none">go</a>')
    expect(resolveHtmlNavigation(missing, offsetOf('<a href="#none">', '#none') + 2, 'index.html'))
      .toEqual({ status: 'error', code: 'missing-id' })

    const duplicateDoc = '<a href="#same">go</a><i id="same"></i><b id="same"></b>'
    const duplicate = htmlState(duplicateDoc)
    expect(resolveHtmlNavigation(duplicate, offsetOf(duplicateDoc, '#same') + 2, 'index.html'))
      .toEqual({ status: 'error', code: 'duplicate-id' })
  })

  it('never treats HTTP, scheme, or root-relative URLs as local files', () => {
    const externalDoc = '<a href="https://example.com/x">x</a>'
    expect(resolveHtmlNavigation(htmlState(externalDoc), offsetOf(externalDoc, 'example') + 2, 'index.html'))
      .toEqual({ status: 'external' })
    const mailto = '<a href="mailto:dev@example.com">mail</a>'
    expect(resolveHtmlNavigation(htmlState(mailto), offsetOf(mailto, 'mailto'), 'index.html'))
      .toEqual({ status: 'external' })
    const root = '<script src="/assets/app.js"></script>'
    expect(resolveHtmlNavigation(htmlState(root), offsetOf(root, '/assets'), 'index.html'))
      .toEqual({ status: 'error', code: 'root-relative' })
  })

  it('refuses paths that escape the workspace root', () => {
    const doc = '<img src="../../outside.png">'
    expect(resolveHtmlNavigation(htmlState(doc), offsetOf(doc, 'outside'), 'site/index.html'))
      .toEqual({ status: 'error', code: 'outside-workspace' })
  })

  it('drops query and fragment suffixes from a local file identity', () => {
    const doc = '<script src="scripts/app.js?v=2#top"></script>'
    const state = htmlState(doc)
    expect(resolveHtmlNavigation(state, offsetOf(doc, 'app.js'), 'site/index.html'))
      .toEqual({ status: 'file', path: 'site/scripts/app.js' })
  })

  it('does nothing on ordinary text', () => {
    const doc = '<div>plain</div>'
    expect(resolveHtmlNavigation(htmlState(doc), offsetOf(doc, 'plain'), 'index.html'))
      .toEqual({ status: 'none' })
  })
})

describe('HTML assistance gate', () => {
  it('removes every HTML extension when the single switch is off', () => {
    const language = languageForFile('index.html')
    expect(language.id).toBe('html')
    expect(languageExtensions(language, true, false)).toEqual([])
    expect(languageExtensions(language, true, true)).not.toEqual([])
  })
})

describe('Preview controller', () => {
  it('identifies HTML paths case-insensitively', () => {
    expect(isHtmlFilePath('/a/index.html')).toBe(true)
    expect(isHtmlFilePath('C:\\site\\Page.HTM')).toBe(true)
    expect(isHtmlFilePath('/a/index.css')).toBe(false)
  })

  it('registers controllers and exposes the bound opener', async () => {
    const calls: string[] = []
    const cleanup = bindHtmlPreviewOpener(async path => {
      calls.push(path)
      return true
    })
    expect(previewOpenerAvailable()).toBe(true)
    const dispose = setHtmlPreviewController({
      path: '/site/index.html',
      state: () => ({ dirty: false, busy: false }),
      requestPreview: () => undefined,
    })
    expect(htmlPreviewController('/site/index.html')).toBeDefined()
    expect(await openPreviewPath('/site/index.html')).toBe(true)
    expect(calls).toEqual(['/site/index.html'])
    dispose()
    expect(htmlPreviewController('/site/index.html')).toBeUndefined()
    cleanup()
    expect(previewOpenerAvailable()).toBe(false)
  })
})
