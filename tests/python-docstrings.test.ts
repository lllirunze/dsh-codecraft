import { insertBracket, nextSnippetField } from '@codemirror/autocomplete'
import { history, undo } from '@codemirror/commands'
import { indentUnit } from '@codemirror/language'
import { EditorSelection, EditorState, Transaction, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { languageForFile } from '../src/client/languages/index.js'
import { bracketExtensions } from '../src/client/editor/extensions/brackets.js'
import { insertGoogleStyleDocstring } from '../src/client/languages/python/features/docstrings.js'

interface CommandHarness {
  readonly view: EditorView
  readonly state: EditorState
}

function harness(doc: string, width = 2, marker = '""""""'): CommandHarness {
  const pair = doc.lastIndexOf(marker)
  const position = pair < 0 ? doc.length : pair + 3
  let state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(position),
    extensions: [
      languageForFile('main.py').support ?? [],
      indentUnit.of(' '.repeat(width)),
      history(),
    ],
  })
  const view = {
    get state() { return state },
    dispatch: (spec: Transaction | TransactionSpec) => {
      state = spec instanceof Transaction ? spec.state : state.update(spec).state
    },
  } as unknown as EditorView
  return {
    view,
    get state() { return state },
  }
}

function generate(doc: string, width = 2): CommandHarness {
  const result = harness(doc, width)
  expect(insertGoogleStyleDocstring(result.view)).toBe(true)
  return result
}

describe('Google Style Docstring generation', () => {
  it('generates after the editor pairs three typed double quotes', () => {
    const language = languageForFile('main.py')
    let state = EditorState.create({
      doc: 'def ready():\n  ',
      selection: EditorSelection.cursor('def ready():\n  '.length),
      extensions: [
        language.support ?? [],
        ...bracketExtensions(language),
        indentUnit.of('  '),
        history(),
      ],
    })
    for (let count = 0; count < 3; count += 1) {
      const transaction = insertBracket(state, '"')
      expect(transaction).not.toBeNull()
      if (transaction !== null) state = transaction.state
    }
    expect(state.doc.toString()).toBe('def ready():\n  """"""')
    expect(state.selection.main.head).toBe(state.doc.length - 3)
    const view = {
      get state() { return state },
      dispatch: (spec: Transaction | TransactionSpec) => {
        state = spec instanceof Transaction ? spec.state : state.update(spec).state
      },
    } as unknown as EditorView
    expect(insertGoogleStyleDocstring(view)).toBe(true)
    expect(state.doc.toString()).toBe('def ready():\n  """Summary.\n  """')
  })

  it('generates ordered Args and Returns placeholders at two spaces', () => {
    const initial = 'def create_user(name: str, age: int = 0) -> bool:\n  """"""'
    const result = generate(initial)
    expect(result.state.doc.toString()).toBe([
      'def create_user(name: str, age: int = 0) -> bool:',
      '  """Summary.',
      '  ',
      '  Args:',
      '    name: Description.',
      '    age: Description.',
      '  ',
      '  Returns:',
      '    bool: Description.',
      '  """',
    ].join('\n'))
    expect(result.state.sliceDoc(
      result.state.selection.main.from,
      result.state.selection.main.to,
    )).toBe('Summary.')
    expect(nextSnippetField(result.view)).toBe(true)
    expect(result.state.sliceDoc(
      result.state.selection.main.from,
      result.state.selection.main.to,
    )).toBe('Description.')
  })

  it('respects four spaces and restores the quote pair with one Undo', () => {
    const initial = 'async def load(path: str) -> bytes:\n    """"""'
    const result = generate(initial, 4)
    expect(result.state.doc.toString()).toContain('    path: Description.')
    expect(result.state.doc.toString()).toContain('        bytes: Description.')
    expect(undo(result.view)).toBe(true)
    expect(result.state.doc.toString()).toBe(initial)
  })

  it('handles parameter kinds without documenting separators or defaults', () => {
    const result = generate([
      "def render(a, /, b: str = 'x', *args: int, c: bool, **kwargs: object):",
      '  """"""',
    ].join('\n'))
    const text = result.state.doc.toString()
    expect(text).toContain('    a: Description.')
    expect(text).toContain('    b: Description.')
    expect(text).toContain('    *args: Description.')
    expect(text).toContain('    c: Description.')
    expect(text).toContain('    **kwargs: Description.')
    expect(text).not.toContain('/: Description.')
    expect(text).not.toContain("'x': Description.")
  })

  it('omits self and classmethod cls while retaining ordinary parameters', () => {
    const method = generate('class User:\n  def rename(self, name: str) -> None:\n    """"""', 4)
    expect(method.state.doc.toString()).not.toContain('self: Description.')
    expect(method.state.doc.toString()).toContain('        name: Description.')
    expect(method.state.doc.toString()).not.toContain('Returns:')

    const classMethod = generate([
      'class User:',
      '  @classmethod',
      '  def create(cls, name: str):',
      '    """"""',
    ].join('\n'), 4)
    expect(classMethod.state.doc.toString()).not.toContain('cls: Description.')
    expect(classMethod.state.doc.toString()).toContain('        name: Description.')

    const staticMethod = generate([
      'class User:',
      '  @staticmethod',
      '  def unusual(self, name: str):',
      '    """"""',
    ].join('\n'), 4)
    expect(staticMethod.state.doc.toString()).toContain('        self: Description.')
    expect(staticMethod.state.doc.toString()).toContain('        name: Description.')
  })

  it('uses Yields for a reliably identified generator and does not invent class sections', () => {
    const generator = generate([
      'def values(limit: int) -> Iterator[int]:',
      '  """"""',
      '  for value in range(limit):',
      '    yield value',
    ].join('\n'))
    expect(generator.state.doc.toString()).toContain('  Yields:\n    Iterator[int]: Description.')
    expect(generator.state.doc.toString()).not.toContain('Returns:')

    const classDocstring = generate('class User:\n  """"""')
    expect(classDocstring.state.doc.toString()).toBe('class User:\n  """Summary.\n  """')
  })

  it('allows blank and comment-only lines before the first body statement', () => {
    const result = generate('def documented(value):\n\n  # explanation\n  """"""')
    expect(result.state.doc.toString()).toContain('  Args:\n    value: Description.')
  })

  it.each([
    ['module scope', '""""""'],
    ['assignment', 'text = """"""'],
    ['argument', 'consume("""""")'],
    ['nested conditional', 'def f():\n  if ready:\n    """"""'],
    ['later statement', 'def f():\n  pass\n  """"""'],
    ['existing Docstring', 'def f():\n  """Existing."""\n  """"""'],
    ['adjacent string expression', 'def f():\n  "prefix" """"""'],
    ['trailing expression', 'def f():\n  """""" if ready else "fallback"'],
    ['raw string', 'def f():\n  r""""""'],
    ['f-string', 'def f():\n  f""""""'],
  ])('preserves ordinary triple-quote behavior at %s', (_name, doc) => {
    expect(insertGoogleStyleDocstring(harness(doc).view)).toBe(false)
  })

  it('does not trigger for triple single quotes', () => {
    const result = harness("def f():\n  ''''''", 2, "''''''")
    expect(insertGoogleStyleDocstring(result.view)).toBe(false)
  })
})
