/**
 * Serialized workspace file operations for the CodeCraft Explorer.
 *
 * Every path is re-validated against the Session's canonical root. Operations
 * are serialized per workspace so two browser commands cannot interleave.
 * Copy and move stage through a temporary sibling and swap only after the copy
 * succeeds, so an expected failure leaves the source (and an overwrite target)
 * intact.
 *
 * @module dsh-codecraft/host/workspace/operations
 */

import { randomUUID } from 'node:crypto'
import { cp, lstat, mkdir, open, readdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'

import { CodeCraftError } from '../errors.js'
import {
  ERROR_CODES,
  type WorkspaceChangedPath,
  type WorkspaceConflictPolicy,
  type WorkspaceEntry,
  type WorkspaceListResult,
  type WorkspaceOperation,
  type WorkspaceOperationFailure,
  type WorkspaceOperationItem,
  type WorkspaceOperationResult,
  type WorkspacePreflightItem,
  type WorkspacePreflightResult,
} from '../../protocol.js'
import {
  assertName,
  canonicalWorkspace,
  caseCollision,
  copyName,
  exists,
  joinRelative,
  resolveDirectory,
  resolveTarget,
  toProtocolPath,
  type ResolvedTarget,
  type WorkspaceRoot,
} from './paths.js'
import { moveToTrash } from './trash.js'

/** The subset of copy/move used by preflight. */
type TransferOperation = Extract<WorkspaceOperation, { kind: 'copy' | 'move' }>

/** Injectable seams for tests and platform simulation. */
export interface WorkspaceServiceOptions {
  platform?: NodeJS.Platform
  trash?: (target: string) => Promise<string>
}

/** File-operation service shared by the Host route. */
export class WorkspaceService {
  private readonly locks = new Map<string, Promise<void>>()
  private readonly platform: NodeJS.Platform
  private readonly trash: (target: string) => Promise<string>

  constructor(options: WorkspaceServiceOptions = {}) {
    this.platform = options.platform ?? process.platform
    this.trash = options.trash ?? moveToTrash
  }

  /** List one directory with workspace-relative entries. */
  async list(root: string, requested: string): Promise<WorkspaceListResult> {
    const workspace = await canonicalWorkspace(root)
    const directory = await resolveDirectory(workspace, requested)
    const dirents = await readdir(directory.absolute, { withFileTypes: true })
    const entries = await mapLimit(dirents, 32, async (dirent) => {
      const relative = joinRelative(directory.relative, dirent.name)
      const absolute = path.join(directory.absolute, dirent.name)
      const kind: WorkspaceEntry['kind'] = dirent.isSymbolicLink()
        ? 'symlink'
        : dirent.isDirectory()
          ? 'directory'
          : dirent.isFile()
            ? 'file'
            : 'other'
      const entry: WorkspaceEntry = {
        path: relative,
        name: dirent.name,
        kind,
        hidden: dirent.name.startsWith('.'),
      }
      if (kind === 'file') {
        try {
          const info = await lstat(absolute)
          entry.size = info.size
        } catch {
          // A concurrently removed entry is still listed once; the next refresh corrects it.
        }
      }
      return entry
    })
    return { root: workspace.root, path: directory.relative, entries }
  }

  /** Preflight a copy/move batch without touching the filesystem. */
  async preflight(root: string, operation: TransferOperation): Promise<WorkspacePreflightResult> {
    const workspace = await canonicalWorkspace(root)
    const targetDirectory = await resolveDirectory(workspace, operation.targetDirectory)
    const items: WorkspacePreflightItem[] = []
    for (const requested of unique(operation.paths)) {
      const source = await resolveTarget(workspace, requested)
      assertExisting(source)
      assertNotSelfOrDescendant(source, targetDirectory)
      const targetPath = joinRelative(targetDirectory.relative, path.posix.basename(source.relative))
      const target = await resolveTarget(workspace, targetPath)
      items.push({
        path: source.relative,
        targetPath,
        exists: target.kind !== 'absent',
        ...(target.kind === 'absent' ? {} : { targetKind: target.kind }),
      })
    }
    return { items }
  }

  /** Run one operation; individual item failures are reported, not thrown. */
  async run(root: string, operation: WorkspaceOperation): Promise<WorkspaceOperationResult> {
    const workspace = await canonicalWorkspace(root)
    return this.serial(workspace, async () => {
      switch (operation.kind) {
        case 'createFile':
          return this.createFile(workspace, operation)
        case 'createDirectory':
          return this.createDirectory(workspace, operation)
        case 'rename':
          return this.rename(workspace, operation)
        case 'copy':
          return this.transfer(workspace, operation, 'copy')
        case 'move':
          return this.transfer(workspace, operation, 'move')
        case 'delete':
          return this.delete(workspace, operation)
      }
    })
  }

  /** Serialize destructive work for one canonical workspace. */
  private async serial<T>(workspace: WorkspaceRoot, task: () => Promise<T>): Promise<T> {
    const key = workspace.real
    const previous = this.locks.get(key) ?? Promise.resolve()
    const current = previous.then(task, task)
    const settled = current.then(() => undefined, () => undefined)
    this.locks.set(key, settled)
    try {
      return await current
    } finally {
      if (this.locks.get(key) === settled) this.locks.delete(key)
    }
  }

  private async createFile(
    workspace: WorkspaceRoot,
    operation: Extract<WorkspaceOperation, { kind: 'createFile' }>,
  ): Promise<WorkspaceOperationResult> {
    const result = emptyResult()
    let target: ResolvedTarget
    try {
      target = await this.newTarget(workspace, operation.path)
    } catch (error) {
      result.failed.push(failure(operation.path, error, '无法创建文件。'))
      return result
    }
    let handle
    try {
      handle = await open(target.absolute, 'wx')
      if (operation.content !== undefined && operation.content !== '') {
        await handle.writeFile(operation.content, 'utf8')
      }
      result.succeeded.push({ path: target.relative })
      result.changedPaths.push({ from: target.relative, kind: 'created' })
    } catch (error) {
      result.failed.push(failure(target.relative, error, '无法创建文件。'))
    } finally {
      await handle?.close().catch(() => undefined)
    }
    return result
  }

  private async createDirectory(
    workspace: WorkspaceRoot,
    operation: Extract<WorkspaceOperation, { kind: 'createDirectory' }>,
  ): Promise<WorkspaceOperationResult> {
    const result = emptyResult()
    let target: ResolvedTarget
    try {
      target = await this.newTarget(workspace, operation.path)
    } catch (error) {
      result.failed.push(failure(operation.path, error, '无法创建文件夹。'))
      return result
    }
    try {
      await mkdir(target.absolute)
      result.succeeded.push({ path: target.relative })
      result.changedPaths.push({ from: target.relative, kind: 'created' })
    } catch (error) {
      result.failed.push(failure(target.relative, error, '无法创建文件夹。'))
    }
    return result
  }

  private async rename(
    workspace: WorkspaceRoot,
    operation: Extract<WorkspaceOperation, { kind: 'rename' }>,
  ): Promise<WorkspaceOperationResult> {
    const source = await resolveTarget(workspace, operation.path)
    assertExisting(source)
    assertNotRoot(source)
    assertName(operation.newName, this.platform)
    const parent = path.dirname(source.absolute)
    const destination = path.join(parent, operation.newName)
    const destinationRelative = toProtocolPath(destination, workspace)
    const result = emptyResult()

    if (source.relative === destinationRelative) {
      result.succeeded.push({ path: source.relative, to: source.relative })
      return result
    }
    const collision = await caseCollision(parent, operation.newName, this.platform)
    if (collision !== undefined && collision !== path.basename(source.absolute)) {
      result.failed.push({
        path: source.relative,
        code: ERROR_CODES.alreadyExists,
        message: '目标名称已存在（大小写不敏感冲突）。',
      })
      return result
    }
    const caseOnly = source.absolute !== destination
      && source.absolute.toLocaleLowerCase() === destination.toLocaleLowerCase()
    if (!caseOnly && await exists(destination)) {
      result.failed.push({
        path: source.relative,
        code: ERROR_CODES.alreadyExists,
        message: '目标名称已存在。',
      })
      return result
    }
    try {
      await rename(source.absolute, destination)
      result.succeeded.push({ path: source.relative, to: destinationRelative })
      result.changedPaths.push({ from: source.relative, to: destinationRelative, kind: 'renamed' })
    } catch (error) {
      result.failed.push(failure(source.relative, error, '无法重命名。'))
    }
    return result
  }

  private async transfer(
    workspace: WorkspaceRoot,
    operation: TransferOperation,
    mode: 'copy' | 'move',
  ): Promise<WorkspaceOperationResult> {
    const targetDirectory = await resolveDirectory(workspace, operation.targetDirectory)
    const result = emptyResult()
    const reserved = new Set<string>()

    for (const requested of unique(operation.paths)) {
      let source: ResolvedTarget
      try {
        source = await resolveTarget(workspace, requested)
        assertExisting(source)
        assertNotRoot(source)
        assertNotSelfOrDescendant(source, targetDirectory)
      } catch (error) {
        result.failed.push(failure(requested, error, '无法读取源项目。'))
        continue
      }

      const desired = joinRelative(targetDirectory.relative, path.posix.basename(source.relative))
      let destinationRelative: string
      try {
        destinationRelative = await this.resolveTransferTarget(
          workspace,
          source,
          targetDirectory,
          desired,
          operation.conflict,
          operation.confirmedOverwrite === true,
          reserved,
        )
      } catch (error) {
        result.failed.push(failure(source.relative, error, '目标已存在。'))
        continue
      }
      reserved.add(destinationRelative)
      const destination = await resolveTarget(workspace, destinationRelative)

      try {
        if (mode === 'copy') {
          await this.copyInto(source, destination, operation.conflict === 'overwrite' && operation.confirmedOverwrite === true)
          result.changedPaths.push({ from: source.relative, to: destinationRelative, kind: 'copied' })
        } else {
          const warning = await this.moveInto(source, destination, operation.conflict === 'overwrite' && operation.confirmedOverwrite === true)
          if (warning !== undefined) result.warnings.push(warning)
          result.changedPaths.push({ from: source.relative, to: destinationRelative, kind: 'moved' })
        }
        result.succeeded.push({ path: source.relative, to: destinationRelative })
      } catch (error) {
        result.failed.push(failure(source.relative, error, mode === 'copy' ? '无法复制。' : '无法移动。'))
      }
    }
    return result
  }

  /** Decide the final destination for one copy/move item. */
  private async resolveTransferTarget(
    workspace: WorkspaceRoot,
    source: ResolvedTarget,
    targetDirectory: ResolvedTarget,
    desired: string,
    conflict: WorkspaceConflictPolicy,
    confirmedOverwrite: boolean,
    reserved: Set<string>,
  ): Promise<string> {
    const target = await resolveTarget(workspace, desired)
    const taken = target.kind !== 'absent' || reserved.has(desired)
    if (!taken) return desired
    if (conflict === 'skip') {
      throw new CodeCraftError(ERROR_CODES.alreadyExists, '目标已存在，已跳过。')
    }
    if (conflict === 'rename' || reserved.has(desired)) {
      const name = path.posix.basename(source.relative)
      for (let index = 1; index < 1000; index += 1) {
        const candidate = joinRelative(targetDirectory.relative, copyName(name, source.kind as 'file' | 'directory' | 'symlink' | 'other', index))
        if (!reserved.has(candidate) && !await exists(path.join(workspace.real, ...candidate.split('/')))) {
          return candidate
        }
      }
      throw new CodeCraftError(ERROR_CODES.alreadyExists, '无法生成不冲突的副本名称。')
    }
    if (!confirmedOverwrite) {
      throw new CodeCraftError(ERROR_CODES.confirmationRequired, '覆盖目标需要明确确认。')
    }
    if (source.kind === 'directory' || target.kind === 'directory') {
      throw new CodeCraftError(ERROR_CODES.alreadyExists, '不会隐式合并或替换同名文件夹。')
    }
    return desired
  }

  /** Copy one item through a staging sibling, swapping only on success. */
  private async copyInto(source: ResolvedTarget, destination: ResolvedTarget, overwrite: boolean): Promise<void> {
    const directory = path.dirname(destination.absolute)
    const stage = path.join(directory, `.codecraft-${randomUUID()}.tmp`)
    try {
      await cp(source.absolute, stage, {
        recursive: true,
        force: false,
        errorOnExist: true,
        dereference: false,
      })
      if (overwrite && await exists(destination.absolute)) {
        await rm(destination.absolute, { recursive: true, force: false })
      }
      await rename(stage, destination.absolute)
    } catch (error) {
      await rm(stage, { recursive: true, force: true }).catch(() => undefined)
      throw error
    }
  }

  /** Move one item; returns a warning when the source could not be removed. */
  private async moveInto(source: ResolvedTarget, destination: ResolvedTarget, overwrite: boolean): Promise<string | undefined> {
    try {
      if (!overwrite && !await exists(destination.absolute)) {
        await rename(source.absolute, destination.absolute)
        return undefined
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error
    }

    await this.copyInto(source, destination, overwrite)
    try {
      await rm(source.absolute, { recursive: true, force: false })
      return undefined
    } catch {
      return `已写入目标，但未能删除源项目：${source.relative}`
    }
  }

  private async delete(
    workspace: WorkspaceRoot,
    operation: Extract<WorkspaceOperation, { kind: 'delete' }>,
  ): Promise<WorkspaceOperationResult> {
    const result = emptyResult()
    if (operation.mode === 'permanent' && operation.confirmedPermanent !== true) {
      throw new CodeCraftError(ERROR_CODES.confirmationRequired, '永久删除需要二次确认。')
    }
    for (const requested of unique(operation.paths)) {
      let target: ResolvedTarget
      try {
        target = await resolveTarget(workspace, requested)
        assertExisting(target)
        assertNotRoot(target)
      } catch (error) {
        result.failed.push(failure(requested, error, '无法读取目标。'))
        continue
      }
      try {
        if (operation.mode === 'trash') {
          await this.trash(target.absolute)
          result.changedPaths.push({ from: target.relative, kind: 'trashed' })
        } else {
          await rm(target.absolute, { recursive: true, force: false })
          result.changedPaths.push({ from: target.relative, kind: 'deleted' })
        }
        result.succeeded.push({ path: target.relative })
      } catch (error) {
        result.failed.push(failure(target.relative, error, operation.mode === 'trash' ? '无法移入回收站。' : '无法删除。'))
      }
    }
    return result
  }

  /** Resolve a new child path and ensure the parent exists without overwriting. */
  private async newTarget(workspace: WorkspaceRoot, requested: string): Promise<ResolvedTarget> {
    const target = await resolveTarget(workspace, requested)
    assertNotRoot(target)
    assertName(path.posix.basename(target.relative), this.platform)
    if (target.kind !== 'absent') {
      throw new CodeCraftError(ERROR_CODES.alreadyExists, '同名项目已存在。')
    }
    await resolveDirectory(workspace, path.posix.dirname(target.relative) === '.' ? '' : path.posix.dirname(target.relative))
    return target
  }
}

/** Build an empty result with every collection present. */
function emptyResult(): WorkspaceOperationResult {
  return { succeeded: [], failed: [], changedPaths: [], warnings: [] }
}

/** Convert an unknown error into a stable per-item failure. */
function failure(itemPath: string, error: unknown, fallback: string): WorkspaceOperationFailure {
  if (error instanceof CodeCraftError) {
    return { path: itemPath, code: error.code, message: error.message }
  }
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : ''
  if (code === 'EEXIST') {
    return { path: itemPath, code: ERROR_CODES.alreadyExists, message: '同名项目已存在。' }
  }
  if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS') {
    return { path: itemPath, code: ERROR_CODES.readOnly, message: '没有权限修改该路径。' }
  }
  if (code === 'ENOENT') {
    return { path: itemPath, code: ERROR_CODES.notFound, message: '目标已不存在。' }
  }
  return { path: itemPath, code: ERROR_CODES.operationFailed, message: fallback }
}

/** Assert that the target exists. */
function assertExisting(target: ResolvedTarget): void {
  if (target.kind === 'absent') {
    throw new CodeCraftError(ERROR_CODES.notFound, '目标不存在。', 404)
  }
}

/** The workspace root cannot be renamed, moved, or deleted. */
function assertNotRoot(target: ResolvedTarget): void {
  if (target.relative === '') {
    throw new CodeCraftError(ERROR_CODES.invalidTarget, '不能对工作区根目录执行此操作。')
  }
}

/** A directory can never be copied or moved into itself. */
function assertNotSelfOrDescendant(source: ResolvedTarget, targetDirectory: ResolvedTarget): void {
  if (source.kind !== 'directory') return
  const target = targetDirectory.relative
  if (target === source.relative || target.startsWith(`${source.relative}/`)) {
    throw new CodeCraftError(ERROR_CODES.invalidTarget, '不能把文件夹移动到自身或子文件夹中。')
  }
}

/** De-duplicate requested paths while preserving order. */
function unique(paths: string[]): string[] {
  return [...new Set(paths)]
}

/** Bounded-concurrency map for directory listings. */
async function mapLimit<T, R>(items: readonly T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next
      next += 1
      if (index >= items.length) return
      const item = items[index]
      if (item === undefined) return
      results[index] = await task(item)
    }
  })
  await Promise.all(workers)
  return results
}
