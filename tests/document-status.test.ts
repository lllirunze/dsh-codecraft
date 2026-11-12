import { describe, expect, it } from 'vitest'
import { editorStatusKey } from '../src/client/document/status.js'

describe('editorStatusKey', () => {
  it('keeps normal edits and successful saves visually in sync', () => {
    expect(editorStatusKey({
      writable: true,
      conflicted: false,
      external: false,
      saveFailed: false,
    })).toBe('status.synced')
  })

  it('surfaces read-only, conflict, and save-failure exceptions', () => {
    expect(editorStatusKey({
      writable: false,
      conflicted: false,
      external: false,
      saveFailed: false,
    })).toBe('status.readOnly')
    expect(editorStatusKey({
      writable: true,
      conflicted: true,
      external: false,
      saveFailed: false,
    })).toBe('status.external')
    expect(editorStatusKey({
      writable: true,
      conflicted: false,
      external: false,
      saveFailed: true,
    })).toBe('status.saveError')
  })
})
