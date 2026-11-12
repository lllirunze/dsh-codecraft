export type EditorStatusKey =
  | 'status.synced'
  | 'status.readOnly'
  | 'status.external'
  | 'status.saveError'

/** Keep routine edit-through saves visually stable and surface only exceptions. */
export function editorStatusKey(input: {
  writable: boolean
  conflicted: boolean
  external: boolean
  saveFailed: boolean
}): EditorStatusKey {
  if (!input.writable) return 'status.readOnly'
  if (input.conflicted || input.external) return 'status.external'
  if (input.saveFailed) return 'status.saveError'
  return 'status.synced'
}
