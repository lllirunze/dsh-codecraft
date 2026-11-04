import type { AutoSaveSettings } from '../../settings/schema.js'

export interface AutoSaveDocumentState {
  editing: boolean
  dirty: boolean
  readOnly: boolean
  saving: boolean
  conflicted: boolean
}

/** Keep timer policy independent from React and the file transport. */
export function autoSaveDelay(settings: AutoSaveSettings): number {
  return settings.intervalSeconds * 1000
}

/** Only a safe, writable, idle document is eligible for a periodic save. */
export function canAutoSave(state: AutoSaveDocumentState): boolean {
  return state.editing
    && state.dirty
    && !state.readOnly
    && !state.saving
    && !state.conflicted
}
