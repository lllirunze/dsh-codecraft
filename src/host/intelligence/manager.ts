import type {
  IntelligenceCompletionRequest,
  IntelligenceCompletionResult,
  IntelligenceStatusResult,
  IntelligenceSyncRequest,
  IntelligenceUnavailableReason,
} from '../../protocol.js'
import { ERROR_CODES } from '../../protocol.js'
import type { PythonIntelligenceSettings } from '../../settings/schema.js'
import { CodeCraftError } from '../errors.js'
import type { ManagedSubprocessService } from '../context.js'
import { resolveReadablePath } from '../files.js'
import { resolvePyrightLaunch, resolvePythonInterpreter } from '../languages/python/environment.js'
import {
  supportsPythonIntelligence,
  unsupportedPythonPlatformMessage,
} from '../languages/python/platform.js'
import { LspSession, LspSessionRetiredError } from '../lsp/session.js'
import { LspTransportError } from '../lsp/connection.js'

const RECOVERY_COOLDOWN_MS = 10_000

interface RecoveryBlock {
  until: number
  error: Error
}

function isPythonPath(path: string): boolean {
  return /\.(?:py|pyi|pyw)$/i.test(path)
}

export function followsMemberAccess(content: string, line: number, character: number): boolean {
  if (line < 0 || character < 1) return false
  const text = content.split('\n')[line]
  return text !== undefined && text.charAt(character - 1) === '.'
}

function unavailableReason(error: unknown): IntelligenceUnavailableReason {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (message.includes('interpreter')) return 'environment-limited'
  if (message.includes('timeout') || (error instanceof Error && error.name === 'TimeoutError')) {
    return 'initialize-timeout'
  }
  if (message.includes('failed to start') || message.includes('spawn') || message.includes('enoent')) {
    return 'spawn-failed'
  }
  if (message.includes('exited')) return 'server-exited'
  if (error instanceof LspTransportError) return 'server-exited'
  if (error instanceof CodeCraftError) return 'workspace-invalid'
  return 'server-not-found'
}

function unavailableMessage(reason: IntelligenceUnavailableReason): string {
  switch (reason) {
    case 'environment-limited': return 'The configured Python interpreter is unavailable. Check the CodeCraft settings.'
    case 'initialize-timeout': return 'Pyright did not initialize in time. Restart DSH Desktop and try again.'
    case 'spawn-failed': return 'Pyright could not start. Restart DSH Desktop and check the configured server path.'
    case 'server-exited': return 'Pyright stopped unexpectedly. Try completion again after a short delay.'
    case 'workspace-invalid': return 'The Python file is not available inside the active workspace.'
    case 'server-not-found': return 'Pyright or its Node.js runtime could not be resolved.'
    case 'unsupported-platform': return 'Python Intelligence is supported on macOS and Windows.'
  }
}

/** Convert internal provider failures into stable messages safe for the browser. */
export function publicIntelligenceError(error: unknown): Error {
  if (error instanceof CodeCraftError) return error
  if (error instanceof Error && error.name === 'AbortError') return error
  const reason = unavailableReason(error)
  return new CodeCraftError(
    ERROR_CODES.intelligenceUnavailable,
    unavailableMessage(reason),
    503,
  )
}

/** Workspace-scoped owner of Python language-server sessions. */
export class IntelligenceManager {
  readonly #sessions = new Map<string, Promise<LspSession>>()
  readonly #emptyCompletionRecovery = new WeakSet<LspSession>()
  readonly #recoveryBlocks = new Map<string, RecoveryBlock>()
  readonly #recoveryCooldownMs = RECOVERY_COOLDOWN_MS
  readonly #now = Date.now
  #disposed = false

  constructor(
    readonly subprocess: ManagedSubprocessService,
    readonly settings: PythonIntelligenceSettings,
    readonly platform: NodeJS.Platform = process.platform,
  ) {}

  async sync(root: string, request: IntelligenceSyncRequest): Promise<IntelligenceStatusResult> {
    this.#assertAvailable(request.path)
    const { root: canonicalRoot, target } = await resolveReadablePath(root, request.path)
    const session = await this.#session(canonicalRoot)
    try {
      await session.sync(target, request.tabId, request.revision, request.content)
    } catch (error) {
      if (error instanceof LspSessionRetiredError) {
        const replacement = await this.#session(canonicalRoot)
        await replacement.sync(target, request.tabId, request.revision, request.content)
        this.#recoveryBlocks.delete(canonicalRoot)
        return {
          status: 'ready',
          ...(replacement.interpreterPath === undefined ? {} : { interpreterPath: replacement.interpreterPath }),
        }
      }
      if (error instanceof Error && error.message === 'stale document revision') {
        throw new CodeCraftError(ERROR_CODES.intelligenceStale, '智能补全请求已过期。', 409)
      }
      if (error instanceof LspTransportError) {
        const restarted = await this.#recover(canonicalRoot, session, error)
        await this.#completeRecovery(canonicalRoot, async () => {
          await restarted.sync(target, request.tabId, request.revision, request.content)
        })
        return {
          status: 'ready',
          ...(restarted.interpreterPath === undefined ? {} : { interpreterPath: restarted.interpreterPath }),
        }
      }
      throw error
    }
    this.#recoveryBlocks.delete(canonicalRoot)
    return {
      status: 'ready',
      ...(session.interpreterPath === undefined ? {} : { interpreterPath: session.interpreterPath }),
    }
  }

  async complete(root: string, request: IntelligenceCompletionRequest, signal?: AbortSignal): Promise<IntelligenceCompletionResult> {
    this.#assertAvailable(request.path)
    if (!this.settings.completion) {
      throw new CodeCraftError(ERROR_CODES.intelligenceDisabled, 'Python 语义补全已关闭。', 409)
    }
    const { root: canonicalRoot, target } = await resolveReadablePath(root, request.path)
    const session = await this.#session(canonicalRoot)
    let result: IntelligenceCompletionResult
    try {
      result = await session.complete(
        target,
        request.tabId,
        request.revision,
        request.content,
        request.position,
        signal,
      )
    } catch (error) {
      if (error instanceof LspSessionRetiredError) {
        const replacement = await this.#session(canonicalRoot)
        result = await replacement.complete(
          target,
          request.tabId,
          request.revision,
          request.content,
          request.position,
          signal,
        )
        this.#recoveryBlocks.delete(canonicalRoot)
        return result
      } else if (error instanceof Error && error.message === 'stale document revision') {
        throw new CodeCraftError(ERROR_CODES.intelligenceStale, '智能补全请求已过期。', 409)
      } else if (error instanceof LspTransportError) {
        const restarted = await this.#recover(canonicalRoot, session, error)
        return this.#completeRecovery(canonicalRoot, () => restarted.complete(
          target,
          request.tabId,
          request.revision,
          request.content,
          request.position,
          signal,
        ))
      }
      throw error
    }
    this.#recoveryBlocks.delete(canonicalRoot)
    if (result.items.length === 0
      && followsMemberAccess(request.content, request.position.line, request.position.character)
      && !this.#emptyCompletionRecovery.has(session)) {
      this.#emptyCompletionRecovery.add(session)
      this.#blockRecovery(canonicalRoot, new LspTransportError('Pyright returned no member completions'))
      const restarted = await this.#restart(canonicalRoot, session)
      this.#emptyCompletionRecovery.add(restarted)
      return this.#completeRecovery(canonicalRoot, () => restarted.complete(
        target,
        request.tabId,
        request.revision,
        request.content,
        request.position,
        signal,
      ))
    }
    return result
  }

  async close(root: string, path: string, tabId: string): Promise<void> {
    if (!isPythonPath(path)) return
    const { root: canonicalRoot, target } = await resolveReadablePath(root, path)
    const pending = this.#sessions.get(canonicalRoot)
    if (pending === undefined) return
    const session = await pending
    await session.close(target, tabId)
    await this.#retireIfIdle(canonicalRoot, pending, session)
  }

  async status(root: string, path: string): Promise<IntelligenceStatusResult> {
    if (!this.settings.enabled) return { status: 'disabled' }
    if (!supportsPythonIntelligence(this.platform)) {
      return {
        status: 'unavailable',
        reason: 'unsupported-platform',
        message: unsupportedPythonPlatformMessage(this.platform),
      }
    }
    if (!isPythonPath(path)) return { status: 'disabled' }
    try {
      const { root: canonicalRoot } = await resolveReadablePath(root, path)
      const pending = this.#session(canonicalRoot)
      const session = await pending
      try {
        return {
          status: 'ready',
          ...(session.interpreterPath === undefined ? {} : { interpreterPath: session.interpreterPath }),
        }
      } finally {
        await this.#retireIfIdle(canonicalRoot, pending, session)
      }
    } catch (error) {
      const reason = unavailableReason(error)
      return { status: 'unavailable', reason, message: unavailableMessage(reason) }
    }
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return
    this.#disposed = true
    const sessions = [...this.#sessions.values()]
    this.#sessions.clear()
    this.#recoveryBlocks.clear()
    await Promise.allSettled(sessions.map(async session => (await session).dispose()))
  }

  #assertAvailable(path: string): void {
    if (this.#disposed) throw new CodeCraftError(ERROR_CODES.intelligenceUnavailable, 'Python 智能服务已停止。', 503)
    if (!this.settings.enabled) throw new CodeCraftError(ERROR_CODES.intelligenceDisabled, 'Python 智能服务已关闭。', 409)
    if (!supportsPythonIntelligence(this.platform)) {
      throw new CodeCraftError(
        ERROR_CODES.intelligenceUnavailable,
        unsupportedPythonPlatformMessage(this.platform),
        503,
      )
    }
    if (!isPythonPath(path)) throw new CodeCraftError(ERROR_CODES.intelligenceDisabled, '该文件不使用 Python 智能服务。', 409)
  }

  #session(root: string, bypassRecoveryBlock = false): Promise<LspSession> {
    const existing = this.#sessions.get(root)
    if (existing !== undefined) return existing
    const blocked = this.#activeRecoveryBlock(root)
    if (blocked !== undefined && !bypassRecoveryBlock) return Promise.reject(blocked.error)
    const created = this.#createSession(root)
    this.#sessions.set(root, created)
    void created.catch((error: unknown) => {
      if (this.#sessions.get(root) === created) this.#sessions.delete(root)
      this.#blockRecovery(root, error instanceof Error ? error : new Error(String(error)))
    })
    return created
  }

  async #createSession(root: string): Promise<LspSession> {
    const [argv, interpreterPath] = await Promise.all([
      resolvePyrightLaunch(this.subprocess, this.settings),
      resolvePythonInterpreter(this.subprocess, root, this.settings, this.platform),
    ])
    const session = new LspSession(this.subprocess, root, argv, interpreterPath)
    try {
      await session.ready()
      return session
    } catch (error) {
      await session.dispose().catch(() => undefined)
      throw error
    }
  }

  async #restart(root: string, failed: LspSession): Promise<LspSession> {
    const documents = failed.documents()
    const current = this.#sessions.get(root)
    if (current !== undefined && await current.catch(() => undefined) === failed) {
      this.#sessions.delete(root)
    }
    await failed.dispose().catch(() => undefined)
    const restarted = await this.#session(root, true)
    for (const document of documents) {
      await restarted.sync(
        document.target,
        document.tabId,
        document.revision,
        document.content,
      )
    }
    return restarted
  }

  async #recover(root: string, failed: LspSession, error: LspTransportError): Promise<LspSession> {
    const blocked = this.#activeRecoveryBlock(root)
    if (blocked !== undefined) throw blocked.error
    this.#blockRecovery(root, error)
    return this.#restart(root, failed)
  }

  async #completeRecovery<T>(root: string, operation: () => Promise<T>): Promise<T> {
    try {
      const result = await operation()
      this.#recoveryBlocks.delete(root)
      return result
    } catch (error) {
      if (error instanceof LspTransportError) this.#blockRecovery(root, error)
      else this.#recoveryBlocks.delete(root)
      throw error
    }
  }

  #blockRecovery(root: string, error: Error): void {
    this.#recoveryBlocks.set(root, {
      until: this.#now() + this.#recoveryCooldownMs,
      error,
    })
  }

  #activeRecoveryBlock(root: string): RecoveryBlock | undefined {
    const block = this.#recoveryBlocks.get(root)
    if (block === undefined) return undefined
    if (block.until > this.#now()) return block
    this.#recoveryBlocks.delete(root)
    return undefined
  }

  async #retireIfIdle(root: string, pending: Promise<LspSession>, session: LspSession): Promise<void> {
    if (session.hasDocuments() || this.#sessions.get(root) !== pending) return
    this.#sessions.delete(root)
    await session.dispose().catch(() => undefined)
  }
}
