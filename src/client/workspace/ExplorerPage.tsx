/**
 * CodeCraft Explorer page.
 *
 * It registers as an `extension` tab type for the built-in `files` kind, so DSH
 * shows exactly one Explorer in place of its native listing page while the
 * native tree beside previews keeps working. Multi-select, drag-and-drop, and
 * batch operations live here; ordinary create/rename/delete are also available
 * from the native tree context menu.
 *
 * @module dsh-codecraft/client/workspace/ExplorerPage
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from 'react'
import { listWorkspace } from '../api.js'
import { sessionFileAddress } from '../address.js'
import type { TabInfo } from '../dsh.js'
import type { WorkspaceEntry } from '../../protocol.js'
import { FileIcon } from '../icons/FileIcon.js'
import type { WorkspaceController } from './controller.js'
import { baseName, isInside, parentOf } from './paths.js'

interface SessionsSnapshot {
  byId: Record<string, { cwd?: string }>
}

/** Standard slot props this page consumes. */
export interface ExplorerProps {
  sessionId: string
  useSessions: <T>(selector: (state: SessionsSnapshot) => T) => T
  useTabInfo: () => { tab: TabInfo; panel: { id: string; isFloating: boolean } }
  t: (key: string, params?: Record<string, string | number>) => string
}

interface Row {
  path: string
  name: string
  kind: WorkspaceEntry['kind']
  size?: number
  depth: number
}

type MenuState = { x: number; y: number; path: string | null }

/** Build the page component with its shared controller. */
export function createExplorerPage(
  controller: WorkspaceController,
): (props: ExplorerProps) => ReactElement {
  return function ExplorerPage(props: ExplorerProps): ReactElement {
    const { sessionId, useSessions, useTabInfo, t } = props
    const cwd = useSessions(state => state.byId[sessionId]?.cwd)
    const { tab, panel } = useTabInfo()
    const ui = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)

    const [rootPath, setRootPath] = useState('')
    const [children, setChildren] = useState<Record<string, WorkspaceEntry[]>>({})
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
    const [selected, setSelected] = useState<Set<string>>(() => new Set())
    const [anchor, setAnchor] = useState<string | null>(null)
    const [focusPath, setFocusPath] = useState<string | null>(null)
    const [loading, setLoading] = useState<Set<string>>(() => new Set())
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [menu, setMenu] = useState<MenuState | null>(null)
    const [dropTarget, setDropTarget] = useState<string | null>(null)

    const load = useCallback(async (directory: string): Promise<void> => {
      setLoading(previous => new Set(previous).add(directory))
      try {
        const result = await listWorkspace({ sessionId, path: directory })
        setRootPath(result.root)
        setChildren(previous => ({ ...previous, [directory]: result.entries }))
        setErrors(previous => {
          if (previous[directory] === undefined) return previous
          const next = { ...previous }
          delete next[directory]
          return next
        })
      } catch (failure) {
        setErrors(previous => ({
          ...previous,
          [directory]: failure instanceof Error ? failure.message : String(failure),
        }))
      } finally {
        setLoading(previous => {
          const next = new Set(previous)
          next.delete(directory)
          return next
        })
      }
    }, [sessionId])

    useEffect(() => {
      setChildren({})
      setExpanded(new Set())
      setSelected(new Set())
      setAnchor(null)
      setFocusPath(null)
      setErrors({})
      if (cwd !== undefined) void load('')
    }, [cwd, load])

    const refreshToken = ui.refresh[sessionId] ?? 0
    useEffect(() => {
      if (cwd === undefined || refreshToken === 0) return
      void load('')
      for (const directory of expanded) void load(directory)
      // Expanded is intentionally read at the moment a refresh is requested.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshToken])

    useEffect(() => {
      if (cwd === undefined) return
      const timer = setInterval(() => {
        void load('')
        for (const directory of expanded) void load(directory)
      }, 3000)
      return () => { clearInterval(timer) }
    }, [cwd, expanded, load])

    useEffect(() => {
      if (cwd === undefined) return
      const close = (): void => { setMenu(null) }
      window.addEventListener('click', close)
      window.addEventListener('blur', close)
      return () => {
        window.removeEventListener('click', close)
        window.removeEventListener('blur', close)
      }
    }, [cwd])

    const rows = useMemo(() => {
      const output: Row[] = []
      const walk = (directory: string, depth: number): void => {
        const entries = children[directory]
        if (entries === undefined) return
        const sorted = [...entries].sort((left, right) => {
          const leftDirectory = left.kind === 'directory'
          const rightDirectory = right.kind === 'directory'
          if (leftDirectory !== rightDirectory) return leftDirectory ? -1 : 1
          return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' })
        })
        for (const entry of sorted) {
          output.push({
            path: entry.path,
            name: entry.name,
            kind: entry.kind,
            size: entry.size,
            depth,
          })
          if (entry.kind === 'directory' && expanded.has(entry.path)) walk(entry.path, depth + 1)
        }
      }
      walk('', 0)
      return output
    }, [children, expanded])

    const rowByPath = useMemo(() => new Map(rows.map(row => [row.path, row])), [rows])
    const selectedRows = useMemo(() => rows.filter(row => selected.has(row.path)), [rows, selected])
    const selectionPaths = selectedRows.map(row => row.path)

    const ensureVisible = useCallback((path: string): void => {
      const parts = path.split('/')
      const parents: string[] = []
      for (let index = 1; index < parts.length; index += 1) {
        parents.push(parts.slice(0, index).join('/'))
      }
      if (parents.length === 0) return
      setExpanded(previous => {
        const next = new Set(previous)
        let changed = false
        for (const parent of parents) {
          if (!next.has(parent)) {
            next.add(parent)
            changed = true
          }
        }
        return changed ? next : previous
      })
      for (const parent of parents) void load(parent)
    }, [load])

    useEffect(() => {
      const focus = ui.focus
      if (focus === null || focus.sessionId !== sessionId) return
      ensureVisible(focus.path)
      setSelected(new Set([focus.path]))
      setAnchor(focus.path)
      setFocusPath(focus.path)
      controller.clearFocus()
    }, [ui.focus, sessionId, ensureVisible, controller])

    const toggleDirectory = useCallback((path: string): void => {
      if (expanded.has(path)) {
        setExpanded(previous => {
          const next = new Set(previous)
          next.delete(path)
          return next
        })
        return
      }
      setExpanded(previous => new Set(previous).add(path))
      if (children[path] === undefined) void load(path)
    }, [children, expanded, load])

    const openFile = useCallback((path: string): void => {
      const address = sessionFileAddress(sessionId, path)
      if (panel.isFloating) tab.actions.openResource(address)
      else tab.actions.openResource(address, { paneId: panel.id })
    }, [panel.id, panel.isFloating, sessionId, tab.actions])

    const chooseRow = useCallback((event: ReactMouseEvent, row: Row): void => {
      if (event.shiftKey && anchor !== null) {
        const anchorIndex = rows.findIndex(item => item.path === anchor)
        const currentIndex = rows.findIndex(item => item.path === row.path)
        if (anchorIndex >= 0 && currentIndex >= 0) {
          const start = Math.min(anchorIndex, currentIndex)
          const end = Math.max(anchorIndex, currentIndex)
          setSelected(new Set(rows.slice(start, end + 1).map(item => item.path)))
          setFocusPath(row.path)
          return
        }
      }
      if (event.metaKey || event.ctrlKey) {
        setSelected(previous => {
          const next = new Set(previous)
          if (next.has(row.path)) next.delete(row.path)
          else next.add(row.path)
          return next
        })
        setAnchor(row.path)
        setFocusPath(row.path)
        return
      }
      setSelected(new Set([row.path]))
      setAnchor(row.path)
      setFocusPath(row.path)
      if (row.kind === 'directory') toggleDirectory(row.path)
    }, [anchor, rows, toggleDirectory])

    const remove = useCallback((): void => {
      if (selectionPaths.length === 0) return
      controller.openDelete(sessionId, selectionPaths)
    }, [controller, selectionPaths, sessionId])

    const rename = useCallback((): void => {
      const first = selectedRows[0]
      if (first === undefined || selectedRows.length !== 1) return
      controller.openRename(sessionId, first.path, first.kind === 'directory' ? 'directory' : 'file')
    }, [controller, selectedRows, sessionId])

    const pasteInto = useCallback((directory: string): void => {
      void controller.pasteInto(sessionId, directory)
    }, [controller, sessionId])

    const focusedRow = focusPath === null ? undefined : rowByPath.get(focusPath)
    const pasteDirectory = focusedRow === undefined
      ? ''
      : focusedRow.kind === 'directory' ? focusedRow.path : parentOf(focusedRow.path)

    const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      const currentIndex = focusPath === null ? -1 : rows.findIndex(row => row.path === focusPath)
      const primary = event.metaKey || event.ctrlKey
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        if (rows.length === 0) return
        const nextIndex = event.key === 'ArrowDown'
          ? Math.min(rows.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex <= 0 ? 0 : currentIndex - 1)
        const next = rows[nextIndex]
        if (next === undefined) return
        setFocusPath(next.path)
        setSelected(new Set([next.path]))
        setAnchor(next.path)
        return
      }
      if (event.key === 'ArrowRight' && focusedRow !== undefined) {
        event.preventDefault()
        if (focusedRow.kind === 'directory') {
          if (!expanded.has(focusedRow.path)) toggleDirectory(focusedRow.path)
          else {
            const child = rows[rows.findIndex(row => row.path === focusedRow.path) + 1]
            if (child !== undefined && child.depth > focusedRow.depth) {
              setFocusPath(child.path)
              setSelected(new Set([child.path]))
            }
          }
        }
        return
      }
      if (event.key === 'ArrowLeft' && focusedRow !== undefined) {
        event.preventDefault()
        if (focusedRow.kind === 'directory' && expanded.has(focusedRow.path)) {
          toggleDirectory(focusedRow.path)
        } else {
          const parent = parentOf(focusedRow.path)
          if (parent !== '') {
            setFocusPath(parent)
            setSelected(new Set([parent]))
          }
        }
        return
      }
      if (event.key === 'Enter' && focusedRow !== undefined) {
        event.preventDefault()
        if (focusedRow.kind === 'directory') toggleDirectory(focusedRow.path)
        else openFile(focusedRow.path)
        return
      }
      if (event.key === 'F2' && selectedRows.length === 1) {
        event.preventDefault()
        rename()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        remove()
        return
      }
      if (primary && (event.key === 'c' || event.key === 'x')) {
        event.preventDefault()
        if (selectionPaths.length === 0) return
        if (event.key === 'c') controller.copy(sessionId, selectionPaths)
        else controller.cut(sessionId, selectionPaths)
        return
      }
      if (primary && event.key === 'v') {
        event.preventDefault()
        pasteInto(pasteDirectory)
        return
      }
      if (primary && event.key === 'a') {
        event.preventDefault()
        setSelected(new Set(rows.map(row => row.path)))
        return
      }
      if (event.key === 'Escape') {
        setMenu(null)
      }
    }

    const onContextMenu = (event: ReactMouseEvent, row: Row | null): void => {
      event.preventDefault()
      event.stopPropagation()
      if (row === null) {
        setMenu({ x: event.clientX, y: event.clientY, path: null })
        return
      }
      if (!selected.has(row.path)) {
        setSelected(new Set([row.path]))
        setAnchor(row.path)
        setFocusPath(row.path)
      }
      setMenu({ x: event.clientX, y: event.clientY, path: row.path })
    }

    const menuTarget = menu === null ? undefined : menu.path === null ? undefined : rowByPath.get(menu.path)
    const menuDirectory = menuTarget === undefined
      ? ''
      : menuTarget.kind === 'directory' ? menuTarget.path : parentOf(menuTarget.path)
    const menuPaths = menuTarget !== undefined && selectedRows.some(row => row.path === menuTarget.path)
      ? selectionPaths
      : menuTarget === undefined ? [] : [menuTarget.path]

    const startDrag = (event: DragEvent, row: Row): void => {
      if (!selected.has(row.path)) setSelected(new Set([row.path]))
      const paths = selected.has(row.path) && selectionPaths.length > 0 ? selectionPaths : [row.path]
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('application/x-codecraft-paths', JSON.stringify(paths))
      event.dataTransfer.setData('text/plain', paths.join('\n'))
    }

    const dragOver = (event: DragEvent, directory: string): void => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setDropTarget(directory)
    }

    const drop = (event: DragEvent, directory: string): void => {
      event.preventDefault()
      setDropTarget(null)
      const raw = event.dataTransfer.getData('application/x-codecraft-paths')
      if (raw === '') return
      let paths: string[] = []
      try {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) paths = parsed.filter((item): item is string => typeof item === 'string')
      } catch {
        return
      }
      if (paths.length === 0) return
      if (paths.every(path => parentOf(path) === directory)) return
      const invalid = paths.filter(path => isInside(path, directory))
      if (invalid.length > 0) {
        controller.toast(t('explorer.invalidDrop'), 'error')
        return
      }
      void controller.moveInto(sessionId, paths, directory)
    }

    if (cwd === undefined) {
      return <div className="cc-explorer cc-explorer-empty">{t('explorer.noWorkspace')}</div>
    }

    return (
      <div className="cc-explorer">
        <div className="cc-explorer-toolbar">
          <div className="cc-explorer-root" title={rootPath === '' ? cwd : rootPath}>
            <FileIcon
              className="cc-explorer-root-icon"
              name={rootPath === '' ? baseName(cwd) : baseName(rootPath)}
              path=""
              kind="root"
              expanded
            />
            <span>{rootPath === '' ? baseName(cwd) : baseName(rootPath)}</span>
          </div>
          <div className="cc-explorer-actions">
            <button type="button" title={t('explorer.newFile')} onClick={() => controller.openCreate(sessionId, '', 'file')}>
              {t('explorer.newFile')}
            </button>
            <button type="button" title={t('explorer.newFolder')} onClick={() => controller.openCreate(sessionId, '', 'directory')}>
              {t('explorer.newFolder')}
            </button>
            <button type="button" title={t('explorer.refresh')} onClick={() => {
              void load('')
              for (const directory of expanded) void load(directory)
            }}>
              {t('explorer.refresh')}
            </button>
          </div>
        </div>
        <div
          className="cc-explorer-tree"
          role="tree"
          aria-label={t('explorer.treeLabel')}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onClick={() => setMenu(null)}
          onDragOver={(event) => {
            if (event.target !== event.currentTarget) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            setDropTarget('')
          }}
          onDrop={(event) => drop(event, '')}
        >
          {rows.length === 0 && loading.has('') && <div className="cc-explorer-status">{t('explorer.loading')}</div>}
          {rows.length === 0 && !loading.has('') && errors[''] === undefined && (
            <div className="cc-explorer-status">{t('explorer.empty')}</div>
          )}
          {errors[''] !== undefined && <div className="cc-explorer-error">{errors['']}</div>}
          {rows.map(row => (
            <div
              key={row.path}
              role="treeitem"
              aria-level={row.depth + 1}
              aria-selected={selected.has(row.path)}
              aria-expanded={row.kind === 'directory' ? expanded.has(row.path) : undefined}
              className={[
                'cc-explorer-row',
                selected.has(row.path) ? 'is-selected' : '',
                focusPath === row.path ? 'is-focused' : '',
                dropTarget === row.path ? 'is-drop' : '',
                ui.clipboard?.mode === 'cut' && ui.clipboard.paths.includes(row.path) ? 'is-cut' : '',
              ].filter(Boolean).join(' ')}
              style={{ paddingLeft: `${6 + row.depth * 14}px` }}
              draggable
              data-kind={row.kind}
              onClick={(event) => {
                event.stopPropagation()
                chooseRow(event, row)
              }}
              onDoubleClick={(event) => {
                event.stopPropagation()
                if (row.kind !== 'directory') openFile(row.path)
              }}
              onContextMenu={(event) => onContextMenu(event, row)}
              onDragStart={(event) => startDrag(event, row)}
              onDragOver={(event) => {
                event.stopPropagation()
                if (row.kind === 'directory') dragOver(event, row.path)
              }}
              onDragLeave={() => {
                if (dropTarget === row.path) setDropTarget(null)
              }}
              onDrop={(event) => {
                event.stopPropagation()
                if (row.kind !== 'directory') return
                drop(event, row.path)
              }}
            >
              <button
                type="button"
                className="cc-explorer-chevron"
                tabIndex={-1}
                aria-label={expanded.has(row.path) ? t('explorer.collapse') : t('explorer.expand')}
                onClick={(event) => {
                  event.stopPropagation()
                  if (row.kind === 'directory') toggleDirectory(row.path)
                }}
              >
                {row.kind === 'directory' ? (expanded.has(row.path) ? '▾' : '▸') : ''}
              </button>
              <FileIcon
                className="cc-explorer-icon"
                name={row.name}
                path={row.path}
                kind={row.kind}
                expanded={row.kind === 'directory' && expanded.has(row.path)}
              />
              <span className="cc-explorer-name">{row.name}</span>
              {loading.has(row.path) && <span className="cc-explorer-spinner">…</span>}
              {errors[row.path] !== undefined && <span className="cc-explorer-row-error" title={errors[row.path]}>!</span>}
            </div>
          ))}
        </div>
        {selectedRows.length > 1 && (
          <div className="cc-explorer-selection">
            {t('explorer.selectedCount', { count: selectedRows.length })}
          </div>
        )}
        {ui.toast !== null && (
          <div className={`cc-explorer-toast ${ui.toast.tone === 'error' ? 'is-error' : ''}`} role="status">
            <span>{ui.toast.message}</span>
            <button type="button" onClick={() => controller.dismissToast()}>×</button>
          </div>
        )}
        {menu !== null && (
          <div
            className="cc-explorer-menu"
            role="menu"
            style={{ left: menu.x, top: menu.y }}
            onClick={(event) => event.stopPropagation()}
          >
            {menuTarget?.kind === 'file' && (
              <>
                <MenuItem label={t('explorer.open')} onClick={() => { setMenu(null); openFile(menuTarget.path) }} />
                <MenuItem label={t('explorer.rename')} onClick={() => { setMenu(null); controller.openRename(sessionId, menuTarget.path, 'file') }} />
              </>
            )}
            {menuTarget?.kind === 'directory' && (
              <>
                <MenuItem label={t('explorer.newFile')} onClick={() => { setMenu(null); controller.openCreate(sessionId, menuTarget.path, 'file') }} />
                <MenuItem label={t('explorer.newFolder')} onClick={() => { setMenu(null); controller.openCreate(sessionId, menuTarget.path, 'directory') }} />
                {menuDirectory !== '' && <MenuItem label={t('explorer.rename')} onClick={() => { setMenu(null); controller.openRename(sessionId, menuTarget.path, 'directory') }} />}
              </>
            )}
            {(menuTarget?.kind === 'directory' || menuTarget === undefined) && (
              <MenuItem
                label={t('explorer.paste')}
                disabled={ui.clipboard === null || ui.clipboard.sessionId !== sessionId}
                onClick={() => { setMenu(null); pasteInto(menuDirectory) }}
              />
            )}
            {menuTarget === undefined && (
              <>
                <MenuItem label={t('explorer.newFile')} onClick={() => { setMenu(null); controller.openCreate(sessionId, '', 'file') }} />
                <MenuItem label={t('explorer.newFolder')} onClick={() => { setMenu(null); controller.openCreate(sessionId, '', 'directory') }} />
                <MenuItem label={t('explorer.refresh')} onClick={() => { setMenu(null); void load('') }} />
              </>
            )}
            {menuPaths.length > 0 && (
              <>
                <MenuItem label={t('explorer.copy')} onClick={() => { setMenu(null); controller.copy(sessionId, menuPaths) }} />
                <MenuItem label={t('explorer.cut')} onClick={() => { setMenu(null); controller.cut(sessionId, menuPaths) }} />
                <MenuItem label={t('explorer.delete')} danger onClick={() => { setMenu(null); controller.openDelete(sessionId, menuPaths) }} />
                <MenuItem label={t('explorer.copyPath')} onClick={() => { setMenu(null); void controller.copyPath(sessionId, menuPaths[0] ?? '', false) }} />
                <MenuItem label={t('explorer.copyRelativePath')} onClick={() => { setMenu(null); void controller.copyPath(sessionId, menuPaths[0] ?? '', true) }} />
                <MenuItem label={t('explorer.reveal')} onClick={() => { setMenu(null); void controller.reveal(sessionId, menuPaths[0] ?? '') }} />
              </>
            )}
            {menuTarget?.kind === 'directory' && (
              <MenuItem label={t('explorer.refresh')} onClick={() => { setMenu(null); void load(menuTarget.path) }} />
            )}
          </div>
        )}
      </div>
    )
  }
}

function MenuItem(props: {
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}): ReactElement {
  return (
    <button
      type="button"
      role="menuitem"
      className={`cc-explorer-menu-item ${props.danger === true ? 'is-danger' : ''}`}
      disabled={props.disabled === true}
      onClick={props.disabled === true ? undefined : props.onClick}
    >
      {props.label}
    </button>
  )
}
