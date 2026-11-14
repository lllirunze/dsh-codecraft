import type { WorkspaceEntry } from '../../protocol.js'
import { baseName, parentOf } from './paths.js'

export interface DocumentBreadcrumbNode {
  path: string
  name: string
  kind: 'root' | 'directory' | 'file'
  browsePath: string
  selectedPath?: string
}

export interface DocumentBreadcrumbController {
  absolutePath: string
  sessionId: string
  path: string
  openFile(path: string): void
}

export interface ActiveDocumentBreadcrumb extends DocumentBreadcrumbController {
  workspaceRoot: string
  workspaceName: string
}

type RootReader = (sessionId: string) => string | undefined

const controllers = new Map<string, DocumentBreadcrumbController>()
const listeners = new Set<() => void>()
let rootReader: RootReader | undefined
let version = 0

function emit(): void {
  version += 1
  for (const listener of listeners) listener()
}

/** Bind the public Sessions snapshot used to label and scope document paths. */
export function bindDocumentBreadcrumbRuntime(reader: RootReader): () => void {
  rootReader = reader
  emit()
  return () => {
    if (rootReader !== reader) return
    rootReader = undefined
    emit()
  }
}

/** Publish one live CodeCraft document to the native header action. */
export function setDocumentBreadcrumbController(controller: DocumentBreadcrumbController): () => void {
  const previous = controllers.get(controller.absolutePath)
  controllers.set(controller.absolutePath, controller)
  if (previous !== controller) emit()
  return () => {
    if (controllers.get(controller.absolutePath) !== controller) return
    controllers.delete(controller.absolutePath)
    emit()
  }
}

export function subscribeDocumentBreadcrumbs(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function documentBreadcrumbVersion(): number {
  return version
}

export function activeDocumentBreadcrumb(absolutePath: string): ActiveDocumentBreadcrumb | undefined {
  const controller = controllers.get(absolutePath)
  if (controller === undefined) return undefined
  const workspaceRoot = rootReader?.(controller.sessionId)
  if (workspaceRoot === undefined || workspaceRoot === '') return undefined
  const withoutTrailingSeparators = workspaceRoot.replace(/[\\/]+$/, '')
  const workspaceName = baseName(withoutTrailingSeparators === '' ? workspaceRoot : withoutTrailingSeparators)
  return {
    ...controller,
    workspaceRoot,
    workspaceName: workspaceName === '' ? workspaceRoot : workspaceName,
  }
}

/** Project one authorized relative file path to its final at most three nodes. */
export function documentBreadcrumbNodes(
  workspaceName: string,
  filePath: string,
): DocumentBreadcrumbNode[] {
  const normalized = filePath.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  const parts = normalized === '' ? [] : normalized.split('/')
  if (workspaceName === '' || parts.length === 0 || parts.some(part => part === '' || part === '.' || part === '..')) {
    return []
  }
  const nodes: DocumentBreadcrumbNode[] = [{
    path: '',
    name: workspaceName,
    kind: 'root',
    browsePath: '',
  }]
  for (let index = 0; index < parts.length; index += 1) {
    const path = parts.slice(0, index + 1).join('/')
    const file = index === parts.length - 1
    nodes.push({
      path,
      name: parts[index] as string,
      kind: file ? 'file' : 'directory',
      browsePath: file ? parentOf(path) : parentOf(path),
      ...(file ? {} : { selectedPath: path }),
    })
  }
  return nodes.slice(-3)
}

/** Stable Explorer ordering shared by the breadcrumb menu. */
export function sortBreadcrumbEntries(entries: readonly WorkspaceEntry[]): WorkspaceEntry[] {
  return [...entries].sort((left, right) => {
    const leftDirectory = left.kind === 'directory'
    const rightDirectory = right.kind === 'directory'
    if (leftDirectory !== rightDirectory) return leftDirectory ? -1 : 1
    return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' })
  })
}

