import { indentUnit } from '@codemirror/language'
import { Compartment, EditorSelection, EditorState, Transaction, type TransactionSpec } from '@codemirror/state'
import { EditorView, keymap, type Command } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { buildEditorExtensions } from '../src/client/editor/index.js'
import { languageForFile } from '../src/client/languages/index.js'
import { newlineWithPythonIndent } from '../src/client/languages/python/features/indentation.js'

function pythonState(doc: string, width = 2, position = doc.length): EditorState {
  const language = languageForFile('main.py')
  return EditorState.create({
    doc,
    selection: EditorSelection.cursor(position),
    extensions: [
      language.support ?? [],
      language.editorExtensions,
      indentUnit.of(' '.repeat(width)),
    ],
  })
}

function runCommand(state: EditorState, command: Command): EditorState {
  let next = state
  const view = {
    get state() { return next },
    dispatch: (spec: Transaction | TransactionSpec) => {
      next = spec instanceof Transaction ? spec.state : next.update(spec).state
    },
  } as unknown as EditorView
  expect(command(view)).toBe(true)
  return next
}

function pressEnter(doc: string, width = 2, position = doc.length): EditorState {
  return runCommand(pythonState(doc, width, position), newlineWithPythonIndent)
}

function typeAtEnd(doc: string, text: string, width = 2): EditorState {
  const state = pythonState(doc, width)
  const position = state.selection.main.head
  return state.update({
    changes: { from: position, insert: text },
    selection: EditorSelection.cursor(position + text.length),
    userEvent: 'input.type',
  }).state
}

describe('Python syntax-aware indentation', () => {
  it('takes Enter precedence only in Python editors', () => {
    const enterBindings = (name: string) => {
      const state = EditorState.create({
        extensions: buildEditorExtensions({
          language: languageForFile(name),
          indentation: { useSpaces: true, indentSize: 2 },
          readOnly: false,
          readOnlyCompartment: new Compartment(),
          indentationCompartment: new Compartment(),
          onUpdate: () => undefined,
        }),
      })
      return state.facet(keymap).flat().filter(binding => binding.key === 'Enter')
    }

    const pythonSyntaxEnterCount = enterBindings('main.py')
      .filter(binding => binding.run === newlineWithPythonIndent).length
    const genericSyntaxEnterCount = enterBindings('data.json')
      .filter(binding => binding.run === newlineWithPythonIndent).length
    expect(pythonSyntaxEnterCount).toBe(genericSyntaxEnterCount + 1)
  })

  it.each([
    'def calculate():',
    'class User:',
    'if enabled:',
    'for item in items:',
    'while ready:',
    'try:',
    'with open(path) as file:',
    'match value:',
  ])('indents after the block header %s', (header) => {
    expect(pressEnter(header, 2).doc.toString()).toBe(`${header}\n  `)
    expect(pressEnter(header, 4).doc.toString()).toBe(`${header}\n    `)
  })

  it('respects both widths in nested and incomplete syntax', () => {
    expect(pressEnter('if outer:\n  if inner:', 2).doc.toString())
      .toBe('if outer:\n  if inner:\n    ')
    expect(pressEnter('if outer:\n    if inner:', 4).doc.toString())
      .toBe('if outer:\n    if inner:\n        ')
    expect(pressEnter('if (', 2).doc.toString()).toBe('if (\n  ')
  })

  it.each([
    'person = {"name": "Alice"}',
    'segment = values[1:5]',
    'name: str = "Alice"',
    'message = "https://example.com"',
    '# note: not a block header',
    'callback = lambda value: value',
  ])('does not treat an expression or text colon as a block in %s', (line) => {
    expect(pressEnter(line).doc.toString()).toBe(`${line}\n`)
  })

  it('continues containers and aligns their closing delimiters', () => {
    for (const opener of ['values = [', 'mapping = {', 'items = (', 'result = call(']) {
      expect(pressEnter(opener).doc.toString()).toBe(`${opener}\n  `)
      expect(pressEnter(opener, 4).doc.toString()).toBe(`${opener}\n    `)
    }
    expect(pressEnter('values = [\n  first,').doc.toString()).toBe('values = [\n  first,\n  ')
    expect(typeAtEnd('values = [\n  first,\n    ', ']').doc.toString())
      .toBe('values = [\n  first,\n]')
  })

  it('aligns branch clauses only when their trigger syntax is typed', () => {
    expect(typeAtEnd('if ready:\n  run()\n  else', ':').doc.toString())
      .toBe('if ready:\n  run()\nelse:')
    expect(typeAtEnd('try:\n  run()\n  except', ' ').doc.toString())
      .toBe('try:\n  run()\nexcept ')
    expect(typeAtEnd('if ready:\n  run()\n  elif', ' ').doc.toString())
      .toBe('if ready:\n  run()\nelif ')
    expect(typeAtEnd('try:\n  run()\n  finally', ':').doc.toString())
      .toBe('try:\n  run()\nfinally:')
    expect(typeAtEnd('match value:\n    case', ' ').doc.toString())
      .toBe('match value:\n  case ')
    expect(typeAtEnd('if ready:\n    run()\n    else', ':', 4).doc.toString())
      .toBe('if ready:\n    run()\nelse:')
  })

  it.each(['"""', 'r"""', 'f"""'])('preserves indentation inside %s strings', (prefix) => {
    const line = `  text = ${prefix}line:`
    expect(pressEnter(line).doc.toString()).toBe(`${line}\n  `)
  })

  it.each([
    ['{}', '{\n  \n}'],
    ['[]', '[\n  \n]'],
    ['()', '(\n  \n)'],
  ])('retains empty-delimiter expansion for %s', (pair, expected) => {
    expect(pressEnter(pair, 2, 1).doc.toString()).toBe(expected)
  })
})
