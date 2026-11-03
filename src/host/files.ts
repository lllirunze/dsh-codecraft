import { randomUUID } from 'node:crypto'
import { constants, type BigIntStats } from 'node:fs'
import { access, lstat, open, readFile, realpath, rename, stat, unlink } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { CodeCraftError, fileSystemError } from './errors.js'
import {
  CODECRAFT_EDITABLE_EXTENSIONS,
  ERROR_CODES,
  MAX_EDITABLE_BYTES,
  type IndentStyle,
  type NewlineStyle,
  type ReadResult,
  type SaveResult,
  type StatResult,
  type TextFileSnapshot,
} from '../protocol.js'

/**
 * Safe filesystem operations behind the editor.
 *
 * Every public function takes the Session workspace root as the authority.
 * Request paths are resolved twice: lexically first (so `..` never reaches the
 * disk) and again through `realpath` (so a symlink cannot escape the root).
 */

const EDITABLE_EXTENSION_SET = new Set(CODECRAFT_EDITABLE_EXTENSIONS)

function isWithin(root: string, target: string): boolean {
  const child = relative(root, target)
  return child === '' || (!child.startsWith(`..${sep}`) && child !== '..' && !isAbsolute(child))
}

function assertEditablePath(requested: string): void {
  const name = basename(requested).toLowerCase()
  const dot = name.lastIndexOf('.')
  const extension = dot >= 0 ? name.slice(dot + 1) : ''
  if (extension === '' || !EDITABLE_EXTENSION_SET.has(extension)) {
    throw new CodeCraftError(ERROR_CODES.badRequest, '该文件类型不在 CodeCraft 的源码/文本白名单中。', 400)
  }
}

function versionOf(info: BigIntStats): string {
  return `${info.mtimeNs}:${info.size}:${info.ino}`
}

/** A path resolved against one Session workspace, with both spellings kept. */
export interface ResolvedPath {
  /** The workspace root after symlink resolution. */
  root: string
  /** The canonical target after symlink resolution. */
  target: string
  /** The path as resolved before the final realpath call. */
  candidate: string
}

function absoluteCandidate(root: string, rootReal: string, requested: string): string {
  if (requested === '' || requested.includes('\0')) {
    throw new CodeCraftError(ERROR_CODES.badRequest, '路径不能为空。', 400)
  }
  const supplied = isAbsolute(requested) ? resolve(requested) : resolve(rootReal, requested)
  if (!isAbsolute(requested)) {
    if (!isWithin(rootReal, supplied)) {
      throw new CodeCraftError(ERROR_CODES.outsideWorkspace, '该路径不在当前工作区内。', 403)
    }
    return supplied
  }
  // macOS commonly presents /var as a symlink to /private/var. Translate a
  // path written under the caller's spelling of the root onto the canonical
  // root before applying the containment check.
  if (isWithin(root, supplied)) return resolve(rootReal, relative(root, supplied))
  if (isWithin(rootReal, supplied)) return supplied
  throw new CodeCraftError(ERROR_CODES.outsideWorkspace, '该路径不在当前工作区内。', 403)
}

async function canonicalRoot(root: string): Promise<string> {
  let real: string
  try {
    real = await realpath(root)
  } catch (error) {
    throw fileSystemError(error, '无法访问当前工作区。')
  }
  let info
  try {
    info = await stat(real)
  } catch (error) {
    throw fileSystemError(error, '无法访问当前工作区。')
  }
  if (!info.isDirectory()) {
    throw new CodeCraftError(ERROR_CODES.workspaceUnavailable, '当前工作区不是目录。', 404)
  }
  return real
}

/** Resolve a readable file; symlinks inside the workspace are followed. */
export async function resolveReadablePath(root: string, requested: string): Promise<ResolvedPath> {
  const rootReal = await canonicalRoot(root)
  const candidate = absoluteCandidate(root, rootReal, requested)
  let target: string
  try {
    target = await realpath(candidate)
  } catch (error) {
    throw fileSystemError(error, '无法访问该路径。')
  }
  if (!isWithin(rootReal, target)) {
    throw new CodeCraftError(ERROR_CODES.outsideWorkspace, '符号链接指向当前工作区之外，已拒绝访问。', 403)
  }
  return { root: rootReal, target, candidate }
}

/** Resolve a writable file; the final path itself must not be a symlink. */
export async function resolveWritablePath(root: string, requested: string): Promise<ResolvedPath> {
  const rootReal = await canonicalRoot(root)
  const candidate = absoluteCandidate(root, rootReal, requested)
  let entry
  try {
    entry = await lstat(candidate)
  } catch (error) {
    throw fileSystemError(error, '无法访问该路径。')
  }
  if (entry.isSymbolicLink()) {
    throw new CodeCraftError(ERROR_CODES.symlinkTarget, '该文件是符号链接，CodeCraft 不会通过链接写回。', 403)
  }
  if (!entry.isFile()) {
    throw new CodeCraftError(ERROR_CODES.notFile, '该路径不是普通文件。', 400)
  }
  let target: string
  try {
    target = await realpath(candidate)
  } catch (error) {
    throw fileSystemError(error, '无法访问该路径。')
  }
  if (!isWithin(rootReal, target)) {
    throw new CodeCraftError(ERROR_CODES.outsideWorkspace, '该路径位于当前工作区之外，已拒绝写入。', 403)
  }
  if (!isWithin(rootReal, dirname(target))) {
    throw new CodeCraftError(ERROR_CODES.outsideWorkspace, '保存目录不安全。', 403)
  }
  return { root: rootReal, target, candidate }
}

async function canWrite(target: string): Promise<boolean> {
  try {
    await access(target, constants.W_OK)
    await access(dirname(target), constants.W_OK)
    return true
  } catch {
    return false
  }
}

/** Infer indentation from the file's own non-empty lines. */
export function detectIndent(text: string): IndentStyle {
  let tabs = 0
  const spaceCounts: number[] = []
  for (const line of text.split('\n', 1000)) {
    if (line.trim() === '') continue
    const match = /^[ \t]*/.exec(line)
    const prefix = match === null ? '' : match[0]
    if (prefix.includes('\t')) tabs += 1
    else if (prefix.length > 0) spaceCounts.push(prefix.length)
  }
  if (tabs > 0 && tabs >= spaceCounts.length) return { kind: 'tabs', size: 4 }
  if (spaceCounts.length === 0) return { kind: 'spaces', size: 2 }
  let divisor = spaceCounts[0] ?? 2
  for (const count of spaceCounts) {
    let a = divisor
    let b = count
    while (b !== 0) {
      const next = a % b
      a = b
      b = next
    }
    divisor = a
  }
  return { kind: 'spaces', size: divisor >= 2 && divisor <= 8 ? divisor : 2 }
}

function unsupported(
  reason: 'too-large' | 'binary' | 'encoding' | 'newline',
  absolutePath: string,
  version: string,
  size: number,
): ReadResult {
  return { kind: 'unsupported', reason, absolutePath, version, size }
}

/**
 * Read a complete text file for editing.
 *
 * The whole file is read at once only after its size is known; files above the
 * limit are refused rather than paged, so the editor never mistakes a partial
 * preview for the complete file.
 */
export async function readTextFile(root: string, requested: string): Promise<ReadResult> {
  assertEditablePath(requested)
  const { target, candidate } = await resolveReadablePath(root, requested)
  let finalEntry
  try {
    finalEntry = await lstat(candidate)
  } catch (error) {
    throw fileSystemError(error, '无法读取文件信息。')
  }
  let info: BigIntStats
  try {
    info = await stat(target, { bigint: true })
  } catch (error) {
    throw fileSystemError(error, '无法读取文件信息。')
  }
  if (!info.isFile()) {
    throw new CodeCraftError(ERROR_CODES.notFile, '该路径不是普通文件。', 400)
  }
  const version = versionOf(info)
  const size = Number(info.size)
  if (size > MAX_EDITABLE_BYTES) return unsupported('too-large', target, version, size)

  let bytes: Buffer
  try {
    bytes = await readFile(target)
  } catch (error) {
    throw fileSystemError(error, '无法读取文件。')
  }
  if (bytes.byteLength > MAX_EDITABLE_BYTES) {
    return unsupported('too-large', target, version, bytes.byteLength)
  }
  if (bytes.length >= 2) {
    const utf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)
    if (utf16) return unsupported('encoding', target, version, size)
  }
  const bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
  const body = bom ? bytes.subarray(3) : bytes
  if (body.includes(0)) return unsupported('binary', target, version, size)

  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(body)
  } catch {
    return unsupported('encoding', target, version, size)
  }
  if (/\r(?!\n)/.test(text)) return unsupported('newline', target, version, size)
  const crlfCount = (text.match(/\r\n/g) ?? []).length
  const lfCount = (text.match(/\n/g) ?? []).length - crlfCount
  // Mixed endings cannot be reproduced line by line by a single save, so the
  // file stays read-only rather than being silently normalized.
  if (crlfCount > 0 && lfCount > 0) return unsupported('newline', target, version, size)
  const newline: NewlineStyle = crlfCount > 0 ? 'crlf' : 'lf'
  const content = newline === 'crlf' ? text.replace(/\r\n/g, '\n') : text

  // Content and version must describe the same bytes; a writer that changed
  // the file during the read makes this preview unsafe to edit.
  let latest: BigIntStats
  try {
    latest = await stat(target, { bigint: true })
  } catch (error) {
    throw fileSystemError(error, '无法确认文件状态。')
  }
  if (versionOf(latest) !== version) {
    throw new CodeCraftError(ERROR_CODES.conflict, '文件在读取期间发生了变化，请重试。', 409)
  }
  // Symlinks may be opened for inspection when they stay inside the workspace,
  // but saving through one is deliberately forbidden by resolveWritablePath.
  const writable = !finalEntry.isSymbolicLink() && await canWrite(target)
  const snapshot: TextFileSnapshot = {
    kind: 'text',
    absolutePath: target,
    version,
    content,
    newline,
    bom,
    size,
    mode: Number(info.mode & 0o777n),
    writable,
    indent: detectIndent(content),
  }
  return snapshot
}

export interface SaveTextInput {
  root: string
  path: string
  content: string
  expectedVersion: string
  newline: NewlineStyle
  bom: boolean
}

/**
 * Save one existing text file with an optimistic version check.
 *
 * The new bytes are written to a sibling temporary file, the target is checked
 * again, and only then is the temporary renamed over it. This preserves the
 * file's mode and newline style. It is not a distributed lock: a writer that
 * bypasses the version check during the final rename window can still race,
 * which is why the Host never silently overwrites on a detected mismatch.
 */
export async function saveTextFile(input: SaveTextInput): Promise<SaveResult> {
  if (typeof input.content !== 'string') {
    throw new CodeCraftError(ERROR_CODES.badRequest, '保存内容必须是文本。', 400)
  }
  const normalized = input.content.replace(/\r\n/g, '\n')
  if (normalized.includes('\r')) {
    throw new CodeCraftError(ERROR_CODES.badRequest, '保存内容包含不受支持的单独 CR 换行符。', 400)
  }
  const encodedText = input.newline === 'crlf' ? normalized.replace(/\n/g, '\r\n') : normalized
  const body = Buffer.from(encodedText, 'utf8')
  const bytes = input.bom
    ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body])
    : body
  if (bytes.byteLength > MAX_EDITABLE_BYTES) {
    throw new CodeCraftError(ERROR_CODES.tooLarge, '编辑后的文件超过 2 MiB 安全上限，未保存。', 413)
  }

  const { target } = await resolveWritablePath(input.root, input.path)
  let before: BigIntStats
  try {
    before = await stat(target, { bigint: true })
  } catch (error) {
    throw fileSystemError(error, '无法读取文件信息。')
  }
  if (!before.isFile()) {
    throw new CodeCraftError(ERROR_CODES.notFile, '该路径不是普通文件。', 400)
  }
  if (versionOf(before) !== input.expectedVersion) {
    throw new CodeCraftError(ERROR_CODES.conflict, '文件已被其他程序修改。草稿仍保留，未覆盖磁盘内容。', 409)
  }

  const parent = dirname(target)
  const mode = Number(before.mode & 0o777n)
  const temporary = resolve(parent, `.${basename(target)}.codecraft-${randomUUID()}.tmp`)
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporary, 'wx', mode)
    await handle.chmod(mode)
    await handle.writeFile(bytes)
    await handle.sync()
    await handle.close()
    handle = undefined

    // Close the time-of-check/time-of-use gap before the atomic replacement.
    let latest: BigIntStats
    try {
      latest = await stat(target, { bigint: true })
    } catch (error) {
      throw fileSystemError(error, '保存前无法再次确认文件状态。')
    }
    if (versionOf(latest) !== input.expectedVersion) {
      throw new CodeCraftError(ERROR_CODES.conflict, '保存期间文件发生了外部修改，未覆盖磁盘内容。', 409)
    }
    await rename(temporary, target)
  } catch (error) {
    if (error instanceof CodeCraftError) throw error
    throw fileSystemError(error, '保存失败。')
  } finally {
    await handle?.close().catch(() => undefined)
    await unlink(temporary).catch(() => undefined)
  }

  // Best-effort directory sync so the rename survives a crash; macOS accepts
  // this, and a failure here must not turn a successful save into an error.
  try {
    const directory = await open(parent, 'r')
    try {
      await directory.sync()
    } finally {
      await directory.close()
    }
  } catch {
    // Ignore: some filesystems refuse fsync on directories.
  }

  let saved: BigIntStats
  try {
    saved = await stat(target, { bigint: true })
  } catch (error) {
    throw fileSystemError(error, '文件已写入，但无法读取保存后的状态。')
  }
  return { absolutePath: target, version: versionOf(saved), size: Number(saved.size) }
}

/** Read a file's current version without loading its contents. */
export async function statFile(root: string, requested: string): Promise<StatResult> {
  const rootReal = await canonicalRoot(root)
  const candidate = absoluteCandidate(root, rootReal, requested)
  let target: string
  try {
    target = await realpath(candidate)
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : ''
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return { exists: false, absolutePath: candidate }
    }
    throw fileSystemError(error, '无法读取文件信息。')
  }
  if (!isWithin(rootReal, target)) {
    throw new CodeCraftError(ERROR_CODES.outsideWorkspace, '该路径位于当前工作区之外，已拒绝访问。', 403)
  }
  let info: BigIntStats
  try {
    info = await stat(target, { bigint: true })
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : ''
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return { exists: false, absolutePath: target }
    }
    throw fileSystemError(error, '无法读取文件信息。')
  }
  if (!info.isFile()) {
    throw new CodeCraftError(ERROR_CODES.notFile, '该路径不是普通文件。', 400)
  }
  return {
    exists: true,
    absolutePath: target,
    version: versionOf(info),
    size: Number(info.size),
  }
}
