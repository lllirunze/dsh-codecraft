import { describe, expect, it } from 'vitest'
import { assessDiskChange } from '../src/client/document/conflicts.js'
import { reconcileSaveSuccess } from '../src/client/document/save.js'
import { initialDocumentState } from '../src/client/document/state.js'
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

describe('initialDocumentState', () => {
  it('always opens the authoritative disk snapshot clean', () => {
    expect(initialDocumentState(snapshot)).toMatchObject({
      text: 'disk\n',
      savedText: 'disk\n',
      baseVersion: 'disk-v2',
      dirty: false,
      conflict: null,
    })
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
