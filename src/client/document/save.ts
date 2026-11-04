import type { SaveResult } from '../../protocol.js'

export interface SaveRequestState {
  sessionId: string
  path: string
  content: string
  expectedVersion: string
  newline: 'lf' | 'crlf'
  bom: boolean
}

export function createSaveRequest(input: SaveRequestState): SaveRequestState {
  return { ...input }
}

/** Reconcile a completed save with edits made while the request was pending. */
export function reconcileSaveSuccess(
  liveText: string,
  submittedText: string,
  result: SaveResult,
): { savedText: string; baseVersion: string; dirty: boolean } {
  return {
    savedText: submittedText,
    baseVersion: result.version,
    dirty: liveText !== submittedText,
  }
}
