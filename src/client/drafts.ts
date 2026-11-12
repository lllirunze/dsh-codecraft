/** Remove durable drafts created by CodeCraft versions before edit-through save. */

const PREFIX = 'dsh-codecraft/draft/v1/'

/** The storage surface needed; `localStorage` satisfies it. */
export interface DraftStorage {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * Delete legacy draft records without touching any other browser storage.
 * Failures are intentionally ignored because storage can be unavailable.
 */
export function clearLegacyDrafts(storage: DraftStorage | null): number {
  if (storage === null) return 0
  const keys: string[] = []
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key !== null && key.startsWith(PREFIX)) keys.push(key)
    }
    for (const key of keys) storage.removeItem(key)
    return keys.length
  } catch {
    return 0
  }
}

/** Clear old drafts once when the browser plugin starts. */
export function clearBrowserLegacyDrafts(): number {
  try {
    return clearLegacyDrafts(globalThis.localStorage ?? null)
  } catch {
    return 0
  }
}
