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
  conflict: null
}

/** Open from the authoritative disk snapshot; legacy drafts are not restored. */
export function initialDocumentState(snapshot: TextFileSnapshot): InitialDocumentState {
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
