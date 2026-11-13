import { isAbsolute } from 'node:path'
import { CodeCraftError } from './errors.js'
import { readTextFile, saveTextFile, statFile } from './files.js'
import { publicIntelligenceError, type IntelligenceManager } from './intelligence/manager.js'
import type {
  HostContext,
  HostSessionLike,
  RequestLike,
  ResponseLike,
  WorkingDirectoryService,
} from './context.js'
import { WorkspaceService } from './workspace/operations.js'
import {
  ERROR_CODES,
  MAX_REQUEST_BYTES,
  type CodeCraftEnvelope,
  type CodeCraftRequest,
  type ReadResult,
  type SaveResult,
  type StatResult,
  type WorkspaceConflictPolicy,
  type WorkspaceOperation,
} from '../protocol.js'

/** One serialized operation service shared by all requests on this Host. */
const defaultWorkspaceService = new WorkspaceService()

/**
 * The authenticated JSON route behind CodeCraft's save adapter.
 *
 * Request admission has one owner: `connection.requestRejection` applies DSH's
 * Host/Origin fence and browser-cookie authentication before any Session or
 * path is resolved. Bodies are bounded, fields are validated, and the Host
 * resolves the workspace from the Session itself rather than from the request.
 */

function sendJson<T>(res: ResponseLike, status: number, envelope: CodeCraftEnvelope<T>): void {
  const body = JSON.stringify(envelope)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.setHeader('content-length', String(Buffer.byteLength(body)))
  res.end(body)
}

function fail(res: ResponseLike, status: number, code: string, message: string): void {
  sendJson(res, status, { ok: false, error: { code, message } })
}

async function readBoundedBody(req: RequestLike): Promise<string | null> {
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of req) {
    const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    size += bytes.byteLength
    if (size > MAX_REQUEST_BYTES) {
      req.resume?.()
      return null
    }
    chunks.push(bytes)
  }
  return Buffer.concat(chunks, size).toString('utf8')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireText(value: unknown, field: string, maximum = 4096): string {
  if (typeof value !== 'string' || value === '' || value.length > maximum) {
    throw new CodeCraftError(ERROR_CODES.badRequest, `${field} 无效。`, 400)
  }
  return value
}

function requirePath(value: unknown, field = 'path', allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > 4096 || (!allowEmpty && value === '')) {
    throw new CodeCraftError(ERROR_CODES.badRequest, `${field} 无效。`, 400)
  }
  return value
}

function requirePaths(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 1000) {
    throw new CodeCraftError(ERROR_CODES.badRequest, 'paths 必须是非空路径数组。', 400)
  }
  return value.map(item => requirePath(item, 'paths[]'))
}

function requireConflict(value: unknown): WorkspaceConflictPolicy {
  if (value !== 'skip' && value !== 'rename' && value !== 'overwrite') {
    throw new CodeCraftError(ERROR_CODES.badRequest, 'conflict 无效。', 400)
  }
  return value
}

function requireOperation(value: unknown): WorkspaceOperation {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    throw new CodeCraftError(ERROR_CODES.badRequest, '缺少 operation。', 400)
  }
  switch (value.kind) {
    case 'createFile': {
      const operation: WorkspaceOperation = { kind: 'createFile', path: requirePath(value.path) }
      if (value.content !== undefined) {
        if (typeof value.content !== 'string' || Buffer.byteLength(value.content) > MAX_REQUEST_BYTES) {
          throw new CodeCraftError(ERROR_CODES.badRequest, 'content 无效或过大。', 400)
        }
        operation.content = value.content
      }
      return operation
    }
    case 'createDirectory':
      return { kind: 'createDirectory', path: requirePath(value.path) }
    case 'rename':
      return {
        kind: 'rename',
        path: requirePath(value.path),
        newName: requireText(value.newName, 'newName', 255),
      }
    case 'copy':
    case 'move': {
      const operation: Extract<WorkspaceOperation, { kind: 'copy' | 'move' }> = {
        kind: value.kind,
        paths: requirePaths(value.paths),
        targetDirectory: requirePath(value.targetDirectory, 'targetDirectory', true),
        conflict: requireConflict(value.conflict),
      }
      if (value.confirmedOverwrite === true) operation.confirmedOverwrite = true
      return operation
    }
    case 'delete': {
      if (value.mode !== 'trash' && value.mode !== 'permanent') {
        throw new CodeCraftError(ERROR_CODES.badRequest, 'delete.mode 无效。', 400)
      }
      const operation: WorkspaceOperation = {
        kind: 'delete',
        paths: requirePaths(value.paths),
        mode: value.mode,
      }
      if (value.confirmedPermanent === true) operation.confirmedPermanent = true
      return operation
    }
    default:
      throw new CodeCraftError(ERROR_CODES.badRequest, '未知的文件操作。', 400)
  }
}

function requireRequest(value: unknown): CodeCraftRequest {
  if (!isRecord(value)) {
    throw new CodeCraftError(ERROR_CODES.badRequest, '请求体必须是 JSON 对象。', 400)
  }
  const action = value.action
  const sessionId = value.sessionId
  if (typeof action !== 'string') {
    throw new CodeCraftError(ERROR_CODES.badRequest, '缺少 action。', 400)
  }
  if (typeof sessionId !== 'string' || sessionId === '') {
    throw new CodeCraftError(ERROR_CODES.badRequest, '缺少 sessionId。', 400)
  }
  if (action === 'read' || action === 'stat' || action === 'intelligence-status') {
    return { action, sessionId, path: requirePath(value.path) }
  }
  if (action === 'workspace-list') {
    return {
      action,
      sessionId,
      ...(value.path === undefined ? {} : { path: requirePath(value.path, 'path', true) }),
    }
  }
  if (action === 'workspace-operation') {
    return { action, sessionId, operation: requireOperation(value.operation) }
  }
  if (action === 'workspace-preflight') {
    const operation = requireOperation(value.operation)
    if (operation.kind !== 'copy' && operation.kind !== 'move') {
      throw new CodeCraftError(ERROR_CODES.badRequest, '预检仅支持 copy 或 move。', 400)
    }
    return { action, sessionId, operation }
  }
  if (action === 'intelligence-close') {
    const { tabId } = value
    if (typeof tabId !== 'string' || tabId === '') {
      throw new CodeCraftError(ERROR_CODES.badRequest, '智能服务请求缺少 tabId。', 400)
    }
    return { action, sessionId, path: requirePath(value.path), tabId }
  }
  if (action === 'intelligence-sync'
    || action === 'intelligence-complete'
    || action === 'intelligence-hover'
    || action === 'intelligence-definition'
    || action === 'intelligence-references') {
    const { tabId, revision, content } = value
    if (typeof tabId !== 'string' || tabId === '' || tabId.length > 512) {
      throw new CodeCraftError(ERROR_CODES.badRequest, '智能服务请求缺少有效的 tabId。', 400)
    }
    if (!Number.isSafeInteger(revision) || Number(revision) < 1) {
      throw new CodeCraftError(ERROR_CODES.badRequest, '智能服务请求的 revision 无效。', 400)
    }
    if (typeof content !== 'string' || Buffer.byteLength(content) > MAX_REQUEST_BYTES) {
      throw new CodeCraftError(ERROR_CODES.badRequest, '智能服务请求的文档内容无效或过大。', 400)
    }
    if (action === 'intelligence-sync') {
      return {
        action,
        sessionId,
        path: requirePath(value.path),
        tabId,
        revision: Number(revision),
        content,
      }
    }
    const requestPosition = value.position
    if (!isRecord(requestPosition)
      || !Number.isInteger(requestPosition.line)
      || !Number.isInteger(requestPosition.character)
      || Number(requestPosition.line) < 0
      || Number(requestPosition.character) < 0) {
      throw new CodeCraftError(ERROR_CODES.badRequest, '智能服务请求位置无效。', 400)
    }
    return {
      action,
      sessionId,
      path: requirePath(value.path),
      tabId,
      revision: Number(revision),
      content,
      position: {
        line: Number(requestPosition.line),
        character: Number(requestPosition.character),
      },
    }
  }
  if (action === 'save') {
    const { content, expectedVersion, newline, bom } = value
    if (typeof content !== 'string' || typeof expectedVersion !== 'string' || expectedVersion === '') {
      throw new CodeCraftError(ERROR_CODES.badRequest, '保存请求缺少 content 或 expectedVersion。', 400)
    }
    if (newline !== 'lf' && newline !== 'crlf') {
      throw new CodeCraftError(ERROR_CODES.badRequest, '保存请求的 newline 无效。', 400)
    }
    if (typeof bom !== 'boolean') {
      throw new CodeCraftError(ERROR_CODES.badRequest, '保存请求的 bom 无效。', 400)
    }
    return {
      action,
      sessionId,
      path: requirePath(value.path),
      content,
      expectedVersion,
      newline,
      bom,
    }
  }
  throw new CodeCraftError(ERROR_CODES.badRequest, '未知的 action。', 400)
}

async function workspaceOf(ctx: HostContext, sessionId: string): Promise<{ session: HostSessionLike; root: string }> {
  const session = ctx.sessions.get(sessionId)
  if (session === undefined) {
    throw new CodeCraftError(ERROR_CODES.sessionNotFound, '当前会话尚未连接。', 404)
  }
  let root: string | undefined
  const workingDirectory = ctx.get('workingDirectory') as WorkingDirectoryService | undefined
  if (workingDirectory !== undefined) {
    try {
      root = workingDirectory.get(session)
    } catch {
      root = undefined
    }
  }
  if (root === undefined || root === '') root = session.header.cwd
  if (root === undefined || root === '' || !isAbsolute(root)) {
    throw new CodeCraftError(ERROR_CODES.workspaceUnavailable, '当前会话没有可用的工作目录。', 404)
  }
  return { session, root }
}

/** Test seam: perform one validated request against the Host filesystem. */
export async function dispatch(
  ctx: HostContext,
  request: CodeCraftRequest,
  intelligence?: IntelligenceManager,
  signal?: AbortSignal,
  workspaceService: WorkspaceService = defaultWorkspaceService,
): Promise<unknown> {
  const { root } = await workspaceOf(ctx, request.sessionId)
  switch (request.action) {
    case 'read': return readTextFile(root, request.path) satisfies Promise<ReadResult>
    case 'save': return saveTextFile({ root, ...request }) satisfies Promise<SaveResult>
    case 'stat': return statFile(root, request.path) satisfies Promise<StatResult>
    case 'workspace-list': return workspaceService.list(root, request.path ?? '')
    case 'workspace-operation': return workspaceService.run(root, request.operation)
    case 'workspace-preflight': return workspaceService.preflight(root, request.operation)
    case 'intelligence-sync': return requireIntelligence(intelligence).sync(root, request)
      .catch(error => { throw publicIntelligenceError(error) })
    case 'intelligence-complete': return requireIntelligence(intelligence).complete(root, request, signal)
      .catch(error => { throw publicIntelligenceError(error) })
    case 'intelligence-hover': return requireIntelligence(intelligence).hover(root, request, signal)
      .catch(error => { throw publicIntelligenceError(error) })
    case 'intelligence-definition': return requireIntelligence(intelligence).definition(root, request, signal)
      .catch(error => { throw publicIntelligenceError(error) })
    case 'intelligence-references': return requireIntelligence(intelligence).references(root, request, signal)
      .catch(error => { throw publicIntelligenceError(error) })
    case 'intelligence-close': {
      await requireIntelligence(intelligence).close(root, request.path, request.tabId)
      return { closed: true }
    }
    case 'intelligence-status': return requireIntelligence(intelligence).status(root, request.path)
  }
}

function requireIntelligence(manager: IntelligenceManager | undefined): IntelligenceManager {
  if (manager !== undefined) return manager
  throw new CodeCraftError(ERROR_CODES.intelligenceUnavailable, 'Python 智能服务不可用。', 503)
}

/**
 * Build the route handler.
 * @param ctx - Host context carrying the web server, admission fence, and Sessions.
 * @returns the handler registered at {@link CODECRAFT_ROUTE}.
 */
export function createApiHandler(
  ctx: HostContext,
  intelligence?: IntelligenceManager,
): (req: RequestLike, res: ResponseLike) => Promise<void> {
  return async (req, res) => {
    const controller = new AbortController()
    const abort = (): void => controller.abort(new DOMException('Request aborted', 'AbortError'))
    if (req.aborted) abort()
    else req.once?.('aborted', abort)
    try {
      const rejection = ctx.connection.requestRejection(req)
      if (rejection !== undefined) {
        fail(res, rejection, ERROR_CODES.forbidden, '请求未通过 DSH 身份验证。')
        return
      }
      if (req.method !== 'POST') {
        res.setHeader('allow', 'POST')
        fail(res, 405, ERROR_CODES.methodNotAllowed, '仅支持 POST。')
        return
      }
      const essence = String(req.headers['content-type'] ?? '').split(';', 1)[0]?.trim().toLowerCase()
      if (essence !== 'application/json') {
        fail(res, 415, ERROR_CODES.badRequest, 'content-type 必须是 application/json。')
        return
      }
      let text: string | null
      try {
        text = await readBoundedBody(req)
      } catch {
        fail(res, 400, ERROR_CODES.badRequest, '请求体读取失败。')
        return
      }
      if (text === null) {
        fail(res, 413, ERROR_CODES.requestTooLarge, '请求内容过大。')
        return
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        fail(res, 400, ERROR_CODES.badRequest, '请求不是有效的 JSON。')
        return
      }
      const request = requireRequest(parsed)
      const result = await dispatch(ctx, request, intelligence, controller.signal)
      sendJson(res, 200, { ok: true, result })
    } catch (error) {
      if (controller.signal.aborted) {
        if (!res.headersSent) res.destroy?.()
        return
      }
      const normalized = error instanceof CodeCraftError
        ? error
        : new CodeCraftError(
          ERROR_CODES.internal,
          error instanceof Error ? error.message : String(error),
          500,
        )
      if (!res.headersSent) {
        sendJson(res, normalized.status, {
          ok: false,
          error: { code: normalized.code, message: normalized.message },
        })
      } else {
        res.destroy?.(normalized)
      }
    } finally {
      if (req.off !== undefined) req.off('aborted', abort)
      else req.removeListener?.('aborted', abort)
    }
  }
}
