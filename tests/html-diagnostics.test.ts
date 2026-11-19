import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { htmlEditorLanguage } from '../src/client/languages/html/index.js'
import { analyzeHtml, localizedHtmlDiagnostic } from '../src/client/languages/html/features/diagnostics.js'
import { en, zh, type Translate } from '../src/client/i18n/index.js'

function state(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [htmlEditorLanguage.createSupport()] })
}

function rules(doc: string): string[] {
  return analyzeHtml(state(doc)).map(diagnostic => diagnostic.ruleId)
}

describe('HTML diagnostics', () => {
  it('localizes CodeCraft rule messages while preserving their identifiers', () => {
    const diagnostic = analyzeHtml(state('<!doctype html><html><body><img src="x"></body></html>'))
      .find(item => item.ruleId === 'html.a11y.missing-alt')
    expect(diagnostic).toBeDefined()
    const translate = (catalog: typeof en | typeof zh): Translate => (key, params) =>
      catalog[key].replace(/\{([^{}]+)\}/g, (_match, name: string) => String(params?.[name] ?? ''))
    expect(localizedHtmlDiagnostic(diagnostic!, translate(en))).toContain('alt')
    expect(localizedHtmlDiagnostic(diagnostic!, translate(zh))).toContain('请为此图片')
    expect(diagnostic?.ruleId).toBe('html.a11y.missing-alt')
    const root = analyzeHtml(state('<head><title>x</title></head>'))
      .find(item => item.ruleId === 'html.structure.invalid-parent')
    expect(root).toBeDefined()
    expect(localizedHtmlDiagnostic(root!, translate(zh))).toContain('文档根级')
  })
  it('reports mismatched explicit closing tags with an exact error range', () => {
    const doc = '<div></span>'
    const diagnostics = analyzeHtml(state(doc))
    const mismatch = diagnostics.find(diagnostic => diagnostic.ruleId === 'html.structure.mismatched-close')
    expect(mismatch).toMatchObject({ severity: 'error', from: 7, to: 11 })
    expect(doc.slice(mismatch?.from, mismatch?.to)).toBe('span')
  })

  it('does not mistake legal optional closing, void elements, comments, or text for errors', () => {
    const doc = '<ul><li>One<li>Two</ul>\n<img src="x" alt="">\n<input disabled required>\n<p>2 < 3</p>\n<!-- <div> -->'
    const diagnostics = analyzeHtml(state(doc))
    expect(diagnostics.filter(item => item.severity === 'error')).toEqual([])
    expect(rules(doc)).not.toContain('html.a11y.missing-alt')
  })

  it('reports duplicate, unsupported, and invalid enumerated attributes', () => {
    const doc = '<a href="/" href="/x" target="_invalid" madeup="x">x</a>'
    const found = rules(doc)
    expect(found).toContain('html.attribute.duplicate')
    expect(found).toContain('html.attribute.invalid-value')
    expect(found).toContain('html.attribute.unsupported')
  })

  it('allows global, data, aria, and boolean attributes', () => {
    const found = rules('<input id="x" class="c" data-mode="x" aria-label="x" disabled required>')
    expect(found).not.toContain('html.attribute.unsupported')
    expect(found).not.toContain('html.attribute.invalid-value')
  })

  it('finds duplicate ids and missing fragments but accepts a unique target', () => {
    const invalid = rules('<div id="x"></div><span id="x"></span><a href="#missing">go</a>')
    expect(invalid.filter(rule => rule === 'html.id.duplicate')).toHaveLength(2)
    expect(invalid).toContain('html.id.missing-fragment')
    expect(rules('<div id="x"></div><a href="#x">go</a>')).not.toContain('html.id.missing-fragment')
  })

  it('checks document skeleton only for complete-document candidates', () => {
    expect(rules('<section><p>fragment</p></section>')).not.toContain('html.document.doctype')
    const complete = rules('<html><body>x</body></html>')
    expect(complete).toContain('html.document.doctype')
    expect(complete).toContain('html.document.missing-head')
    expect(rules('<!doctype html><html><head></head><body></body></html>'))
      .not.toContain('html.document.doctype')
  })

  it('reports missing image alt and missing label controls without rejecting empty alt', () => {
    const found = rules('<img src="x"><img src="decorative" alt=""><label for="age">Age</label><input id="email">')
    expect(found.filter(rule => rule === 'html.a11y.missing-alt')).toHaveLength(1)
    expect(found).toContain('html.a11y.missing-label-target')
    expect(rules('<label for="age">Age</label><input id="age">')).not.toContain('html.a11y.missing-label-target')
  })

  it('uses fixed offline deprecation and conservative parent rules', () => {
    const found = rules('<font align="center">x</font><div><td>x</td></div>')
    expect(found).toContain('html.deprecated.element')
    expect(found).toContain('html.deprecated.attribute')
    expect(found).toContain('html.structure.invalid-parent')
    const valid = rules('<main><article>x</article></main><table><tbody><tr><td>x</td></tr></tbody></table>')
    expect(valid).not.toContain('html.deprecated.element')
    expect(valid).not.toContain('html.deprecated.attribute')
    expect(valid).not.toContain('html.structure.invalid-parent')
  })
})
