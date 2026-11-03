import { describe, expect, it } from 'vitest'
import { DraftStore, type Draft, type DraftStorage } from '../src/client/drafts.js'

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

function draft(content: string, baseVersion = 'v1'): Draft {
  return {
    content,
    baseVersion,
    newline: 'lf',
    bom: false,
    savedAt: 0,
  }
}

describe('DraftStore', () => {
  it('stores, restores, and removes a draft', () => {
    const storage = new MemoryStorage()
    const store = new DraftStore(storage, () => 10)
    expect(store.has('a')).toBe(false)
    store.put('a', draft('hello'))
    expect(store.has('a')).toBe(true)
    expect(store.get('a')).toMatchObject({ content: 'hello', savedAt: 10 })

    const second = new DraftStore(storage, () => 20)
    expect(second.get('a')).toMatchObject({ content: 'hello', baseVersion: 'v1' })
    second.remove('a')
    expect(second.has('a')).toBe(false)
    expect(storage.length).toBe(0)
  })

  it('keeps drafts in memory when durable storage is unavailable', () => {
    const store = new DraftStore(null)
    store.put('a', draft('memory only'))
    expect(store.get('a')?.content).toBe('memory only')
    expect(store.addresses()).toEqual(['a'])
  })

  it('drops invalid JSON instead of returning a broken draft', () => {
    const storage = new MemoryStorage()
    storage.setItem('dsh-codecraft/draft/v1/a', '{not json')
    const store = new DraftStore(storage)
    expect(store.get('a')).toBeUndefined()
    expect(storage.length).toBe(0)
  })

  it('validates the stored shape', () => {
    const storage = new MemoryStorage()
    storage.setItem('dsh-codecraft/draft/v1/a', JSON.stringify({ content: 1 }))
    const store = new DraftStore(storage)
    expect(store.get('a')).toBeUndefined()
  })

  it('evicts the oldest drafts beyond the count limit', () => {
    const storage = new MemoryStorage()
    let now = 0
    const store = new DraftStore(storage, () => ++now)
    for (let index = 0; index < 20; index += 1) {
      store.put(`file-${index}`, draft(`content-${index}`))
    }
    expect(storage.getItem('dsh-codecraft/draft/v1/file-0')).toBeNull()
    expect(storage.getItem('dsh-codecraft/draft/v1/file-19')).not.toBeNull()
    expect(storage.length).toBeLessThanOrEqual(16)
  })

  it('clears every draft it owns', () => {
    const storage = new MemoryStorage()
    storage.setItem('unrelated', 'keep')
    const store = new DraftStore(storage)
    store.put('a', draft('a'))
    store.put('b', draft('b'))
    store.clear()
    expect(store.addresses()).toEqual([])
    expect(storage.getItem('unrelated')).toBe('keep')
  })
})
