import { describe, expect, it } from 'vitest'
import { deleteBracketPair, insertBracket } from '@codemirror/autocomplete'
import { json } from '@codemirror/lang-json'
import { EditorSelection, EditorState } from '@codemirror/state'
import { differsFromSavedText } from '../src/client/document/state.js'
import { bracketExtensions, closeBracketTokens } from '../src/client/editor/extensions/brackets.js'

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
