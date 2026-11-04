import { describe, expect, it } from 'vitest'
import { deleteBracketPair, insertBracket } from '@codemirror/autocomplete'
import { history, undo } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import {
  Compartment,
  EditorSelection,
  EditorState,
  Transaction,
  type TransactionSpec,
} from '@codemirror/state'
import { EditorView, type Command } from '@codemirror/view'
import { differsFromSavedText } from '../src/client/document/state.js'
import { bracketExtensions, closeBracketTokens } from '../src/client/editor/extensions/brackets.js'
import {
  alignedClosingDelimiter,
  indentLessByBoundary,
  indentMoreByBoundary,
  indentationExtensions,
  newlineWithGenericIndent,
  nextIndentBoundary,
  previousIndentBoundary,
} from '../src/client/editor/extensions/indentation.js'

function bracketState(doc = '', anchor = 0, head = anchor): EditorState {
  return EditorState.create({
    doc,
    selection: EditorSelection.range(anchor, head),
    extensions: bracketExtensions({ id: 'plain' }),
  })
}

function typeBracket(state: EditorState, value: string): EditorState {
  const transaction = insertBracket(state, value)
  if (transaction === null) return state.update({ changes: { from: state.selection.main.from, to: state.selection.main.to, insert: value } }).state
  return transaction.state
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

describe('differsFromSavedText', () => {
  it('keeps edits made while an older snapshot is being saved dirty', () => {
    const submittedSnapshot = 'const value = 2\n'
    const liveTextAfterAnotherEdit = 'const value = 3\n'

    expect(differsFromSavedText(liveTextAfterAnotherEdit, submittedSnapshot)).toBe(true)
  })

  it('marks the editor clean only when it still matches the saved snapshot', () => {
    const submittedSnapshot = 'const value = 2\n'

    expect(differsFromSavedText(submittedSnapshot, submittedSnapshot)).toBe(false)
  })
})

describe('bracketExtensions', () => {
  it.each([
    ['(', '()'],
    ['[', '[]'],
    ['{', '{}'],
    ["'", "''"],
    ['"', '""'],
  ])('pairs %s and leaves the cursor inside', (typed, expected) => {
    const state = typeBracket(bracketState(), typed)

    expect(state.doc.toString()).toBe(expected)
    expect(state.selection.main.head).toBe(1)
  })

  it('skips an automatically inserted closer and deletes an empty pair together', () => {
    const paired = typeBracket(bracketState(), '(')
    const skipped = typeBracket(paired, ')')
    expect(skipped.doc.toString()).toBe('()')
    expect(skipped.selection.main.head).toBe(2)

    let deleted: EditorState | undefined
    expect(deleteBracketPair({
      state: paired,
      dispatch: transaction => { deleted = transaction.state },
    })).toBe(true)
    expect(deleted?.doc.toString()).toBe('')
  })

  it('wraps selected text and supports nested pairs', () => {
    const wrapped = typeBracket(bracketState('hello', 0, 5), '"')
    expect(wrapped.doc.toString()).toBe('"hello"')

    const outer = typeBracket(bracketState(), '(')
    const inner = typeBracket(outer, '[')
    expect(inner.doc.toString()).toBe('([])')
  })

  it('does not treat angle brackets as generic pairs', () => {
    expect(insertBracket(bracketState(), '<')).toBeNull()
    expect(closeBracketTokens('plain')).not.toContain('<')
  })

  it('keeps P0 pairs when a language supplies a narrower bracket list', () => {
    for (const typed of ['(', "'"]) {
      const state = EditorState.create({
        extensions: [...bracketExtensions({ id: 'json' }), json()],
      })
      expect(typeBracket(state, typed).doc.toString()).toBe(`${typed}${typed === '(' ? ')' : typed}`)
    }
  })

  it('adds backticks and Python triple quotes only in their language contexts', () => {
    expect(closeBracketTokens('typescript')).toContain('`')
    expect(closeBracketTokens('markdown')).toContain('`')
    expect(closeBracketTokens('plain')).not.toContain('`')
    expect(closeBracketTokens('python')).toEqual(expect.arrayContaining(["'''", '"""']))
    expect(closeBracketTokens('javascript')).not.toContain("'''")
  })
})

describe('indentationExtensions', () => {
  it('moves aligned and irregular indentation across strict boundaries', () => {
    expect([0, 1, 2, 3, 4, 5].map(value => nextIndentBoundary(value, 2)))
      .toEqual([2, 2, 4, 4, 6, 6])
    expect([0, 1, 2, 3, 4, 5].map(value => previousIndentBoundary(value, 2)))
      .toEqual([0, 0, 0, 2, 2, 4])
    expect([0, 1, 3, 4, 5, 7, 8].map(value => nextIndentBoundary(value, 4)))
      .toEqual([4, 4, 4, 8, 8, 8, 12])
    expect([0, 1, 3, 4, 5, 7, 8].map(value => previousIndentBoundary(value, 4)))
      .toEqual([0, 0, 0, 0, 4, 4, 4])
  })

  it('aligns a single line and inserts spaces inside code content', () => {
    const irregular = EditorState.create({
      doc: ' value',
      selection: EditorSelection.cursor(1),
    })
    const aligned = runCommand(irregular, indentMoreByBoundary(2))
    expect(aligned.doc.toString()).toBe('  value')
    expect(aligned.selection.main.head).toBe(2)

    const inCode = EditorState.create({
      doc: 'value',
      selection: EditorSelection.cursor(2),
    })
    const inserted = runCommand(inCode, indentMoreByBoundary(2))
    expect(inserted.doc.toString()).toBe('va  lue')
    expect(inserted.selection.main.head).toBe(4)
  })

  it('indents an active blank line but leaves blank lines inside a selection empty', () => {
    const blank = EditorState.create({ doc: '', selection: EditorSelection.cursor(0) })
    const indentedBlank = runCommand(blank, indentMoreByBoundary(4))
    expect(indentedBlank.doc.toString()).toBe('    ')
    expect(runCommand(indentedBlank, indentLessByBoundary(4)).doc.toString()).toBe('')

    const selected = EditorState.create({
      doc: 'one\n\ntwo',
      selection: EditorSelection.range(0, 8),
    })
    expect(runCommand(selected, indentMoreByBoundary(2)).doc.toString()).toBe('  one\n\n  two')
  })

  it('indents selected lines independently without touching a column-zero endpoint or blank line', () => {
    const doc = ' one\n  two\n   three\n\nuntouched'
    const endpoint = doc.indexOf('untouched')
    const state = EditorState.create({
      doc,
      selection: EditorSelection.range(0, endpoint),
      extensions: history(),
    })
    const indented = runCommand(state, indentMoreByBoundary(2))
    expect(indented.doc.toString()).toBe('  one\n    two\n    three\n\nuntouched')
    expect(indented.selection.main.to).toBe(indented.doc.toString().indexOf('untouched'))

    const restored = runCommand(indented, undo)
    expect(restored.doc.toString()).toBe(doc)

    const backward = EditorState.create({
      doc: 'one\n two',
      selection: EditorSelection.range(8, 0),
    })
    const backwardIndented = runCommand(backward, indentMoreByBoundary(2))
    expect(backwardIndented.doc.toString()).toBe('  one\n  two')
    expect(backwardIndented.selection.main.anchor).toBeGreaterThan(backwardIndented.selection.main.head)
  })

  it('outdents each selected line to the previous boundary', () => {
    const state = EditorState.create({
      doc: ' one\n  two\n   three',
      selection: EditorSelection.range(0, 19),
    })
    const outdented = runCommand(state, indentLessByBoundary(2))
    expect(outdented.doc.toString()).toBe('one\ntwo\n  three')
  })

  it.each([
    ['{}', '{\n  \n}'],
    ['[]', '[\n  \n]'],
    ['()', '(\n  \n)'],
  ])('expands an empty %s pair on Enter', (pair, expected) => {
    const state = EditorState.create({
      doc: pair,
      selection: EditorSelection.cursor(1),
    })
    const expanded = runCommand(state, newlineWithGenericIndent(2))
    expect(expanded.doc.toString()).toBe(expected)
    expect(expanded.selection.main.head).toBe(4)
  })

  it('inherits indentation and adds one unit after an opening delimiter', () => {
    const inherited = EditorState.create({
      doc: '  firstLine();',
      selection: EditorSelection.cursor(14),
    })
    expect(runCommand(inherited, newlineWithGenericIndent(2)).doc.toString())
      .toBe('  firstLine();\n  ')

    const opened = EditorState.create({
      doc: '  if (ready) {',
      selection: EditorSelection.cursor(14),
    })
    expect(runCommand(opened, newlineWithGenericIndent(2)).doc.toString())
      .toBe('  if (ready) {\n    ')
  })

  it('aligns an existing closing delimiter with its opener', () => {
    const state = EditorState.create({
      doc: '  {\n      }',
      selection: EditorSelection.cursor(10),
      extensions: indentationExtensions({ useSpaces: true, indentSize: 2 }),
    })
    const spec = alignedClosingDelimiter(state, 10, '}')
    expect(spec).toBeDefined()
    expect(state.update(spec ?? {}).state.doc.toString()).toBe('  {\n  }')
  })

  it('reconfigures open editor indentation without changing its text', () => {
    const compartment = new Compartment()
    const state = EditorState.create({
      doc: '\tlegacy\n  current',
      extensions: compartment.of(indentationExtensions({ useSpaces: true, indentSize: 2 })),
    })
    const reconfigured = state.update({
      effects: compartment.reconfigure(indentationExtensions({ useSpaces: true, indentSize: 4 })),
    }).state
    expect(reconfigured.tabSize).toBe(4)
    expect(reconfigured.doc.toString()).toBe('\tlegacy\n  current')
  })
})
