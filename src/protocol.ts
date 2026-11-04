/**
 * Wire protocol shared by the Host save service and the browser editor.
 *
 * The browser never sends a trusted file path. It sends the Session identity
 * and the path as the native file tab resolved it; the Host re-resolves both
 * against its own working directory before touching the filesystem.
 *
 * @module dsh-codecraft/protocol
 */

/** The single exact HTTP route used by this plugin. */
export const CODECRAFT_ROUTE = '/codecraft/api'

/** Largest source file CodeCraft will load into the editor (2 MiB). */
export const MAX_EDITABLE_BYTES = 2 * 1024 * 1024

/** Source/text suffixes claimed by both the browser renderer and Host route. */
export const CODECRAFT_EDITABLE_EXTENSIONS: readonly string[] = [
  'py', 'pyi', 'pyw',
  'ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs', 'cjs',
  'json', 'jsonc',
  'md', 'markdown',
  'html', 'htm',
  'css', 'scss', 'less',
  'java',
  'c', 'h', 'cc', 'cpp', 'cxx', 'hpp', 'hh', 'hxx',
  'go', 'rs', 'php', 'sql',
  'xml', 'yaml', 'yml', 'toml', 'ini', 'conf', 'cfg', 'env',
  'sh', 'bash', 'zsh', 'fish',
  'txt', 'text',
  'vue', 'svelte',
]

/**
 * Largest request body accepted by the route. JSON escaping can multiply the
 * payload of a worst-case draft, so this leaves room above the file limit
 * without becoming an unbounded buffer.
 */
export const MAX_REQUEST_BYTES = 8 * 1024 * 1024

/** Line-ending style of the file as it was read. */
export type NewlineStyle = 'lf' | 'crlf'

/** Indentation detected from the file's own leading whitespace. */
export interface IndentStyle {
  kind: 'tabs' | 'spaces'
  size: number
}

/** A writable, UTF-8 text source file. */
export interface TextFileSnapshot {
  kind: 'text'
  absolutePath: string
  /** Opaque optimistic-concurrency token; compare, never parse. */
  version: string
  content: string
  newline: NewlineStyle
  bom: boolean
  size: number
  /** POSIX permission bits, preserved on save. */
  mode: number
  /** False when either the file or its directory rejects writing. */
  writable: boolean
  /** Detected indentation style, for the status bar and the editor. */
  indent: IndentStyle
}

/** Why a file is deliberately kept out of the editor. */
export type UnsupportedReason = 'too-large' | 'binary' | 'encoding' | 'newline'

/** A file that is intentionally not editable in CodeCraft. */
export interface UnsupportedFileSnapshot {
  kind: 'unsupported'
  reason: UnsupportedReason
  absolutePath: string
  version: string
  size: number
}

export type ReadResult = TextFileSnapshot | UnsupportedFileSnapshot

export interface ReadRequest {
  action: 'read'
  sessionId: string
  path: string
}

export interface SaveRequest {
  action: 'save'
  sessionId: string
  path: string
  content: string
  expectedVersion: string
  newline: NewlineStyle
  bom: boolean
}

export interface StatRequest {
  action: 'stat'
  sessionId: string
  path: string
}

export interface IntelligenceDocumentRequest {
  sessionId: string
  path: string
  tabId: string
  revision: number
  content: string
}

export interface IntelligenceSyncRequest extends IntelligenceDocumentRequest {
  action: 'intelligence-sync'
}

export interface IntelligenceCompletionRequest extends IntelligenceDocumentRequest {
  action: 'intelligence-complete'
  position: IntelligencePosition
}

export interface IntelligenceCloseRequest {
  action: 'intelligence-close'
  sessionId: string
  path: string
  tabId: string
}

export interface IntelligenceStatusRequest {
  action: 'intelligence-status'
  sessionId: string
  path: string
}

export type CodeCraftRequest =
  | ReadRequest
  | SaveRequest
  | StatRequest
  | IntelligenceSyncRequest
  | IntelligenceCompletionRequest
  | IntelligenceCloseRequest
  | IntelligenceStatusRequest

export interface IntelligencePosition {
  line: number
  character: number
}

export interface IntelligenceRange {
  start: IntelligencePosition
  end: IntelligencePosition
}

export interface IntelligenceTextEdit {
  range: IntelligenceRange
  newText: string
}

export interface IntelligenceCompletionItem {
  label: string
  kind?: number
  detail?: string
  sortText?: string
  filterText?: string
  insertText?: string
  insertTextFormat?: 1 | 2
  textEdit?: IntelligenceTextEdit
  additionalTextEdits?: IntelligenceTextEdit[]
}

export interface IntelligenceCompletionResult {
  revision: number
  items: IntelligenceCompletionItem[]
}

export type IntelligenceStatusKind = 'disabled' | 'starting' | 'ready' | 'unavailable' | 'error'

export interface IntelligenceStatusResult {
  status: IntelligenceStatusKind
  message?: string
  interpreterPath?: string
}

export interface SaveResult {
  absolutePath: string
  version: string
  size: number
}

export interface StatResult {
  exists: boolean
  absolutePath?: string
  version?: string
  size?: number
}

export interface CodeCraftErrorBody {
  code: string
  message: string
}

export type CodeCraftEnvelope<T> =
  | { ok: true; result: T }
  | { ok: false; error: CodeCraftErrorBody }

/** Stable error codes the browser switches on. */
export const ERROR_CODES = {
  badRequest: 'bad-request',
  forbidden: 'forbidden',
  methodNotAllowed: 'method-not-allowed',
  requestTooLarge: 'request-too-large',
  sessionNotFound: 'session-not-found',
  workspaceUnavailable: 'workspace-unavailable',
  outsideWorkspace: 'outside-workspace',
  notFound: 'not-found',
  notFile: 'not-file',
  symlinkTarget: 'symlink-target',
  tooLarge: 'too-large',
  binary: 'binary',
  readOnly: 'read-only',
  conflict: 'conflict',
  writeFailed: 'write-failed',
  internal: 'internal',
  intelligenceDisabled: 'intelligence-disabled',
  intelligenceUnavailable: 'intelligence-unavailable',
  intelligenceStale: 'intelligence-stale',
} as const

/** Why a path was rejected, as a short human-readable explanation. */
export const UNSUPPORTED_REASON_TEXT: Record<UnsupportedReason, string> = {
  'too-large': '文件超过 2 MiB 安全上限',
  binary: '文件包含二进制内容',
  encoding: '文件不是有效的 UTF-8 文本',
  newline: '文件使用了不受支持的换行符',
}
