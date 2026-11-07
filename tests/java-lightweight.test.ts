import { CompletionContext } from '@codemirror/autocomplete'
import { history, toggleComment, undo } from '@codemirror/commands'
import { java } from '@codemirror/lang-java'
import { foldable, indentUnit, syntaxTree } from '@codemirror/language'
import { EditorSelection, EditorState, Transaction, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { closeBracketTokens } from '../src/client/editor/extensions/brackets.js'
import { javaCompletionSource } from '../src/client/languages/java/features/completion.js'
import {
  parseJavaDeclaration,
  insertStructuredJavadoc,
  structuredJavadoc,
} from '../src/client/languages/java/features/javadoc.js'

async function completions(doc: string, explicit = false): Promise<string[]> {
  const state = EditorState.create({ doc, extensions: [java()] })
  const result = await javaCompletionSource(new CompletionContext(state, doc.length, explicit))
  return result?.options.map(option => option.label) ?? []
}

function javadocHarness(doc: string): { view: EditorView, state: () => EditorState } {
  const marker = doc.indexOf('/**')
  let state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(marker + 3),
    extensions: [java(), indentUnit.of('  '), history()],
  })
  const view = {
    get state() { return state },
    dispatch: (spec: Transaction | TransactionSpec) => {
      state = spec instanceof Transaction ? spec.state : state.update(spec).state
    },
  } as unknown as EditorView
  return { view, state: () => state }
}

describe('lightweight Java completion', () => {
  it('keeps Java parsing, folding, comments, and pairing local to CodeMirror', () => {
    const doc = 'public class Main {\n  public void run() {\n  }\n}'
    let state = EditorState.create({
      doc,
      selection: EditorSelection.cursor(doc.indexOf('public void')),
      extensions: [java()],
    })
    const view = {
      get state() { return state },
      dispatch: (spec: Transaction | TransactionSpec) => {
        state = spec instanceof Transaction ? spec.state : state.update(spec).state
      },
    } as unknown as EditorView
    expect(syntaxTree(state).length).toBe(doc.length)
    expect(foldable(state, 0, state.doc.line(1).to)).toBeDefined()
    expect(closeBracketTokens('java')).toEqual(['(', '[', '{', "'", '"'])
    expect(toggleComment(view)).toBe(true)
    expect(state.doc.line(2).text.trimStart()).toMatch(/^\/\//u)
  })

  it('offers keywords, common types, snippets, and current-file identifiers', async () => {
    const labels = await completions('String customerName = "Ryan";\ncust')
    expect(labels).toContain('public')
    expect(labels).toContain('ArrayList')
    expect(labels).toContain('psvm')
    expect(labels).toContain('javadoc')
    expect(labels).toContain('customerName')
  })

  it('does not offer code candidates inside strings or comments', async () => {
    expect(await completions('String value = "pub')).toEqual([])
    expect(await completions('// pub')).toEqual([])
  })

  it('expands snippets with editable fields in one undoable edit', async () => {
    let state = EditorState.create({
      doc: 'psvm',
      selection: EditorSelection.cursor(4),
      extensions: [java(), indentUnit.of('  '), history()],
    })
    const view = {
      get state() { return state },
      dispatch: (spec: Transaction | TransactionSpec) => {
        state = spec instanceof Transaction ? spec.state : state.update(spec).state
      },
    } as unknown as EditorView
    const result = await javaCompletionSource(new CompletionContext(state, 4, false))
    const completion = result?.options.find(option => option.label === 'psvm')
    expect(completion).toBeDefined()
    expect(typeof completion?.apply).toBe('function')
    if (typeof completion?.apply === 'function') completion.apply(view, completion, 0, 4)
    expect(state.doc.toString()).toBe('public static void main(String[] args) {\n  \n}')
    expect(state.doc.lineAt(state.selection.main.head).number).toBe(2)
    expect(undo(view)).toBe(true)
    expect(state.doc.toString()).toBe('psvm')
  })
})

describe('CodeCraft Structured Javadoc', () => {
  it('preserves generic, array, varargs, return, and throws types', () => {
    const declaration = parseJavaDeclaration(`
      @Deprecated
      public <T> Map<String, List<T>> findById(
          Long id,
          Class<T> clazz,
          String[] names,
          Object... values
      ) throws SQLException, IOException {
    `)
    expect(declaration).toEqual({
      kind: 'method',
      name: 'findById',
      typeParameters: ['T'],
      parameters: [
        { name: 'id', type: 'Long' },
        { name: 'clazz', type: 'Class<T>' },
        { name: 'names', type: 'String[]' },
        { name: 'values', type: 'Object...' },
      ],
      returnType: 'Map<String, List<T>>',
      throws: ['SQLException', 'IOException'],
    })
    expect(structuredJavadoc(declaration!)).toBe(`/**
 * findById
 *
 * @param <T> type parameter
 * @param id Long
 * @param clazz Class<T>
 * @param names String[]
 * @param values Object...
 * @return Map<String, List<T>>
 * @throws SQLException
 * @throws IOException
 */`)
  })

  it('omits return tags for void methods and constructors', () => {
    const method = parseJavaDeclaration('public void deleteUser(Long userId) {')
    const constructor = parseJavaDeclaration('public UserService(String name, Integer age) {')
    expect(method?.kind).toBe('method')
    expect(structuredJavadoc(method!)).not.toContain('@return')
    expect(constructor).toMatchObject({ kind: 'constructor', name: 'UserService' })
    expect(structuredJavadoc(constructor!)).not.toContain('@return')
  })

  it('documents generic types and safely rejects incomplete declarations', () => {
    expect(parseJavaDeclaration('public class Result<T> {')).toEqual({
      kind: 'type',
      name: 'Result',
      typeParameters: ['T'],
      parameters: [],
      throws: [],
    })
    expect(parseJavaDeclaration('public List<String> broken(')).toBeUndefined()
  })

  it('expands an adjacent trigger as one undoable transaction', () => {
    const initial = [
      'class UserService {',
      '  /**',
      '  public List<String> names(Long userId) throws IOException {',
      '  }',
      '}',
    ].join('\n')
    const result = javadocHarness(initial)
    expect(insertStructuredJavadoc(result.view)).toBe(true)
    expect(result.state().doc.toString()).toContain([
      '  /**',
      '   * names',
      '   *',
      '   * @param userId Long',
      '   * @return List<String>',
      '   * @throws IOException',
      '   */',
    ].join('\n'))
    expect(undo(result.view)).toBe(true)
    expect(result.state().doc.toString()).toBe(initial)
  })

  it('uses an editable basic template when the adjacent declaration is incomplete', () => {
    const result = javadocHarness('/**\npublic List<String> broken(')
    expect(insertStructuredJavadoc(result.view)).toBe(true)
    expect(result.state().doc.toString()).toBe('/**\n * Description.\n */\npublic List<String> broken(')
    expect(result.state().sliceDoc(
      result.state().selection.main.from,
      result.state().selection.main.to,
    )).toBe('Description.')
  })

  it('does not generate a second block above existing Javadoc', () => {
    const initial = '/**\n/** Existing. */\npublic void ready() {'
    const result = javadocHarness(initial)
    expect(insertStructuredJavadoc(result.view)).toBe(false)
    expect(result.state().doc.toString()).toBe(initial)
  })
})
