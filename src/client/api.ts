/**
 * Browser calls to the Host save adapter.
 *
 * Every call is same-origin (Desktop forwards `dsh-app://app/…` to the Host
 * with its own cookie), POSTs JSON, and never carries a filesystem root: the
 * Session id is the only authority the Host accepts.
 *
 * @module dsh-codecraft/client/api
 */

import {
  CODECRAFT_ROUTE,
  type CodeCraftEnvelope,
  type IntelligenceCompletionResult,
  type IntelligenceDefinitionResult,
  type IntelligenceHoverResult,
  type IntelligencePosition,
  type IntelligenceReferencesResult,
  type IntelligenceStatusResult,
  type MaterialIconReadResult,
  type MaterialIconStatusResult,
  type ReadResult,
  type SaveResult,
  type StatResult,
  type WorkspaceListResult,
  type WorkspaceOperation,
  type WorkspaceOperationResult,
  type WorkspacePreflightResult,
} from '../protocol.js'

/** A typed failure answered by the Host, or a transport-level failure. */
export class ApiCallError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status = 0) {
    super(message)
    this.name = 'ApiCallError'
    this.code = code
    this.status = status
  }
}

function apiUrl(): string {
  return new URL(CODECRAFT_ROUTE, document.baseURI).href
}

function isEnvelope(value: unknown): value is CodeCraftEnvelope<unknown> {
  return typeof value === 'object' && value !== null && 'ok' in value
    && typeof (value as { ok?: unknown }).ok === 'boolean'
}

/**
 * Perform one authenticated request.
 * @param request - protocol request body.
 * @param signal - caller lifetime; aborts the browser transport.
 * @returns the typed result envelope.
 * @throws {ApiCallError} for a Host-declared failure or an unreadable response.
 */
export async function callApi<T>(request: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiCallError('network', '无法连接 CodeCraft 服务。', 0)
  }
  let body: unknown
  try {
    body = await response.json()
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    throw new ApiCallError('bad-response', `CodeCraft 服务返回了无效响应（HTTP ${response.status}）。`, response.status)
  }
  if (!isEnvelope(body)) {
    throw new ApiCallError('bad-response', `保存服务返回了未知响应（HTTP ${response.status}）。`, response.status)
  }
  if (!body.ok) {
    throw new ApiCallError(body.error.code, body.error.message, response.status)
  }
  return body.result as T
}

export function readFile(
  file: { sessionId: string; path: string },
  signal?: AbortSignal,
): Promise<ReadResult> {
  return callApi<ReadResult>({ action: 'read', sessionId: file.sessionId, path: file.path }, signal)
}

export function statFile(
  file: { sessionId: string; path: string },
  signal?: AbortSignal,
): Promise<StatResult> {
  return callApi<StatResult>({ action: 'stat', sessionId: file.sessionId, path: file.path }, signal)
}

export function saveFile(input: {
  sessionId: string
  path: string
  content: string
  expectedVersion: string
  newline: 'lf' | 'crlf'
  bom: boolean
}, signal?: AbortSignal): Promise<SaveResult> {
  return callApi<SaveResult>({ action: 'save', ...input }, signal)
}

export interface IntelligenceDocumentInput {
  sessionId: string
  path: string
  tabId: string
  revision: number
  content: string
}

export function syncIntelligence(
  input: IntelligenceDocumentInput,
  signal?: AbortSignal,
): Promise<IntelligenceStatusResult> {
  return callApi<IntelligenceStatusResult>({ action: 'intelligence-sync', ...input }, signal)
}

export function completeIntelligence(
  input: IntelligenceDocumentInput & { position: IntelligencePosition },
  signal?: AbortSignal,
): Promise<IntelligenceCompletionResult> {
  return callApi<IntelligenceCompletionResult>({ action: 'intelligence-complete', ...input }, signal)
}

export function hoverIntelligence(
  input: IntelligenceDocumentInput & { position: IntelligencePosition },
  signal?: AbortSignal,
): Promise<IntelligenceHoverResult> {
  return callApi<IntelligenceHoverResult>({ action: 'intelligence-hover', ...input }, signal)
}

export function definitionIntelligence(
  input: IntelligenceDocumentInput & { position: IntelligencePosition },
  signal?: AbortSignal,
): Promise<IntelligenceDefinitionResult> {
  return callApi<IntelligenceDefinitionResult>({ action: 'intelligence-definition', ...input }, signal)
}

export function referencesIntelligence(
  input: IntelligenceDocumentInput & { position: IntelligencePosition },
  signal?: AbortSignal,
): Promise<IntelligenceReferencesResult> {
  return callApi<IntelligenceReferencesResult>({ action: 'intelligence-references', ...input }, signal)
}

export function closeIntelligence(
  input: Pick<IntelligenceDocumentInput, 'sessionId' | 'path' | 'tabId'>,
  signal?: AbortSignal,
): Promise<{ closed: true }> {
  return callApi<{ closed: true }>({ action: 'intelligence-close', ...input }, signal)
}

export function intelligenceStatus(
  input: Pick<IntelligenceDocumentInput, 'sessionId' | 'path'>,
  signal?: AbortSignal,
): Promise<IntelligenceStatusResult> {
  return callApi<IntelligenceStatusResult>({ action: 'intelligence-status', ...input }, signal)
}

export function listWorkspace(
  input: { sessionId: string; path?: string },
  signal?: AbortSignal,
): Promise<WorkspaceListResult> {
  return callApi<WorkspaceListResult>({ action: 'workspace-list', ...input }, signal)
}

export function preflightWorkspace(
  input: { sessionId: string; operation: Extract<WorkspaceOperation, { kind: 'copy' | 'move' }> },
  signal?: AbortSignal,
): Promise<WorkspacePreflightResult> {
  return callApi<WorkspacePreflightResult>({ action: 'workspace-preflight', ...input }, signal)
}

export function runWorkspaceOperation(
  input: { sessionId: string; operation: WorkspaceOperation },
  signal?: AbortSignal,
): Promise<WorkspaceOperationResult> {
  return callApi<WorkspaceOperationResult>({ action: 'workspace-operation', ...input }, signal)
}

export function materialIconStatus(signal?: AbortSignal): Promise<MaterialIconStatusResult> {
  return callApi<MaterialIconStatusResult>({ action: 'material-icons-status' }, signal)
}

export function installMaterialIcons(signal?: AbortSignal): Promise<MaterialIconStatusResult> {
  return callApi<MaterialIconStatusResult>({ action: 'material-icons-install' }, signal)
}

export function readMaterialIcon(fileName: string, signal?: AbortSignal): Promise<MaterialIconReadResult> {
  return callApi<MaterialIconReadResult>({ action: 'material-icon-read', fileName }, signal)
}
