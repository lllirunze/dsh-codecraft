import type { Draft } from '../drafts.js'
import type { TextFileSnapshot } from '../../protocol.js'

/** Whether the live editor differs from one known saved snapshot. */
export function differsFromSavedText(currentText: string, savedText: string): boolean {
  return currentText.length !== savedText.length || currentText !== savedText
}

export interface InitialDocumentState {
  text: string
  savedText: string
  baseVersion: string
  newline: 'lf' | 'crlf'
  bom: boolean
  dirty: boolean
  conflict: 'external' | 'restored' | null
}

/** Reconcile an optional durable draft with the latest disk snapshot. */
export function initialDocumentState(snapshot: TextFileSnapshot, draft?: Draft): InitialDocumentState {
  const useDraft = draft !== undefined && differsFromSavedText(draft.content, snapshot.content)
  if (!useDraft) {
    return {
      text: snapshot.content,
      savedText: snapshot.content,
      baseVersion: snapshot.version,
      newline: snapshot.newline,
      bom: snapshot.bom,
      dirty: false,
      conflict: null,
    }
  }
  return {
    text: draft.content,
    savedText: snapshot.content,
    baseVersion: draft.baseVersion,
    newline: draft.newline,
    bom: draft.bom,
    dirty: true,
    conflict: draft.baseVersion === snapshot.version ? 'restored' : 'external',
  }
}
