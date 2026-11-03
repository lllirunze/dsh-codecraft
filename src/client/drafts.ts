/**
 * Draft persistence that survives tab switches, tab closes, and page reloads.
 *
 * The editor body unmounts when the native tab is not visible, so the text
 * being edited cannot live only in React state. A small module-level store
 * keeps the draft in memory and mirrors it to `localStorage` when the browser
 * allows it; a quota failure degrades to memory-only instead of failing the
 * edit. Drafts are removed only after a successful save or an explicit
 * discard, and they never leave this machine.
 *
 * @module dsh-codecraft/client/drafts
 */

const PREFIX = 'dsh-codecraft/draft/v1/'
const MAX_DRAFTS = 16
const MAX_TOTAL_BYTES = 4 * 1024 * 1024

/** The storage surface needed; `localStorage` satisfies it. */
export interface DraftStorage {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface DraftSelection {
  anchor: number
  head: number
}

/** One unsaved edit, keyed by the file's full resource address. */
export interface Draft {
  content: string
  /** Host version the draft was based on. */
  baseVersion: string
  newline: 'lf' | 'crlf'
  bom: boolean
  savedAt: number
  selection?: DraftSelection
  scrollTop?: number
}

function isDraft(value: unknown): value is Draft {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Draft>
  return typeof candidate.content === 'string'
    && typeof candidate.baseVersion === 'string'
    && (candidate.newline === 'lf' || candidate.newline === 'crlf')
    && typeof candidate.bom === 'boolean'
    && typeof candidate.savedAt === 'number'
    && (candidate.selection === undefined
      || (typeof candidate.selection === 'object'
        && candidate.selection !== null
        && typeof candidate.selection.anchor === 'number'
        && typeof candidate.selection.head === 'number'))
    && (candidate.scrollTop === undefined || typeof candidate.scrollTop === 'number')
}

/** In-memory plus optional durable draft storage. */
export class DraftStore {
  readonly #memory = new Map<string, Draft>()
  readonly #storage: DraftStorage | null
  readonly #now: () => number

  constructor(storage: DraftStorage | null, now: () => number = Date.now) {
    this.#storage = storage
    this.#now = now
  }

  /** Whether a draft exists in memory or durable storage. */
  has(address: string): boolean {
    return this.#memory.has(address) || this.#readStored(address) !== undefined
  }

  /** Read one draft, validating durable data before trusting it. */
  get(address: string): Draft | undefined {
    const cached = this.#memory.get(address)
    if (cached !== undefined) return cached
    const stored = this.#readStored(address)
    if (stored !== undefined) this.#memory.set(address, stored)
    return stored
  }

  /** Store or replace one draft; never throws for quota or privacy failures. */
  put(address: string, draft: Draft): void {
    const normalized: Draft = { ...draft, savedAt: this.#now() }
    this.#memory.set(address, normalized)
    if (this.#storage === null) return
    try {
      this.#storage.setItem(PREFIX + address, JSON.stringify(normalized))
      this.#evict()
    } catch {
      // Quota or a denied storage area: keep the in-memory copy and try to
      // make room for the next draft.
      this.#evict()
    }
  }

  /** Remove a draft after a successful save or an explicit discard. */
  remove(address: string): void {
    this.#memory.delete(address)
    try {
      this.#storage?.removeItem(PREFIX + address)
    } catch {
      // A denied storage area has nothing to remove.
    }
  }

  /** Drop every draft this plugin owns. */
  clear(): void {
    this.#memory.clear()
    if (this.#storage === null) return
    try {
      for (const key of this.#keys()) this.#storage.removeItem(key)
    } catch {
      // Ignore a denied storage area.
    }
  }

  /** Addresses with drafts, used to decide whether to warn on unload. */
  addresses(): string[] {
    const addresses = new Set(this.#memory.keys())
    for (const key of this.#keys()) addresses.add(key.slice(PREFIX.length))
    return [...addresses]
  }

  #readStored(address: string): Draft | undefined {
    if (this.#storage === null) return undefined
    let raw: string | null
    try {
      raw = this.#storage.getItem(PREFIX + address)
    } catch {
      return undefined
    }
    if (raw === null) return undefined
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isDraft(parsed)) return parsed
    } catch {
      // Invalid JSON: fall through and discard the entry.
    }
    try {
      this.#storage.removeItem(PREFIX + address)
    } catch {
      // Ignore.
    }
    return undefined
  }

  #keys(): string[] {
    if (this.#storage === null) return []
    const keys: string[] = []
    try {
      for (let index = 0; index < this.#storage.length; index += 1) {
        const key = this.#storage.key(index)
        if (key !== null && key.startsWith(PREFIX)) keys.push(key)
      }
    } catch {
      return []
    }
    return keys
  }

  #evict(): void {
    if (this.#storage === null) return
    const entries: { key: string; savedAt: number; bytes: number }[] = []
    for (const key of this.#keys()) {
      try {
        const raw = this.#storage.getItem(key)
        if (raw === null) continue
        const parsed: unknown = JSON.parse(raw)
        const savedAt = isDraft(parsed) ? parsed.savedAt : 0
        entries.push({ key, savedAt, bytes: key.length + raw.length })
      } catch {
        entries.push({ key, savedAt: 0, bytes: key.length })
      }
    }
    entries.sort((left, right) => left.savedAt - right.savedAt)
    let total = entries.reduce((sum, entry) => sum + entry.bytes, 0)
    while (entries.length > MAX_DRAFTS || total > MAX_TOTAL_BYTES) {
      const oldest = entries.shift()
      if (oldest === undefined) break
      total -= oldest.bytes
      try {
        this.#storage.removeItem(oldest.key)
      } catch {
        break
      }
    }
  }
}

/** Resolve the browser's durable storage, or `null` when it is unavailable. */
export function browserDraftStorage(): DraftStorage | null {
  try {
    const storage = globalThis.localStorage
    if (storage === undefined || storage === null) return null
    const probe = 'dsh-codecraft/probe/v1'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

/** One store for the plugin's lifetime. */
export const drafts: DraftStore = new DraftStore(browserDraftStorage())
