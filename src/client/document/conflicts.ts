export type DiskChangeDecision = 'none' | 'reload' | 'external' | 'deleted'

/** Decide how an observed filesystem version affects the current document. */
export function assessDiskChange(input: {
  exists: boolean
  version?: string
  baseVersion: string
  dirty: boolean
}): DiskChangeDecision {
  if (!input.exists) return input.dirty ? 'deleted' : 'none'
  if (input.version === undefined || input.version === input.baseVersion) return 'none'
  return input.dirty ? 'external' : 'reload'
}
