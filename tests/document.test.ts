import { describe, expect, it } from 'vitest'
import { assessDiskChange } from '../src/client/document/conflicts.js'
import { reconcileSaveSuccess } from '../src/client/document/save.js'
import { initialDocumentState } from '../src/client/document/state.js'
import type { Draft } from '../src/client/drafts.js'
import type { TextFileSnapshot } from '../src/protocol.js'

const snapshot: TextFileSnapshot = {
  kind: 'text',
  absolutePath: '/workspace/a.ts',
  version: 'disk-v2',
  content: 'disk\n',
  newline: 'lf',
  bom: false,
  size: 5,
  mode: 0o644,
  writable: true,
  indent: { kind: 'spaces', size: 2 },
}

function draft(overrides: Partial<Draft> = {}): Draft {
  return {
    content: 'draft\n',
    baseVersion: 'disk-v1',
    newline: 'lf',
    bom: false,
    savedAt: 1,
    ...overrides,
  }
}

describe('initialDocumentState', () => {
  it('opens the disk snapshot clean when no distinct draft exists', () => {
    expect(initialDocumentState(snapshot)).toMatchObject({
      text: 'disk\n',
      savedText: 'disk\n',
      baseVersion: 'disk-v2',
      dirty: false,
      conflict: null,
    })
    expect(initialDocumentState(snapshot, draft({ content: 'disk\n' })).dirty).toBe(false)
  })

  it('restores a draft and distinguishes matching and stale baselines', () => {
    expect(initialDocumentState(snapshot, draft({ baseVersion: 'disk-v2' }))).toMatchObject({
      text: 'draft\n',
      dirty: true,
      conflict: 'restored',
    })
    expect(initialDocumentState(snapshot, draft())).toMatchObject({ dirty: true, conflict: 'external' })
  })
})

describe('assessDiskChange', () => {
  it('reloads clean documents and protects dirty documents', () => {
    expect(assessDiskChange({ exists: true, version: 'v2', baseVersion: 'v1', dirty: false })).toBe('reload')
    expect(assessDiskChange({ exists: true, version: 'v2', baseVersion: 'v1', dirty: true })).toBe('external')
    expect(assessDiskChange({ exists: false, baseVersion: 'v1', dirty: true })).toBe('deleted')
    expect(assessDiskChange({ exists: true, version: 'v1', baseVersion: 'v1', dirty: true })).toBe('none')
  })
})

describe('reconcileSaveSuccess', () => {
  it('keeps edits made while saving dirty against the new version', () => {
    expect(reconcileSaveSuccess('third\n', 'second\n', {
      absolutePath: '/workspace/a.ts',
      version: 'disk-v3',
      size: 7,
    })).toEqual({ savedText: 'second\n', baseVersion: 'disk-v3', dirty: true })
  })

  it('marks an unchanged submitted snapshot clean', () => {
    expect(reconcileSaveSuccess('second\n', 'second\n', {
      absolutePath: '/workspace/a.ts',
      version: 'disk-v3',
      size: 7,
    }).dirty).toBe(false)
  })
})
