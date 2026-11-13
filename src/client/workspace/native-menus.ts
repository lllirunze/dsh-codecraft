/**
 * Native file-tree context-menu contributions.
 *
 * DSH's own tree already dispatches `file` and `directory` targets, so these
 * actions appear without replacing the tree or its DOM.
 *
 * @module dsh-codecraft/client/workspace/native-menus
 */

import { sessionFileAddress } from '../address.js'
import type { SidebarRightService } from '../dsh.js'
import type { WorkspaceController } from './controller.js'
import { normalizePath } from './controller.js'

interface FileTarget {
  sessionId: string
  path: string
  paneId?: string
}

interface DirectoryTarget {
  sessionId: string
  path: string
}

interface MenuAction {
  id: string
  label: string
  disabled?: boolean
  danger?: boolean
  separatorBefore?: boolean
  run?: () => void
}

interface ContextMenuRegistrar {
  register(input: {
    id: string
    target: 'file' | 'directory'
    order?: number
    resolve: (target: FileTarget | DirectoryTarget, signal: AbortSignal) => MenuAction[] | Promise<MenuAction[]>
  }): () => void
}

export interface NativeMenuServices {
  contextMenus: ContextMenuRegistrar
  sidebarRight: SidebarRightService
  t: (key: string, params?: Record<string, string | number>) => string
}

/** Register the file and directory menu sections. */
export function registerNativeMenus(
  services: NativeMenuServices,
  controller: WorkspaceController,
): () => void {
  const { contextMenus, sidebarRight, t } = services
  const fileDisposer = contextMenus.register({
    id: 'codecraft.file',
    target: 'file',
    order: 210,
    resolve: (raw) => {
      const target = raw as FileTarget
      const root = controller.rootOf(target.sessionId)
      if (root === undefined) return []
      const path = normalizePath(root, target.path)
      return [
        {
          id: 'codecraft.file.open',
          label: t('explorer.open'),
          run: () => { sidebarRight.openResource(sessionFileAddress(target.sessionId, path)) },
        },
        {
          id: 'codecraft.file.rename',
          label: t('explorer.rename'),
          separatorBefore: true,
          run: () => controller.openRename(target.sessionId, path, 'file'),
        },
        {
          id: 'codecraft.file.copy',
          label: t('explorer.copy'),
          run: () => controller.copy(target.sessionId, [path]),
        },
        {
          id: 'codecraft.file.cut',
          label: t('explorer.cut'),
          run: () => controller.cut(target.sessionId, [path]),
        },
        {
          id: 'codecraft.file.delete',
          label: t('explorer.delete'),
          danger: true,
          run: () => controller.openDelete(target.sessionId, [path]),
        },
        {
          id: 'codecraft.file.copy-path',
          label: t('explorer.copyPath'),
          separatorBefore: true,
          run: () => { void controller.copyPath(target.sessionId, path, false) },
        },
        {
          id: 'codecraft.file.copy-relative',
          label: t('explorer.copyRelativePath'),
          run: () => { void controller.copyPath(target.sessionId, path, true) },
        },
        {
          id: 'codecraft.file.reveal',
          label: t('explorer.reveal'),
          run: () => { void controller.reveal(target.sessionId, path) },
        },
      ]
    },
  })
  const directoryDisposer = contextMenus.register({
    id: 'codecraft.directory',
    target: 'directory',
    order: 210,
    resolve: (raw) => {
      const target = raw as DirectoryTarget
      const root = controller.rootOf(target.sessionId)
      if (root === undefined) return []
      const path = normalizePath(root, target.path)
      const clipboard = controller.getSnapshot().clipboard
      const pasteable = clipboard !== null && clipboard.sessionId === target.sessionId
      const isRoot = path === ''
      return [
        {
          id: 'codecraft.directory.new-file',
          label: t('explorer.newFile'),
          run: () => controller.openCreate(target.sessionId, path, 'file'),
        },
        {
          id: 'codecraft.directory.new-folder',
          label: t('explorer.newFolder'),
          run: () => controller.openCreate(target.sessionId, path, 'directory'),
        },
        {
          id: 'codecraft.directory.paste',
          label: t('explorer.paste'),
          disabled: !pasteable,
          run: () => { void controller.pasteInto(target.sessionId, path) },
        },
        ...(isRoot ? [] : [{
          id: 'codecraft.directory.rename',
          label: t('explorer.rename'),
          separatorBefore: true,
          run: () => controller.openRename(target.sessionId, path, 'directory' as const),
        }]),
        {
          id: 'codecraft.directory.copy',
          label: t('explorer.copy'),
          disabled: isRoot,
          run: () => { if (!isRoot) controller.copy(target.sessionId, [path]) },
        },
        {
          id: 'codecraft.directory.cut',
          label: t('explorer.cut'),
          disabled: isRoot,
          run: () => { if (!isRoot) controller.cut(target.sessionId, [path]) },
        },
        {
          id: 'codecraft.directory.delete',
          label: t('explorer.delete'),
          danger: true,
          disabled: isRoot,
          run: () => { if (!isRoot) controller.openDelete(target.sessionId, [path]) },
        },
        {
          id: 'codecraft.directory.refresh',
          label: t('explorer.refresh'),
          separatorBefore: true,
          run: () => controller.refresh(target.sessionId),
        },
        {
          id: 'codecraft.directory.copy-path',
          label: t('explorer.copyPath'),
          run: () => { void controller.copyPath(target.sessionId, path, false) },
        },
        {
          id: 'codecraft.directory.reveal',
          label: t('explorer.reveal'),
          run: () => { void controller.reveal(target.sessionId, path) },
        },
      ]
    },
  })
  return () => {
    fileDisposer()
    directoryDisposer()
  }
}
