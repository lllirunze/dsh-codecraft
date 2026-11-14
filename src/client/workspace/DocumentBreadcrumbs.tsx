import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
} from 'react'
import { ApiCallError, listWorkspace } from '../api.js'
import { FileIcon } from '../icons/FileIcon.js'
import type { WorkspaceEntry } from '../../protocol.js'
import {
  activeDocumentBreadcrumb,
  documentBreadcrumbNodes,
  documentBreadcrumbVersion,
  sortBreadcrumbEntries,
  subscribeDocumentBreadcrumbs,
  type DocumentBreadcrumbNode,
} from './document-breadcrumbs.js'
import { parentOf } from './paths.js'

export interface DocumentBreadcrumbsProps {
  absolutePath?: string
  t: (key: string, params?: Record<string, string | number>) => string
}

interface MenuState {
  directory: string
  selectedPath?: string
  entries: WorkspaceEntry[]
  status: 'loading' | 'ready' | 'error'
  error?: string
  left: number
  top: number
}

/** Interactive file breadcrumb rendered through DSH's native document action seat. */
export function DocumentBreadcrumbs(props: DocumentBreadcrumbsProps): ReactElement | null {
  useSyncExternalStore(
    subscribeDocumentBreadcrumbs,
    documentBreadcrumbVersion,
    documentBreadcrumbVersion,
  )
  const controller = props.absolutePath === undefined
    ? undefined
    : activeDocumentBreadcrumb(props.absolutePath)
  const nodes = useMemo(() => controller === undefined
    ? []
    : documentBreadcrumbNodes(controller.workspaceName, controller.path), [
    controller?.workspaceName,
    controller?.path,
  ])
  const rootRef = useRef<HTMLDivElement | null>(null)
  const requestRef = useRef<{ generation: number; controller?: AbortController }>({ generation: 0 })
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [focusIndex, setFocusIndex] = useState(0)

  const load = useCallback(async (
    directory: string,
    selectedPath: string | undefined,
    position: { left: number; top: number },
  ): Promise<void> => {
    if (controller === undefined) return
    requestRef.current.controller?.abort()
    const request = new AbortController()
    const generation = requestRef.current.generation + 1
    requestRef.current = { generation, controller: request }
    setFocusIndex(0)
    setMenu({ directory, ...(selectedPath === undefined ? {} : { selectedPath }), entries: [], status: 'loading', ...position })
    try {
      const result = await listWorkspace({ sessionId: controller.sessionId, path: directory }, request.signal)
      if (request.signal.aborted || requestRef.current.generation !== generation) return
      setMenu(previous => previous === null ? null : {
        ...previous,
        directory: result.path,
        entries: sortBreadcrumbEntries(result.entries),
        status: 'ready',
        error: undefined,
      })
    } catch (failure) {
      if (request.signal.aborted || requestRef.current.generation !== generation) return
      const message = failure instanceof ApiCallError
        ? failure.message
        : props.t('breadcrumb.readFailed')
      setMenu(previous => previous === null ? null : {
        ...previous,
        entries: [],
        status: 'error',
        error: message,
      })
    }
  }, [controller?.sessionId, props.t])

  const close = useCallback((): void => {
    requestRef.current.controller?.abort()
    requestRef.current = { generation: requestRef.current.generation + 1 }
    setMenu(null)
  }, [])

  useEffect(() => close, [close])
  useEffect(() => { close() }, [controller?.sessionId, controller?.path, close])
  useEffect(() => {
    if (menu === null) return
    const outside = (event: PointerEvent): void => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return
      close()
    }
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', outside, true)
    window.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      window.removeEventListener('keydown', escape, true)
    }
  }, [menu, close])
  useEffect(() => {
    if (menu === null) return
    const frame = window.requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLButtonElement>('[data-breadcrumb-menu-item]:not(:disabled)')
        ?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [menu?.directory, menu?.status])

  if (controller === undefined || nodes.length === 0) return null

  const openNode = (node: DocumentBreadcrumbNode, button: HTMLButtonElement): void => {
    if (menu !== null && menu.directory === node.browsePath && menu.selectedPath === node.selectedPath) {
      close()
      return
    }
    const bounds = button.getBoundingClientRect()
    void load(node.browsePath, node.selectedPath, {
      left: Math.max(8, Math.min(bounds.left, window.innerWidth - 328)),
      top: Math.min(bounds.bottom + 5, window.innerHeight - 280),
    })
  }

  const retry = (): void => {
    if (menu === null) return
    void load(menu.directory, menu.selectedPath, { left: menu.left, top: menu.top })
  }

  const enterDirectory = (path: string): void => {
    if (menu === null) return
    void load(path, undefined, { left: menu.left, top: menu.top })
  }

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-breadcrumb-menu-item]:not(:disabled)'))
    if (items.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      const next = (focusIndex + delta + items.length) % items.length
      setFocusIndex(next)
      items[next]?.focus()
    }
  }

  const location = menu?.directory === ''
    ? controller.workspaceName
    : `${controller.workspaceName}/${menu?.directory ?? ''}`
  const menuStyle = menu === null ? undefined : {
    '--cc-breadcrumb-left': `${menu.left}px`,
    '--cc-breadcrumb-top': `${menu.top}px`,
  } as CSSProperties

  return (
    <div ref={rootRef} className="dsh-codecraft-file-breadcrumbs">
      <nav className="cc-file-breadcrumbs" aria-label={props.t('breadcrumb.label')}>
        {nodes.map((node, index) => (
          <span key={`${node.kind}:${node.path}`} className="cc-file-breadcrumb">
            {index > 0 && <span className="cc-file-breadcrumb-separator" aria-hidden="true">›</span>}
            <button
              type="button"
              className="cc-file-breadcrumb-button"
              data-current={node.kind === 'file' ? '' : undefined}
              title={node.name}
              onClick={event => openNode(node, event.currentTarget)}
            >
              {node.name}
            </button>
          </span>
        ))}
      </nav>
      {menu !== null && (
        <div
          className="cc-file-breadcrumb-menu"
          role="menu"
          aria-label={props.t('breadcrumb.menuLabel')}
          style={menuStyle}
          onKeyDown={onMenuKeyDown}
        >
          <div className="cc-file-breadcrumb-location" title={location}>{location}</div>
          {menu.directory !== '' && (
            <button
              type="button"
              role="menuitem"
              data-breadcrumb-menu-item=""
              className="cc-file-breadcrumb-menu-item"
              onClick={() => enterDirectory(parentOf(menu.directory))}
            >
              <span className="cc-file-breadcrumb-up" aria-hidden="true">↑</span>
              <span>{props.t('breadcrumb.parent')}</span>
            </button>
          )}
          {menu.status === 'loading' && <div className="cc-file-breadcrumb-message">{props.t('breadcrumb.loading')}</div>}
          {menu.status === 'error' && (
            <div className="cc-file-breadcrumb-message is-error" role="alert">
              <span>{menu.error}</span>
              <button type="button" onClick={retry}>{props.t('breadcrumb.retry')}</button>
            </div>
          )}
          {menu.status === 'ready' && menu.entries.length === 0 && (
            <div className="cc-file-breadcrumb-message">{props.t('breadcrumb.empty')}</div>
          )}
          {menu.status === 'ready' && menu.entries.map(entry => {
            const directory = entry.kind === 'directory'
            const selectable = directory || entry.kind === 'file'
            return (
              <button
                key={entry.path}
                type="button"
                role="menuitem"
                data-breadcrumb-menu-item=""
                aria-current={entry.path === menu.selectedPath ? 'true' : undefined}
                className="cc-file-breadcrumb-menu-item"
                disabled={!selectable}
                onClick={() => {
                  if (directory) enterDirectory(entry.path)
                  else {
                    controller.openFile(entry.path)
                    close()
                  }
                }}
              >
                <FileIcon
                  className="cc-file-breadcrumb-icon"
                  name={entry.name}
                  path={entry.path}
                  kind={entry.kind}
                  expanded={false}
                />
                <span title={entry.name}>{entry.name}</span>
                {directory && <span aria-hidden="true">›</span>}
                {entry.path === menu.selectedPath && <span aria-label={props.t('breadcrumb.current')}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

