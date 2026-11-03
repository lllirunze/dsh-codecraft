import { isAbsolute } from 'node:path'
import { CodeCraftError } from './errors.js'
import { readTextFile, saveTextFile, statFile } from './files.js'
import type {
  HostContext,
  HostSessionLike,
  RequestLike,
  ResponseLike,
  WorkingDirectoryService,
} from './context.js'
import {
  ERROR_CODES,
  MAX_REQUEST_BYTES,
  type CodeCraftEnvelope,
  type CodeCraftRequest,
  type ReadResult,
  type SaveResult,
  type StatResult,
} from '../protocol.js'

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

function requireRequest(value: unknown): CodeCraftRequest {
  if (!isRecord(value)) {
    throw new CodeCraftError(ERROR_CODES.badRequest, '请求体必须是 JSON 对象。', 400)
  }
  const action = value.action
  const sessionId = value.sessionId
  const path = value.path
  if (typeof action !== 'string') {
    throw new CodeCraftError(ERROR_CODES.badRequest, '缺少 action。', 400)
  }
  if (typeof sessionId !== 'string' || sessionId === '') {
    throw new CodeCraftError(ERROR_CODES.badRequest, '缺少 sessionId。', 400)
  }
  if (typeof path !== 'string' || path === '' || path.length > 4096) {
    throw new CodeCraftError(ERROR_CODES.badRequest, '缺少有效的 path。', 400)
  }
  if (action === 'read' || action === 'stat') {
    return { action, sessionId, path }
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
    return { action, sessionId, path, content, expectedVersion, newline, bom }
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
export async function dispatch(ctx: HostContext, request: CodeCraftRequest): Promise<unknown> {
  const { root } = await workspaceOf(ctx, request.sessionId)
  switch (request.action) {
    case 'read': return readTextFile(root, request.path) satisfies Promise<ReadResult>
    case 'save': return saveTextFile({ root, ...request }) satisfies Promise<SaveResult>
    case 'stat': return statFile(root, request.path) satisfies Promise<StatResult>
  }
}

/**
 * Build the route handler.
 * @param ctx - Host context carrying the web server, admission fence, and Sessions.
 * @returns the handler registered at {@link CODECRAFT_ROUTE}.
 */
export function createApiHandler(ctx: HostContext): (req: RequestLike, res: ResponseLike) => Promise<void> {
  return async (req, res) => {
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
      const result = await dispatch(ctx, request)
      sendJson(res, 200, { ok: true, result })
    } catch (error) {
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
    }
  }
}
