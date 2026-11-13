/**
 * Frame-wide modal host for CodeCraft workspace operations.
 *
 * The native tree context menu and the Explorer page share this host, so a
 * name prompt or conflict choice looks the same wherever the operation started.
 *
 * @module dsh-codecraft/client/workspace/DialogHost
 */

import { useEffect, useRef, useSyncExternalStore, type ReactElement } from 'react'
import type { WorkspaceController } from './controller.js'

export interface DialogHostProps {
  t: (key: string, params?: Record<string, string | number>) => string
}

/** Build the modal host around the shared controller. */
export function createDialogHost(
  controller: WorkspaceController,
): (props: DialogHostProps) => ReactElement | null {
  return function DialogHost(props: DialogHostProps): ReactElement | null {
    const { t } = props
    const ui = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
    const dialog = ui.dialog
    const inputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
      if (dialog?.kind === 'create' || dialog?.kind === 'rename') {
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }, [dialog?.kind])

    if (dialog === null) return null

    const close = (): void => { controller.closeDialog() }
    const title = dialog.kind === 'create'
      ? t(dialog.entryKind === 'file' ? 'explorer.createFileTitle' : 'explorer.createFolderTitle')
      : dialog.kind === 'rename'
        ? t('explorer.renameTitle')
        : dialog.kind === 'delete'
          ? t(dialog.mode === 'permanent' ? 'explorer.deletePermanentTitle' : 'explorer.deleteTitle')
          : dialog.kind === 'unsaved'
            ? t('explorer.unsavedTitle')
            : t('explorer.conflictTitle')

    return (
      <div
        className="cc-dialog-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) close()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            close()
          }
        }}
      >
        <div className="cc-dialog" role="dialog" aria-modal="true" aria-label={title}>
          <div className="cc-dialog-header">
            <h2>{title}</h2>
            <button type="button" className="cc-dialog-close" aria-label={t('explorer.cancel')} onClick={close}>×</button>
          </div>
          {(dialog.kind === 'create' || dialog.kind === 'rename') && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void controller.submitDialog()
              }}
            >
              <label className="cc-dialog-field">
                <span>{t('explorer.nameLabel')}</span>
                <input
                  ref={inputRef}
                  value={dialog.value}
                  disabled={dialog.busy}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(event) => controller.setDialogValue(event.currentTarget.value)}
                />
              </label>
              {dialog.kind === 'create' && (
                <p className="cc-dialog-hint">
                  {t('explorer.createHint', { path: dialog.parentPath === '' ? '/' : `/${dialog.parentPath}` })}
                </p>
              )}
              {dialog.error !== null && <p className="cc-dialog-error">{dialog.error}</p>}
              <div className="cc-dialog-actions">
                <button type="button" onClick={close} disabled={dialog.busy}>{t('explorer.cancel')}</button>
                <button type="submit" className="is-primary" disabled={dialog.busy}>
                  {dialog.busy ? t('explorer.working') : t('explorer.confirm')}
                </button>
              </div>
            </form>
          )}
          {dialog.kind === 'delete' && (
            <div>
              <p className="cc-dialog-hint">
                {t(dialog.mode === 'permanent' ? 'explorer.deletePermanentHint' : 'explorer.deleteHint')}
              </p>
              <ul className="cc-dialog-list">
                {dialog.paths.slice(0, 12).map(path => <li key={path}>{path}</li>)}
                {dialog.paths.length > 12 && <li>{t('explorer.moreItems', { count: dialog.paths.length - 12 })}</li>}
              </ul>
              {dialog.error !== null && <p className="cc-dialog-error">{dialog.error}</p>}
              <div className="cc-dialog-actions">
                {dialog.mode === 'trash' && (
                  <button
                    type="button"
                    className="is-danger-quiet"
                    disabled={dialog.busy}
                    onClick={() => controller.openDelete(dialog.sessionId, dialog.paths, 'permanent')}
                  >
                    {t('explorer.deletePermanently')}
                  </button>
                )}
                <button type="button" onClick={close} disabled={dialog.busy}>{t('explorer.cancel')}</button>
                <button
                  type="button"
                  className={dialog.mode === 'permanent' ? 'is-danger' : 'is-primary'}
                  disabled={dialog.busy}
                  onClick={() => { void controller.submitDialog() }}
                >
                  {dialog.busy
                    ? t('explorer.working')
                    : dialog.mode === 'permanent' ? t('explorer.deletePermanently') : t('explorer.moveToTrash')}
                </button>
              </div>
            </div>
          )}
          {dialog.kind === 'unsaved' && (
            <div>
              <p className="cc-dialog-hint">{t('explorer.unsavedHint')}</p>
              <ul className="cc-dialog-list">
                {dialog.paths.slice(0, 12).map(path => <li key={path}>{path}</li>)}
                {dialog.paths.length > 12 && <li>{t('explorer.moreItems', { count: dialog.paths.length - 12 })}</li>}
              </ul>
              {dialog.error !== null && <p className="cc-dialog-error">{dialog.error}</p>}
              <div className="cc-dialog-actions">
                <button type="button" onClick={() => { void controller.resolveUnsaved(false) }} disabled={dialog.busy}>{t('explorer.cancel')}</button>
                <button type="button" className="is-primary" disabled={dialog.busy} onClick={() => { void controller.resolveUnsaved(true) }}>
                  {dialog.busy ? t('explorer.working') : t('explorer.saveAndContinue')}
                </button>
              </div>
            </div>
          )}
          {dialog.kind === 'conflict' && (
            <div>
              <p className="cc-dialog-hint">{t('explorer.conflictHint')}</p>
              <ul className="cc-dialog-list">
                {dialog.items.filter(item => item.exists).slice(0, 12).map(item => (
                  <li key={item.path}>
                    {item.path} → {item.targetPath}
                    {item.targetKind === 'directory' ? ` (${t('explorer.folderConflict')})` : ''}
                  </li>
                ))}
              </ul>
              {dialog.error !== null && <p className="cc-dialog-error">{dialog.error}</p>}
              <div className="cc-dialog-actions">
                <button type="button" onClick={close} disabled={dialog.busy}>{t('explorer.cancel')}</button>
                <button type="button" disabled={dialog.busy} onClick={() => { void controller.resolveConflict('skip') }}>
                  {t('explorer.skipExisting')}
                </button>
                <button type="button" disabled={dialog.busy} onClick={() => { void controller.resolveConflict('rename') }}>
                  {t('explorer.keepBoth')}
                </button>
                <button
                  type="button"
                  className="is-danger"
                  disabled={dialog.busy || dialog.items.some(item => item.exists && item.targetKind === 'directory')}
                  onClick={() => { void controller.resolveConflict('overwrite') }}
                >
                  {t('explorer.overwrite')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
}
