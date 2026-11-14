import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  dirtyDocumentsUnder,
  documentsUnder,
  flushDocuments,
  registerOpenDocument,
  relocateDocuments,
  type OpenDocumentHandle,
} from '../src/client/document/registry.js'
import { absoluteOf, baseName, isInside, joinRelative, parentOf, relativeOf } from '../src/client/workspace/paths.js'

const disposers: Array<() => void> = []

afterEach(() => {
  while (disposers.length > 0) disposers.pop()?.()
})

function handle(path: string, dirty = false, saveResult = true): OpenDocumentHandle & {
  save: ReturnType<typeof vi.fn>
  relocate: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
} {
  const document = {
    sessionId: 's1',
    path,
    address: `dsh-resource://file/session/s1/${path}`,
    tabId: path,
    isDirty: () => dirty,
    save: vi.fn(async () => saveResult),
    relocate: vi.fn(),
    close: vi.fn(),
  }
  disposers.push(registerOpenDocument(document))
  return document
}

describe('workspace path helpers', () => {
  it('joins, parents, and relativizes root-relative paths', () => {
    expect(joinRelative('', 'a.txt')).toBe('a.txt')
    expect(joinRelative('src', 'a.ts')).toBe('src/a.ts')
    expect(parentOf('src/a.ts')).toBe('src')
    expect(parentOf('a.ts')).toBe('')
    expect(relativeOf('/repo', '/repo/src/a.ts')).toBe('src/a.ts')
    expect(relativeOf('/repo', '/repo')).toBe('')
    expect(isInside('src', 'src/a.ts')).toBe(true)
    expect(isInside('src', 'src2/a.ts')).toBe(false)
  })

  it('handles Windows separators without losing the original case', () => {
    expect(relativeOf('C:\\Repo', 'C:\\Repo\\Src\\A.ts')).toBe('Src/A.ts')
    expect(absoluteOf('C:\\Repo', 'Src/A.ts')).toBe('C:\\Repo\\Src\\A.ts')
    expect(absoluteOf('/repo', 'src/a.ts')).toBe('/repo/src/a.ts')
    expect(baseName('C:\\Repo\\工作 空间')).toBe('工作 空间')
  })
})

describe('open document registry', () => {
  it('finds exact paths and descendants only within the session', () => {
    const root = handle('a.ts')
    const child = handle('src/a.ts')
    const other = handle('src/a.ts')
    Object.defineProperty(other, 'sessionId', { value: 's2' })
    expect(documentsUnder('s1', 'src')).toEqual([child])
    expect(documentsUnder('s1', 'a.ts')).toEqual([root])
    expect(documentsUnder('s1', 'missing')).toEqual([])
  })

  it('lists only dirty affected documents before a destructive operation', () => {
    handle('src/clean.ts')
    const dirty = handle('src/dirty.ts', true)
    const deep = handle('src/deep/dirty.ts', true)
    handle('other.ts', true)

    expect(dirtyDocumentsUnder('s1', ['src']).map(document => document.path)).toEqual([
      'src/dirty.ts',
      'src/deep/dirty.ts',
    ])
    expect(dirty.isDirty() && deep.isDirty()).toBe(true)
  })

  it('saves only dirty affected documents and reports failures', async () => {
    const clean = handle('src/clean.ts')
    const dirty = handle('src/dirty.ts', true)
    const failing = handle('src/failing.ts', true, false)
    const unrelated = handle('other.ts', true)

    await expect(flushDocuments('s1', ['src'])).resolves.toEqual({
      ok: false,
      failures: ['src/failing.ts'],
    })
    expect(clean.save).not.toHaveBeenCalled()
    expect(dirty.save).toHaveBeenCalledOnce()
    expect(failing.save).toHaveBeenCalledOnce()
    expect(unrelated.save).not.toHaveBeenCalled()
  })

  it('relocates renamed and moved paths and closes deleted paths', () => {
    const file = handle('src/a.ts')
    const deep = handle('src/deep/b.ts')
    const doomed = handle('src/doomed.ts')

    relocateDocuments('s1', [
      { from: 'src', to: 'lib', kind: 'renamed' },
    ])
    expect(file.relocate).toHaveBeenCalledWith('lib/a.ts')
    expect(deep.relocate).toHaveBeenCalledWith('lib/deep/b.ts')

    doomed.relocate.mockClear()
    relocateDocuments('s1', [{ from: 'src/doomed.ts', kind: 'deleted' }])
    expect(doomed.close).toHaveBeenCalledOnce()
    expect(doomed.relocate).not.toHaveBeenCalled()
  })

  it('ignores created and copied entries', () => {
    const file = handle('src/a.ts')
    relocateDocuments('s1', [
      { from: 'src/a.ts', to: 'src/copy.ts', kind: 'copied' },
      { from: 'src/new.ts', kind: 'created' },
    ])
    expect(file.relocate).not.toHaveBeenCalled()
  })
})
