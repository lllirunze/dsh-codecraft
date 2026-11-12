import { describe, expect, it } from 'vitest'
import { clearLegacyDrafts, type DraftStorage } from '../src/client/drafts.js'

class MemoryStorage implements DraftStorage {
  readonly map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }
}

describe('clearLegacyDrafts', () => {
  it('removes only CodeCraft draft records', () => {
    const storage = new MemoryStorage()
    storage.setItem('unrelated', 'keep')
    storage.setItem('dsh-codecraft/draft/v1/a', 'draft-a')
    storage.setItem('dsh-codecraft/draft/v1/b', 'draft-b')
    expect(clearLegacyDrafts(storage)).toBe(2)
    expect(storage.length).toBe(1)
    expect(storage.getItem('unrelated')).toBe('keep')
  })

  it('treats unavailable storage as an empty migration', () => {
    expect(clearLegacyDrafts(null)).toBe(0)
  })
})
