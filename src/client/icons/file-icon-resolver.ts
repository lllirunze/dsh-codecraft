/** Deterministic in-memory Material icon resolution for Explorer rows. */

import type { WorkspaceEntry } from '../../protocol.js'
import {
  MATERIAL_ICON_FILES,
  MATERIAL_ICON_MANIFEST,
} from './material-icons.generated.js'

export interface FileIconInput {
  name: string
  path?: string
  kind: WorkspaceEntry['kind'] | 'root'
  expanded?: boolean
}

export interface ResolvedFileIcon {
  id: string
  fileName: string
}

type StringMap = Readonly<Record<string, string>>

/** Resolve an icon id without reading file content, disk, or network state. */
export function resolveFileIconId(input: FileIconInput): string | undefined {
  if (input.kind === 'root') {
    const name = normalizedName(input)
    if (input.expanded === false) {
      return lookup(MATERIAL_ICON_MANIFEST.rootFolderNames, name)
        ?? MATERIAL_ICON_MANIFEST.defaults.rootFolder
    }
    return lookup(MATERIAL_ICON_MANIFEST.rootFolderNamesExpanded, name)
      ?? lookup(MATERIAL_ICON_MANIFEST.rootFolderNames, name)
      ?? MATERIAL_ICON_MANIFEST.defaults.rootFolderExpanded
  }
  if (input.kind === 'directory') {
    const name = normalizedName(input)
    const closed = lookup(MATERIAL_ICON_MANIFEST.folderNames, name)
    if (closed === undefined) return undefined
    if (input.expanded !== true) return closed
    return lookup(MATERIAL_ICON_MANIFEST.folderNamesExpanded, name)
      ?? closed
  }
  if (input.kind !== 'file') return undefined

  const name = normalizedName(input)
  const exact = lookup(MATERIAL_ICON_MANIFEST.fileNames, name)
  if (exact !== undefined) return exact
  for (const extension of extensionCandidates(name)) {
    const icon = lookup(MATERIAL_ICON_MANIFEST.fileExtensions, extension)
    if (icon !== undefined) return icon
  }
  return undefined
}

/** Resolve a mapped icon only; unmatched or incomplete entries use the built-in UI icon. */
export function resolveFileIcon(input: FileIconInput): ResolvedFileIcon {
  const id = resolveFileIconId(input)
  if (id === undefined) return { id: 'default', fileName: '' }
  return {
    id,
    fileName: MATERIAL_ICON_FILES[id] ?? '',
  }
}

function normalizedName(input: FileIconInput): string {
  const source = input.name !== ''
    ? input.name
    : (input.path ?? '').replaceAll('\\', '/').split('/').pop() ?? ''
  return source.toLocaleLowerCase('en-US')
}

/** Longest compound extension first, followed by successively shorter forms. */
function extensionCandidates(name: string): string[] {
  const candidates: string[] = []
  for (let index = name.indexOf('.'); index >= 0; index = name.indexOf('.', index + 1)) {
    const extension = name.slice(index + 1)
    if (extension !== '') candidates.push(extension)
  }
  return candidates
}

function lookup(map: StringMap, key: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined
}
