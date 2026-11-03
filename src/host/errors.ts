import { ERROR_CODES } from '../protocol.js'

/**
 * A failure that can be answered on the wire with a stable code and status.
 *
 * Messages are shown to the user in the editor; they never include file
 * contents, credentials, or unrelated paths.
 */
export class CodeCraftError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = 'CodeCraftError'
    this.code = code
    this.status = status
  }
}

/** Translate a Node filesystem failure into a safe, user-facing failure. */
export function fileSystemError(error: unknown, fallback: string): CodeCraftError {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : ''
  if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'ELOOP') {
    return new CodeCraftError(ERROR_CODES.notFound, '文件或目录已不存在。', 404)
  }
  if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS') {
    return new CodeCraftError(ERROR_CODES.readOnly, '没有权限访问或写入该文件。', 403)
  }
  if (code === 'EISDIR') {
    return new CodeCraftError(ERROR_CODES.notFile, '该路径不是普通文件。', 400)
  }
  if (code === 'ENOSPC' || code === 'EDQUOT') {
    return new CodeCraftError(ERROR_CODES.writeFailed, '磁盘空间不足，保存失败。', 507)
  }
  return new CodeCraftError(ERROR_CODES.internal, fallback, 500)
}
