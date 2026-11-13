/**
 * Workspace file-operation UI state shared by the Explorer page, its dialogs,
 * and the native tree context-menu actions.
 *
 * All disk mutations still go through the Host operation route. This controller
 * only coordinates validation, conflict choices, unsaved-buffer flushing, and
 * feedback.
 *
 * @module dsh-codecraft/client/workspace/controller
 */

import {
  listWorkspace,
  preflightWorkspace,
  runWorkspaceOperation,
} from '../api.js'
import { dirtyDocumentsUnder, flushDocuments, relocateDocuments } from '../document/registry.js'
import { absoluteOf, joinRelative, parentOf, relativeOf } from './paths.js'
import type {
  WorkspaceChangedPath,
  WorkspaceConflictPolicy,
  WorkspaceOperation,
  WorkspaceOperationResult,
  WorkspacePreflightItem,
} from '../../protocol.js'

/** Session list surface the controller reads. */
export interface SessionsReader {
  list: {
    getSnapshot(): { byId: Record<string, { cwd?: string }> }
  }
}

export interface WorkspaceControllerOptions {
  sessions: SessionsReader
  t: (key: string, params?: Record<string, string | number>) => string
  reveal: (absolutePath: string) => Promise<unknown>
}

export type EntryKind = 'file' | 'directory'

export type DialogState =
  | {
    kind: 'create'
    sessionId: string
    parentPath: string
    entryKind: EntryKind
    value: string
    busy: boolean
    error: string | null
  }
  | {
    kind: 'rename'
    sessionId: string
    path: string
    kindOfEntry: EntryKind
    value: string
    busy: boolean
    error: string | null
  }
  | {
    kind: 'delete'
    sessionId: string
    paths: string[]
    mode: 'trash' | 'permanent'
    busy: boolean
    error: string | null
  }
  | {
    kind: 'conflict'
    sessionId: string
    operation: Extract<WorkspaceOperation, { kind: 'copy' | 'move' }>
    items: WorkspacePreflightItem[]
    busy: boolean
    error: string | null
  }
  | {
    kind: 'unsaved'
    sessionId: string
    operation: WorkspaceOperation
    verb: 'create' | 'copy' | 'move' | 'rename' | 'delete'
    paths: string[]
    preflight: boolean
    busy: boolean
    error: string | null
  }

export interface WorkspaceToast {
  id: number
  message: string
  tone: 'info' | 'error'
}

export interface WorkspaceClipboard {
  mode: 'copy' | 'cut'
  sessionId: string
  paths: string[]
}

export interface WorkspaceFocus {
  sessionId: string
  path: string
}

export interface WorkspaceUiState {
  dialog: DialogState | null
  toast: WorkspaceToast | null
  clipboard: WorkspaceClipboard | null
  refresh: Record<string, number>
  focus: WorkspaceFocus | null
}

const EMPTY: WorkspaceUiState = {
  dialog: null,
  toast: null,
  clipboard: null,
  refresh: {},
  focus: null,
}

/** Coordinates workspace operations and their user-visible decisions. */
export class WorkspaceController {
  readonly #options: WorkspaceControllerOptions
  readonly #listeners = new Set<() => void>()
  #state: WorkspaceUiState = EMPTY
  #toastTimer: ReturnType<typeof setTimeout> | undefined
  #toastId = 0

  constructor(options: WorkspaceControllerOptions) {
    this.#options = options
  }

  getSnapshot = (): WorkspaceUiState => this.#state

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  #set(next: Partial<WorkspaceUiState>): void {
    this.#state = { ...this.#state, ...next }
    for (const listener of this.#listeners) listener()
  }

  /** Session workspace root, when the Session still has one. */
  rootOf(sessionId: string): string | undefined {
    return this.#options.sessions.list.getSnapshot().byId[sessionId]?.cwd
  }

  toast(message: string, tone: 'info' | 'error' = 'info'): void {
    if (this.#toastTimer !== undefined) clearTimeout(this.#toastTimer)
    const id = this.#toastId += 1
    this.#set({ toast: { id, message, tone } })
    this.#toastTimer = setTimeout(() => {
      if (this.#state.toast?.id === id) this.#set({ toast: null })
    }, tone === 'error' ? 6000 : 3200)
  }

  dismissToast(): void {
    this.#set({ toast: null })
  }

  openCreate(sessionId: string, parentPath: string, entryKind: EntryKind): void {
    this.#set({
      dialog: { kind: 'create', sessionId, parentPath, entryKind, value: '', busy: false, error: null },
    })
  }

  openRename(sessionId: string, path: string, kindOfEntry: EntryKind): void {
    const root = this.rootOf(sessionId)
    const name = path.slice(path.lastIndexOf('/') + 1)
    if (root === undefined) {
      this.toast(this.#options.t('explorer.noWorkspace'), 'error')
      return
    }
    this.#set({
      dialog: { kind: 'rename', sessionId, path, kindOfEntry, value: name, busy: false, error: null },
    })
  }

  openDelete(sessionId: string, paths: readonly string[], mode: 'trash' | 'permanent' = 'trash'): void {
    if (paths.length === 0) return
    this.#set({
      dialog: { kind: 'delete', sessionId, paths: [...paths], mode, busy: false, error: null },
    })
  }

  closeDialog(): void {
    if (this.#state.dialog?.busy === true) return
    this.#set({ dialog: null })
  }

  setDialogValue(value: string): void {
    const dialog = this.#state.dialog
    if (dialog === null || dialog.busy) return
    if (dialog.kind === 'create' || dialog.kind === 'rename') {
      this.#set({ dialog: { ...dialog, value, error: null } })
    }
  }

  /** Copy selected paths into the workspace clipboard. */
  copy(sessionId: string, paths: readonly string[]): void {
    if (paths.length === 0) return
    this.#set({ clipboard: { mode: 'copy', sessionId, paths: [...paths] }, focus: null })
  }

  /** Cut selected paths; the source stays until a paste succeeds. */
  cut(sessionId: string, paths: readonly string[]): void {
    if (paths.length === 0) return
    this.#set({ clipboard: { mode: 'cut', sessionId, paths: [...paths] }, focus: null })
  }

  clearClipboard(): void {
    this.#set({ clipboard: null })
  }

  /** Run paste into a directory, preflighting conflicts first. */
  async pasteInto(sessionId: string, targetDirectory: string): Promise<void> {
    const clipboard = this.#state.clipboard
    if (clipboard === null) return
    if (clipboard.sessionId !== sessionId) {
      this.toast(this.#options.t('explorer.clipboardOtherSession'), 'error')
      return
    }
    const operation: Extract<WorkspaceOperation, { kind: 'copy' | 'move' }> = {
      kind: clipboard.mode === 'copy' ? 'copy' : 'move',
      paths: clipboard.paths,
      targetDirectory,
      conflict: 'skip',
    }
    await this.#transfer(operation)
  }

  /** Move selected rows into a directory, used by drag and drop. */
  async moveInto(sessionId: string, paths: readonly string[], targetDirectory: string): Promise<void> {
    if (paths.length === 0) return
    await this.#transfer({
      kind: 'move',
      paths: [...paths],
      targetDirectory,
      conflict: 'skip',
    }, sessionId)
  }

  /** Apply one explicit conflict policy chosen by the user. */
  async resolveConflict(policy: WorkspaceConflictPolicy): Promise<void> {
    const dialog = this.#state.dialog
    if (dialog?.kind !== 'conflict' || dialog.busy) return
    if (policy === 'overwrite' && dialog.items.some(item => item.targetKind === 'directory')) {
      this.#updateDialog({ ...dialog, error: this.#options.t('explorer.overwriteDirectory') })
      return
    }
    const operation = { ...dialog.operation, conflict: policy, confirmedOverwrite: policy === 'overwrite' }
    this.#updateDialog({ ...dialog, busy: true, error: null })
    await this.#execute(
      dialog.sessionId,
      operation,
      dialog.operation.kind === 'copy' ? 'copy' : 'move',
    )
  }

  /** Save the affected dirty documents and resume the paused operation. */
  async resolveUnsaved(save: boolean): Promise<void> {
    const dialog = this.#state.dialog
    if (dialog?.kind !== 'unsaved' || dialog.busy) return
    if (!save) {
      this.#set({ dialog: null })
      return
    }
    this.#updateDialog({ ...dialog, busy: true, error: null })
    const flushed = await flushDocuments(dialog.sessionId, dialog.paths)
    if (!flushed.ok) {
      this.#updateDialog({
        ...dialog,
        busy: false,
        error: this.#options.t('explorer.unsavedBlocked'),
      })
      return
    }
    this.#set({ dialog: null })
    if (dialog.preflight && (dialog.operation.kind === 'copy' || dialog.operation.kind === 'move')) {
      await this.#transferResolved(dialog.operation, dialog.sessionId)
    } else {
      await this.#execute(dialog.sessionId, dialog.operation, dialog.verb)
    }
  }

  async submitDialog(): Promise<void> {
    const dialog = this.#state.dialog
    if (dialog === null || dialog.busy) return
    if (dialog.kind === 'create') {
      const name = dialog.value.trim()
      if (name === '') {
        this.#updateDialog({ ...dialog, error: this.#options.t('explorer.nameRequired') })
        return
      }
      const path = joinRelative(dialog.parentPath, name)
      this.#updateDialog({ ...dialog, busy: true, error: null })
      const operation: WorkspaceOperation = dialog.entryKind === 'file'
        ? { kind: 'createFile', path }
        : { kind: 'createDirectory', path }
      await this.#execute(dialog.sessionId, operation, 'create', path)
      return
    }
    if (dialog.kind === 'rename') {
      const name = dialog.value.trim()
      if (name === '') {
        this.#updateDialog({ ...dialog, error: this.#options.t('explorer.nameRequired') })
        return
      }
      this.#updateDialog({ ...dialog, busy: true, error: null })
      this.#confirm(
        dialog.sessionId,
        { kind: 'rename', path: dialog.path, newName: name },
        'rename',
      )
      return
    }
    if (dialog.kind === 'delete') {
      this.#updateDialog({ ...dialog, busy: true, error: null })
      await this.#delete(dialog.sessionId, dialog.paths, dialog.mode)
    }
  }

  /** Open a dialog for a folder creation from the native tree menu. */
  newFolder(sessionId: string, parentPath: string): void {
    this.openCreate(sessionId, parentPath, 'directory')
  }

  /**
   * Open the create dialog for a folder. The current dialog model carries one
   * entry kind; folder creation uses a separate call so callers stay explicit.
   */
  async createDirectoryNow(sessionId: string, parentPath: string, name: string): Promise<void> {
    await this.#execute(sessionId, { kind: 'createDirectory', path: joinRelative(parentPath, name) }, 'create')
  }

  async createFileNow(sessionId: string, parentPath: string, name: string): Promise<void> {
    await this.#execute(sessionId, { kind: 'createFile', path: joinRelative(parentPath, name) }, 'create')
  }

  async renameNow(sessionId: string, path: string, newName: string): Promise<void> {
    await this.#execute(sessionId, { kind: 'rename', path, newName }, 'rename')
  }

  async deleteNow(sessionId: string, paths: readonly string[], mode: 'trash' | 'permanent'): Promise<void> {
    await this.#delete(sessionId, paths, mode)
  }

  async copyPath(sessionId: string, path: string, relative: boolean): Promise<void> {
    const root = this.rootOf(sessionId)
    if (root === undefined) return
    const text = relative ? path : absoluteOf(root, path)
    try {
      await navigator.clipboard.writeText(text)
      this.toast(this.#options.t('explorer.pathCopied'))
    } catch {
      this.toast(this.#options.t('explorer.clipboardFailed'), 'error')
    }
  }

  async reveal(sessionId: string, path: string): Promise<void> {
    const root = this.rootOf(sessionId)
    if (root === undefined) return
    try {
      await this.#options.reveal(absoluteOf(root, path))
    } catch {
      this.toast(this.#options.t('explorer.revealFailed'), 'error')
    }
  }

  refresh(sessionId: string): void {
    const current = this.#state.refresh[sessionId] ?? 0
    this.#set({ refresh: { ...this.#state.refresh, [sessionId]: current + 1 } })
  }

  clearFocus(): void {
    if (this.#state.focus !== null) this.#set({ focus: null })
  }

  #updateDialog(dialog: DialogState): void {
    this.#set({ dialog })
  }

  async #delete(sessionId: string, paths: readonly string[], mode: 'trash' | 'permanent'): Promise<void> {
    const operation: WorkspaceOperation = {
      kind: 'delete',
      paths: [...paths],
      mode,
      confirmedPermanent: mode === 'permanent',
    }
    await this.#confirm(sessionId, operation, 'delete')
  }

  async #transfer(
    operation: Extract<WorkspaceOperation, { kind: 'copy' | 'move' }>,
    explicitSession?: string,
  ): Promise<void> {
    const sessionId = explicitSession ?? this.#clipboardSession()
    if (sessionId === '') return
    const dirty = dirtyDocumentsUnder(sessionId, operation.paths)
    if (dirty.length > 0) {
      this.#set({
        dialog: {
          kind: 'unsaved',
          sessionId,
          operation,
          verb: operation.kind === 'copy' ? 'copy' : 'move',
          paths: dirty.map(document => document.path),
          preflight: true,
          busy: false,
          error: null,
        },
      })
      return
    }
    await this.#transferResolved(operation, sessionId)
  }

  async #transferResolved(
    operation: Extract<WorkspaceOperation, { kind: 'copy' | 'move' }>,
    explicitSession?: string,
  ): Promise<void> {
    const sessionId = explicitSession ?? this.#clipboardSession()
    if (sessionId === '') return
    try {
      const preflight = await preflightWorkspace({ sessionId, operation })
      if (preflight.items.some(item => item.exists)) {
        this.#set({
          dialog: {
            kind: 'conflict',
            sessionId,
            operation,
            items: preflight.items,
            busy: false,
            error: null,
          },
        })
        return
      }
    } catch (failure) {
      this.toast(messageOf(failure), 'error')
      return
    }
    await this.#execute(sessionId, operation, operation.kind === 'copy' ? 'copy' : 'move')
  }

  #clipboardSession(): string {
    return this.#state.clipboard?.sessionId ?? ''
  }

  /** Block a destructive operation until every affected dirty document is saved. */
  async #confirm(
    sessionId: string,
    operation: WorkspaceOperation,
    verb: 'create' | 'copy' | 'move' | 'rename' | 'delete',
  ): Promise<void> {
    const paths = operationPaths(operation)
    const dirty = dirtyDocumentsUnder(sessionId, paths)
    if (dirty.length > 0) {
      this.#set({
        dialog: {
          kind: 'unsaved',
          sessionId,
          operation,
          verb,
          paths: dirty.map(document => document.path),
          preflight: false,
          busy: false,
          error: null,
        },
      })
      return
    }
    await this.#execute(sessionId, operation, verb)
  }

  async #execute(
    sessionId: string,
    operation: WorkspaceOperation,
    verb: 'create' | 'copy' | 'move' | 'rename' | 'delete',
    focusPath?: string,
  ): Promise<void> {
    try {
      const result = await runWorkspaceOperation({ sessionId, operation })
      this.#report(sessionId, result, verb, focusPath)
    } catch (failure) {
      const dialog = this.#state.dialog
      if (dialog !== null) {
        this.#set({ dialog: { ...dialog, busy: false, error: messageOf(failure) } })
      } else {
        this.toast(messageOf(failure), 'error')
      }
    }
  }

  #report(
    sessionId: string,
    result: WorkspaceOperationResult,
    verb: 'create' | 'copy' | 'move' | 'rename' | 'delete',
    focusPath?: string,
  ): void {
    relocateDocuments(sessionId, result.changedPaths)
    if (verb === 'move' && this.#state.clipboard?.mode === 'cut') {
      const failed = new Set(result.failed.map(item => item.path))
      const remaining = this.#state.clipboard.paths.filter(path => failed.has(path))
      this.#set({
        clipboard: remaining.length === 0
          ? null
          : { ...this.#state.clipboard, paths: remaining },
      })
    }
    const target = focusPath ?? changedTarget(result.changedPaths)
    this.#set({
      dialog: null,
      refresh: { ...this.#state.refresh, [sessionId]: (this.#state.refresh[sessionId] ?? 0) + 1 },
      focus: target === undefined ? null : { sessionId, path: target },
    })
    if (result.failed.length > 0) {
      const first = result.failed[0]
      this.toast(this.#options.t('explorer.partialFailure', {
        failed: result.failed.length,
        reason: first === undefined ? '' : first.message,
      }), 'error')
      return
    }
    if (result.warnings.length > 0) {
      this.toast(result.warnings.join(' '), 'error')
      return
    }
    this.toast(this.#options.t(`explorer.${verb}Done`, { count: result.succeeded.length }))
  }
}

function operationPaths(operation: WorkspaceOperation): string[] {
  if (operation.kind === 'delete') return operation.paths
  if (operation.kind === 'copy' || operation.kind === 'move') return operation.paths
  if (operation.kind === 'rename') return [operation.path]
  return []
}

function changedTarget(changes: readonly WorkspaceChangedPath[]): string | undefined {
  const change = changes.find(item => item.kind === 'created' || item.kind === 'renamed' || item.kind === 'moved' || item.kind === 'copied')
  if (change === undefined) return undefined
  return change.to ?? change.from
}

function messageOf(failure: unknown): string {
  return failure instanceof Error ? failure.message : String(failure)
}

/** Resolve the row kind from its path; used by native menu contributions. */
export function entryKindOf(path: string): EntryKind {
  return path.endsWith('/') ? 'directory' : 'file'
}

/** Parent directory of a workspace-relative path, or the root. */
export function parentDirectory(path: string): string {
  return parentOf(path)
}

/** Keep a path relative even when a native menu reports an absolute path. */
export function normalizePath(root: string, path: string): string {
  return relativeOf(root, path)
}
