/**
 * Live CodeCraft document handles used to synchronize Explorer operations with
 * open tabs, unsaved buffers, and save targets.
 *
 * The registry is a browser-side coordination point only. It never writes to
 * disk; every save still goes through the editor's native save adapter.
 *
 * @module dsh-codecraft/client/document/registry
 */

import type { WorkspaceChangedPath } from '../../protocol.js'

/** One mounted CodeCraft editor tab. */
export interface OpenDocumentHandle {
  readonly sessionId: string
  readonly path: string
  readonly address: string
  readonly tabId: string
  /** Whether the buffer differs from its last saved text. */
  isDirty(): boolean
  /** Flush pending edits; resolves false when the document is still unsafe. */
  save(): Promise<boolean>
  /** Close this tab and open its resource at the new workspace path. */
  relocate(nextPath: string): void
  /** Close this tab without changing its resource. */
  close(): void
}

const documents = new Set<OpenDocumentHandle>()

/** Register one mounted editor; returns its unregister function. */
export function registerOpenDocument(handle: OpenDocumentHandle): () => void {
  documents.add(handle)
  return () => { documents.delete(handle) }
}

/** Every open document whose path is `path` or below it. */
export function documentsUnder(sessionId: string, path: string): OpenDocumentHandle[] {
  return [...documents].filter(document =>
    document.sessionId === sessionId
    && (document.path === path || document.path.startsWith(`${path}/`)))
}

/** Dirty documents under the affected paths, deduplicated by tab. */
export function dirtyDocumentsUnder(sessionId: string, paths: readonly string[]): OpenDocumentHandle[] {
  const affected = new Map<string, OpenDocumentHandle>()
  for (const path of paths) {
    for (const document of documentsUnder(sessionId, path)) {
      if (document.isDirty()) affected.set(document.tabId, document)
    }
  }
  return [...affected.values()]
}

/** Flush every affected dirty document before a destructive operation. */
export async function flushDocuments(
  sessionId: string,
  paths: readonly string[],
): Promise<{ ok: boolean; failures: string[] }> {
  const affected = new Map<string, OpenDocumentHandle>()
  for (const path of paths) {
    for (const document of documentsUnder(sessionId, path)) affected.set(document.tabId, document)
  }
  const failures: string[] = []
  for (const document of affected.values()) {
    if (!document.isDirty()) continue
    if (!await document.save()) failures.push(document.path)
  }
  return { ok: failures.length === 0, failures }
}

/** Apply successful operation results to open tabs. */
export function relocateDocuments(sessionId: string, changes: readonly WorkspaceChangedPath[]): void {
  for (const change of changes) {
    const affected = documentsUnder(sessionId, change.from)
    if (change.kind === 'deleted' || change.kind === 'trashed') {
      for (const document of affected) document.close()
      continue
    }
    if (change.to === undefined || (change.kind !== 'renamed' && change.kind !== 'moved')) continue
    for (const document of affected) {
      const suffix = document.path.slice(change.from.length)
      document.relocate(`${change.to}${suffix}`)
    }
  }
}
