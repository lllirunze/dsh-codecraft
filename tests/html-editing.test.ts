import { CompletionContext } from '@codemirror/autocomplete'
import { history, insertNewlineAndIndent, toggleComment, undo } from '@codemirror/commands'
import { ensureSyntaxTree, foldable, indentUnit, syntaxTree } from '@codemirror/language'
import { EditorSelection, EditorState, Transaction, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { htmlCompletionSource } from '../src/client/languages/html/features/completion.js'
import {
  HTML_OPTIONAL_END_ELEMENTS,
  HTML_VOID_ELEMENTS,
  htmlClosingEdit,
} from '../src/client/languages/html/features/tags.js'
import { htmlEditorLanguage } from '../src/client/languages/html/index.js'

function htmlState(doc: string, position = doc.length, width = 2): EditorState {
  return EditorState.create({
    doc,
    selection: EditorSelection.cursor(position),
    extensions: [
      htmlEditorLanguage.createSupport(),
      htmlEditorLanguage.createEditorExtensions(),
      indentUnit.of(' '.repeat(width)),
    ],
  })
}

async function completionResult(doc: string, explicit = false) {
  const state = htmlState(doc)
  return await htmlCompletionSource(new CompletionContext(state, doc.length, explicit))
}

async function completionLabels(doc: string, explicit = false): Promise<string[]> {
  const result = await completionResult(doc, explicit)
  return result?.options.map(option => option.label) ?? []
}

function commandHarness(state: EditorState): { view: EditorView, state: () => EditorState } {
  let current = state
  const view = {
    get state() { return current },
    dispatch: (spec: Transaction | TransactionSpec) => {
      current = spec instanceof Transaction ? spec.state : current.update(spec).state
    },
  } as unknown as EditorView
  return { view, state: () => current }
}

describe('HTML parsing and completion', () => {
  it('parses HTML, comments, DOCTYPE, and nested CSS and JavaScript locally', () => {
    const state = htmlState('<!doctype html><style media="screen">body { color: red }</style><script>const value = 1</script><!-- note -->')
    const parsed = ensureSyntaxTree(state, state.doc.length, 1_000)
    expect(parsed).not.toBeNull()
    const tree = parsed?.toString() ?? ''
    expect(tree).toContain('DoctypeDecl')
    expect(tree).toContain('OpenTag')
    expect(tree).toContain('AttributeName')
    expect(tree).toContain('AttributeValue')
    expect(tree).toContain('StyleSheet')
    expect(tree).toContain('Script(VariableDeclaration')
    expect(tree).toContain('Comment')
    const foldState = htmlState('<div>\n  <span>value</span>\n</div>')
    expect(foldable(foldState, 0, foldState.doc.line(1).to)).toBeDefined()
  })

  it('offers filtered standard tags and contextual attributes', async () => {
    expect(await completionLabels('<bu')).toContain('button')
    expect(await completionLabels('<a hr')).toContain('href')
    expect(await completionLabels('<input ty')).toContain('type')
    expect(await completionLabels('<div aria-l')).toContain('aria-label')
    expect(await completionLabels('<div ')).toEqual(expect.arrayContaining([
      'id',
      'class',
      'title',
      'lang',
      'role',
    ]))

    const duplicateLabels = await completionLabels('<a HREF="/" hr')
    expect(duplicateLabels).not.toContain('href')
    expect(await completionLabels('<a href')).toContain('href')
  })

  it('offers enum values and keeps Boolean attributes bare', async () => {
    expect(await completionLabels('<a target="')).toEqual(expect.arrayContaining(['_blank', '_self']))
    expect(await completionLabels('<input type="')).toEqual(expect.arrayContaining(['text', 'email']))
    const required = (await completionResult('<input req'))?.options
      .find(option => option.label === 'required')
    expect(required).toBeDefined()
    expect(required?.apply ?? required?.label).toBe('required')

    const doubleQuoted = (await completionResult('<a target="'))?.options
      .find(option => option.label === '_blank')
    const singleQuoted = (await completionResult("<a target='"))?.options
      .find(option => option.label === '_blank')
    const unquoted = (await completionResult('<a target='))?.options
      .find(option => option.label === '_blank')
    expect(doubleQuoted?.apply).toBe('_blank"')
    expect(singleQuoted?.apply).toBe("_blank'")
    expect(unquoted?.apply).toBe('"_blank"')
  })

  it('completes common entities and explicit snippets through one source', async () => {
    expect(await completionLabels('&am')).toContain('&amp;')
    expect(await completionLabels('html5')).toContain('html5')
    const explicit = await completionLabels('', true)
    expect(explicit).toEqual(expect.arrayContaining([
      'doctype',
      'html5',
      'meta-charset',
      'link-css',
      'form',
    ]))

    const entityState = htmlState('&am')
    const entityResult = await htmlCompletionSource(new CompletionContext(entityState, 3, false))
    const amp = entityResult?.options.find(option => option.label === '&amp;')
    expect(typeof amp?.apply).toBe('string')
    const applied = entityState.update({
      changes: {
        from: entityResult?.from ?? 0,
        to: 3,
        insert: typeof amp?.apply === 'string' ? amp.apply : '',
      },
    }).state
    expect(applied.doc.toString()).toBe('&amp;')

    expect(await completionResult('<div><!-- html5')).toBeNull()
    const plainState = EditorState.create({ doc: 'html5' })
    expect(await htmlCompletionSource(new CompletionContext(plainState, 5, false))).toBeNull()
  })

  it('applies a selected page snippet as one undoable edit', async () => {
    const initial = EditorState.create({
      doc: 'html5',
      selection: EditorSelection.cursor(5),
      extensions: [
        htmlEditorLanguage.createSupport(),
        htmlEditorLanguage.createEditorExtensions(),
        indentUnit.of('  '),
        history(),
      ],
    })
    const result = await htmlCompletionSource(new CompletionContext(initial, 5, false))
    const completion = result?.options.find(option => option.label === 'html5')
    expect(result).not.toBeNull()
    expect(typeof completion?.apply).toBe('function')
    const harness = commandHarness(initial)
    if (typeof completion?.apply === 'function' && result !== null) {
      completion.apply(harness.view, completion, result.from, 5)
    }
    expect(harness.state().doc.toString()).toContain('<!doctype html>')
    expect(harness.state().doc.toString()).toContain('<body>\n  ')
    expect(undo(harness.view)).toBe(true)
    expect(harness.state().doc.toString()).toBe('html5')
  })
})

describe('HTML structural input', () => {
  it('closes ordinary tags but not void or optional-end elements', () => {
    const ordinary = htmlState('<div>')
    expect(htmlClosingEdit(ordinary, '>')).toMatchObject({
      from: 5,
      insert: '</div>',
    })
    for (const name of HTML_VOID_ELEMENTS) {
      expect(htmlClosingEdit(htmlState(`<${name}>`), '>')).toBeUndefined()
    }
    for (const name of HTML_OPTIONAL_END_ELEMENTS) {
      expect(htmlClosingEdit(htmlState(`<${name}>`), '>')).toBeUndefined()
    }
  })

  it('completes an explicit closing-tag trigger from the innermost element', () => {
    const state = htmlState('<section><div></')
    expect(htmlClosingEdit(state, '/')).toMatchObject({
      insert: 'div>',
      cursor: state.doc.length + 4,
    })
  })

  it('prioritizes the innermost element in closing-tag completion', async () => {
    const labels = await completionLabels('<section><div></')
    expect(labels[0]).toBe('div')
    expect(labels).toContain('section')
    expect(labels).not.toContain('img')
  })

  it('expands paired tags using the live two- or four-space unit', () => {
    for (const width of [2, 4]) {
      const initial = htmlState('<div></div>', 5, width)
      const harness = commandHarness(initial)
      expect(insertNewlineAndIndent(harness.view)).toBe(true)
      expect(harness.state().doc.toString()).toBe(`<div>\n${' '.repeat(width)}\n</div>`)
      expect(harness.state().selection.main.head).toBe(6 + width)
    }
  })

  it('dedents closing tags from an over-indented editing line', () => {
    for (const width of [2, 4]) {
      const before = `<div>\n${' '.repeat(width * 2)}`
      const state = htmlState(before, before.length, width)
      const next = state.update({
        changes: { from: before.length, insert: '</div>' },
        selection: EditorSelection.cursor(before.length + 6),
        userEvent: 'input.type',
      }).state
      expect(next.doc.toString()).toBe('<div>\n</div>')
    }
  })

  it('keeps HTML comment delimiters intact when editing with Enter', () => {
    const initial = '<!-- note -->'
    const harness = commandHarness(htmlState(initial, '<!-- note'.length))
    expect(insertNewlineAndIndent(harness.view)).toBe(true)
    expect(harness.state().doc.toString()).toContain('<!-- note\n')
    expect(harness.state().doc.toString()).toContain('-->')
  })

  it('uses HTML comments as one undoable edit', () => {
    const initial = htmlState('<div>content</div>', 5)
    const stateWithHistory = EditorState.create({
      doc: initial.doc,
      selection: initial.selection,
      extensions: [
        htmlEditorLanguage.createSupport(),
        htmlEditorLanguage.createEditorExtensions(),
        history(),
      ],
    })
    const harness = commandHarness(stateWithHistory)
    expect(toggleComment(harness.view)).toBe(true)
    expect(harness.state().doc.toString()).toContain('<!--')
    expect(undo(harness.view)).toBe(true)
    expect(harness.state().doc.toString()).toBe('<div>content</div>')
  })

  it('wraps a multiline selection in an HTML comment', () => {
    let state = EditorState.create({
      doc: '<p>one</p>\n<p>two</p>',
      selection: EditorSelection.range(0, 21),
      extensions: [htmlEditorLanguage.createSupport(), history()],
    })
    const view = {
      get state() { return state },
      dispatch: (spec: Transaction | TransactionSpec) => {
        state = spec instanceof Transaction ? spec.state : state.update(spec).state
      },
    } as unknown as EditorView
    expect(toggleComment(view)).toBe(true)
    expect(state.doc.toString()).toBe('<!-- <p>one</p>\n<p>two</p> -->')
    expect(undo(view)).toBe(true)
    expect(state.doc.toString()).toBe('<p>one</p>\n<p>two</p>')
  })
})
