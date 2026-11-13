/**
 * Workspace path, name, and target validation for Explorer operations.
 *
 * The browser sends Session-relative paths; every absolute path is recomputed
 * here from the Session's canonical workspace root. Validation never trusts a
 * caller-supplied root and never follows a final symlink.
 *
 * @module dsh-codecraft/host/workspace/paths
 */

import { lstat, readdir, realpath, stat } from 'node:fs/promises'
import path from 'node:path'

import { CodeCraftError } from '../errors.js'
import { ERROR_CODES } from '../../protocol.js'

/** A workspace root in both the spelling the Session gave and its real path. */
export interface WorkspaceRoot {
  /** Absolute root as resolved for the Session. */
  root: string
  /** Canonical root after realpath; all containment checks use this. */
  real: string
}

/** One validated absolute target and its `/`-separated relative spelling. */
export interface ResolvedTarget {
  absolute: string
  /** Workspace-relative path; empty for the root itself. */
  relative: string
  kind: 'file' | 'directory' | 'symlink' | 'other' | 'absent'
}

/** Windows device names, case-insensitive and valid with an extension. */
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i

/** Characters Windows rejects in a file name. */
const WINDOWS_ILLEGAL = /[<>:"/\\|?*]/

/** C0 controls are rejected on every platform. */
const CONTROL = /[\u0000-\u001f]/

/** Whether `target` is inside `root` (or equal to it). */
export function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

/** Resolve and canonicalize one Session workspace root. */
export async function canonicalWorkspace(root: string): Promise<WorkspaceRoot> {
  const resolved = path.resolve(root)
  let real: string
  try {
    real = await realpath(resolved)
    const info = await stat(real)
    if (!info.isDirectory()) throw new Error('not a directory')
  } catch {
    throw new CodeCraftError(ERROR_CODES.workspaceUnavailable, '工作区目录不可用。')
  }
  return { root: resolved, real }
}

/** Convert an OS path to the protocol's `/`-separated relative spelling. */
export function toProtocolPath(absolute: string, workspace: WorkspaceRoot): string {
  return path.relative(workspace.real, absolute).split(path.sep).join('/')
}

/** Join one workspace-relative path with a single child name. */
export function joinRelative(parent: string, name: string): string {
  return parent === '' ? name : `${parent}/${name}`
}

/** Split a workspace-relative path into validated segments. */
export function relativeSegments(requested: string): string[] {
  if (requested === '') return []
  if (requested.includes('\0')) throw new CodeCraftError(ERROR_CODES.badRequest, '路径包含空字符。')
  const segments = requested.split('/')
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') {
      throw new CodeCraftError(ERROR_CODES.outsideWorkspace, '路径不是有效的工作区相对路径。')
    }
  }
  return segments
}

/**
 * Resolve one requested path against the canonical workspace.
 * @param workspace - canonical workspace root.
 * @param requested - absolute path, or workspace-relative `/` path; empty is the root.
 * @returns the validated target; a missing final component has kind `absent`.
 */
export async function resolveTarget(
  workspace: WorkspaceRoot,
  requested: string,
): Promise<ResolvedTarget> {
  if (typeof requested !== 'string' || requested.includes('\0')) {
    throw new CodeCraftError(ERROR_CODES.badRequest, '路径无效。')
  }
  let absolute: string
  if (path.isAbsolute(requested)) {
    absolute = path.resolve(requested)
  } else {
    relativeSegments(requested)
    absolute = path.resolve(workspace.real, ...requested.split('/').filter(Boolean))
  }
  if (!isWithin(workspace.real, absolute)) {
    throw new CodeCraftError(ERROR_CODES.outsideWorkspace, '路径超出当前工作区。')
  }
  const relative = toProtocolPath(absolute, workspace)
  if (relative === '') return { absolute, relative, kind: 'directory' }

  const parent = path.dirname(absolute)
  let parentReal: string
  try {
    parentReal = await realpath(parent)
  } catch {
    throw new CodeCraftError(ERROR_CODES.notFound, '目标目录不存在。')
  }
  if (!isWithin(workspace.real, parentReal)) {
    throw new CodeCraftError(ERROR_CODES.outsideWorkspace, '目标目录经符号链接指向工作区外。')
  }
  absolute = path.join(parentReal, path.basename(absolute))

  try {
    const info = await lstat(absolute)
    return {
      absolute,
      relative,
      kind: info.isSymbolicLink()
        ? 'symlink'
        : info.isDirectory()
          ? 'directory'
          : info.isFile()
            ? 'file'
            : 'other',
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { absolute, relative, kind: 'absent' }
    }
    throw new CodeCraftError(ERROR_CODES.internal, '无法读取目标路径。')
  }
}

/** Resolve an existing directory that will receive new children. */
export async function resolveDirectory(
  workspace: WorkspaceRoot,
  requested: string,
): Promise<ResolvedTarget> {
  const target = await resolveTarget(workspace, requested)
  if (target.kind === 'symlink') {
    throw new CodeCraftError(ERROR_CODES.symlinkTarget, '不能通过符号链接执行文件操作。')
  }
  if (target.kind !== 'directory') {
    throw new CodeCraftError(ERROR_CODES.notDirectory, '目标不是文件夹。')
  }
  return target
}

/** Validate one file or folder name for the target platform. */
export function validateName(name: string, platform: NodeJS.Platform = process.platform): string | null {
  if (name.length === 0) return '名称不能为空。'
  if (name === '.' || name === '..') return '名称不能是 . 或 ..。'
  if (Buffer.byteLength(name, 'utf8') > 255) return '名称过长。'
  if (name.includes('/') || name.includes('\\')) return '名称不能包含路径分隔符。'
  if (CONTROL.test(name)) return '名称不能包含控制字符。'
  if (platform === 'win32') {
    if (WINDOWS_ILLEGAL.test(name)) return '名称包含 Windows 不允许的字符。'
    if (/[. ]$/.test(name)) return '名称不能以空格或句点结尾。'
    if (WINDOWS_RESERVED.test(name)) return '名称是 Windows 保留设备名。'
  }
  if (platform === 'darwin' && name.includes(':')) return '名称包含 macOS 不允许的冒号。'
  return null
}

/** Throw when one name is not valid for the receiver platform. */
export function assertName(name: string, platform: NodeJS.Platform = process.platform): void {
  const problem = validateName(name, platform)
  if (problem !== null) throw new CodeCraftError(ERROR_CODES.invalidName, problem)
}

/**
 * Detect a case-only collision on a case-insensitive platform.
 * @returns the existing sibling spelling, or undefined.
 */
export async function caseCollision(
  parent: string,
  name: string,
  platform: NodeJS.Platform = process.platform,
): Promise<string | undefined> {
  if (platform === 'linux') return undefined
  const entries = await readdir(parent)
  const lower = name.toLocaleLowerCase()
  return entries.find(entry => entry !== name && entry.toLocaleLowerCase() === lower)
}

/** Whether a target exists without following its final symlink. */
export async function exists(target: string): Promise<boolean> {
  try {
    await lstat(target)
    return true
  } catch {
    return false
  }
}

/** Build a collision-safe copy name without touching the filesystem. */
export function copyName(name: string, kind: 'file' | 'directory' | 'symlink' | 'other', index: number): string {
  const suffix = index <= 1 ? ' copy' : ` copy ${index}`
  if (kind === 'directory') return `${name}${suffix}`
  const extension = path.extname(name)
  if (extension === '' || extension === name) return `${name}${suffix}`
  return `${name.slice(0, -extension.length)}${suffix}${extension}`
}
