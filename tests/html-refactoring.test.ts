import { history, undo } from '@codemirror/commands'
import { ensureSyntaxTree } from '@codemirror/language'
import { EditorSelection, EditorState, type Transaction, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { htmlEditorLanguage } from '../src/client/languages/html/index.js'
import {
  canApplyHtmlRefactor,
  planHtmlIdRename,
  planHtmlTagRename,
  type HtmlRefactorPlan,
} from '../src/client/languages/html/features/refactoring.js'

function state(doc: string, position = 0): EditorState {
  const created = EditorState.create({
    doc,
    selection: EditorSelection.cursor(position),
    extensions: [htmlEditorLanguage.createSupport(), history()],
  })
  if (ensureSyntaxTree(created, created.doc.length, 1_000) === null) {
    throw new Error('HTML test document did not finish parsing')
  }
  return created
}

function planOf(result: ReturnType<typeof planHtmlTagRename>): HtmlRefactorPlan {
  if ('error' in result) throw new Error(result.error)
  return result.plan
}

function apply(stateValue: EditorState, plan: HtmlRefactorPlan): EditorState {
  return stateValue.update({ changes: plan.changes, userEvent: 'input.rename' }).state
}

function harness(stateValue: EditorState): { view: EditorView, read: () => EditorState } {
  let current = stateValue
  return {
    view: {
      get state() { return current },
      dispatch(spec: Transaction | TransactionSpec) {
        current = spec instanceof Object && 'state' in spec
          ? (spec as Transaction).state
          : current.update(spec as TransactionSpec).state
      },
    } as EditorView,
    read: () => current,
  }
}

describe('HTML safe refactoring', () => {
  it('plans only the paired tag names and applies them in one undoable transaction', () => {
    const doc = '<section class="card"><h2>Title</h2></section>'
    const initial = state(doc, 2)
    const plan = planOf(planHtmlTagRename(initial, 2, 'article'))
    expect(plan.changes.map(change => change.before)).toEqual(['section', 'section'])
    expect(apply(initial, plan).doc.toString()).toBe('<article class="card"><h2>Title</h2></article>')

    const editor = harness(initial)
    editor.view.dispatch({ changes: plan.changes, userEvent: 'input.rename' })
    expect(undo(editor.view)).toBe(true)
    expect(editor.read().doc.toString()).toBe(doc)
  })

  it('refuses self-closing, void, mismatched, absent, and invalid tag targets', () => {
    expect(planHtmlTagRename(state('<section />', 2), 2, 'article')).toEqual({ error: 'unsafe-tag' })
    expect(planHtmlTagRename(state('<img src="x">', 2), 2, 'article')).toEqual({ error: 'unsafe-tag' })
    expect(planHtmlTagRename(state('<div></span>', 2), 2, 'article')).toEqual({ error: 'unsafe-tag' })
    expect(planHtmlTagRename(state('plain text', 2), 2, 'article')).toEqual({ error: 'not-tag' })
    expect(planHtmlTagRename(state('<section></section>', 2), 2, 'img')).toEqual({ error: 'invalid-name' })
  })

  it('renames one unique id and exact same-document href fragments only', () => {
    const doc = '<div id="profile"></div><a href="#profile">Profile</a><style>#profile{}</style><script>"#profile"</script>'
    const initial = state(doc, doc.indexOf('profile') + 2)
    const result = planHtmlIdRename(initial, doc.indexOf('profile') + 2, 'account')
    if ('error' in result) throw new Error(result.error)
    expect(result.plan.changes).toHaveLength(2)
    const changed = apply(initial, result.plan).doc.toString()
    expect(changed).toContain('id="account"')
    expect(changed).toContain('href="#account"')
    expect(changed).toContain('#profile{}')
    expect(changed).toContain('"#profile"')
  })

  it('refuses duplicate definitions, target collisions, invalid names, and non-id positions', () => {
    const duplicate = '<div id="x"></div><span id="x"></span>'
    expect(planHtmlIdRename(state(duplicate), duplicate.indexOf('"x"') + 1, 'y')).toEqual({ error: 'duplicate-id' })
    const conflict = '<div id="x"></div><span id="y"></span>'
    expect(planHtmlIdRename(state(conflict), conflict.indexOf('"x"') + 1, 'y')).toEqual({ error: 'id-conflict' })
    expect(planHtmlIdRename(state('<div id="x"></div>'), 9, 'bad name')).toEqual({ error: 'invalid-name' })
    expect(planHtmlIdRename(state('<div class="x"></div>'), 13, 'y')).toEqual({ error: 'not-id' })
  })

  it('retains immutable document identity so a preview can reject later edits', () => {
    const initial = state('<div id="x"></div>', 10)
    const result = planHtmlIdRename(initial, 10, 'y')
    if ('error' in result) throw new Error(result.error)
    const later = initial.update({ changes: { from: initial.doc.length, insert: ' ' } }).state
    expect(result.plan.document).toBe(initial.doc)
    expect(result.plan.document).not.toBe(later.doc)
    expect(canApplyHtmlRefactor(result.plan, initial, {
      active: true,
      readOnly: false,
      conflicted: false,
      saving: false,
    })).toBe(true)
    expect(canApplyHtmlRefactor(result.plan, later, {
      active: true,
      readOnly: false,
      conflicted: false,
      saving: false,
    })).toBe(false)
    for (const blocked of ['readOnly', 'conflicted', 'saving'] as const) {
      expect(canApplyHtmlRefactor(result.plan, initial, {
        active: true,
        readOnly: false,
        conflicted: false,
        saving: false,
        [blocked]: true,
      })).toBe(false)
    }
  })
})
