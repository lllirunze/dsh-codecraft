import type {
  IntelligenceCompletionRequest,
  IntelligenceCompletionResult,
  IntelligenceStatusResult,
  IntelligenceSyncRequest,
  IntelligenceUnavailableReason,
} from '../../protocol.js'
import { ERROR_CODES } from '../../protocol.js'
import {
  DEFAULT_JAVA_INTELLIGENCE_SETTINGS,
  type JavaIntelligenceSettings,
  type PythonIntelligenceSettings,
} from '../../settings/schema.js'
import type { ManagedSubprocessService } from '../context.js'
import { CodeCraftError } from '../errors.js'
import { resolveReadablePath } from '../files.js'
import { JavaEnvironmentError } from '../languages/java/environment.js'
import { javaIntelligenceProvider } from '../languages/java/provider.js'
import { pythonIntelligenceProvider } from '../languages/python/provider.js'
import { LspTransportError } from '../lsp/connection.js'
import { LspSession, LspSessionRetiredError } from '../lsp/session.js'
import type { IntelligenceProvider } from './provider.js'
import { IntelligenceProviderError } from './provider.js'

const RECOVERY_COOLDOWN_MS = 10_000

interface RecoveryBlock {
  until: number
  error: Error
}

export function followsMemberAccess(content: string, line: number, character: number): boolean {
  if (line < 0 || character < 1) return false
  const text = content.split('\n')[line]
  return text !== undefined && text.charAt(character - 1) === '.'
}

function unavailableReason(error: unknown): IntelligenceUnavailableReason {
  if (error instanceof JavaEnvironmentError || error instanceof IntelligenceProviderError) return error.reason
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (message.includes('interpreter')) return 'environment-limited'
  if (message.includes('timeout') || (error instanceof Error && error.name === 'TimeoutError')) return 'initialize-timeout'
  if (message.includes('failed to start') || message.includes('spawn') || message.includes('enoent')) return 'spawn-failed'
  if (message.includes('exited') || error instanceof LspTransportError) return 'server-exited'
  if (error instanceof CodeCraftError) return 'workspace-invalid'
  return 'server-not-found'
}

function unavailableMessage(reason: IntelligenceUnavailableReason, provider?: IntelligenceProvider): string {
  if (provider?.id === 'python') {
    switch (reason) {
      case 'environment-limited': return 'The configured Python interpreter is unavailable. Check the CodeCraft settings.'
      case 'initialize-timeout': return 'Pyright did not initialize in time. Restart DSH Desktop and try again.'
      case 'spawn-failed': return 'Pyright could not start. Restart DSH Desktop and check the configured server path.'
      case 'server-exited': return 'Pyright stopped unexpectedly. Try completion again after a short delay.'
      case 'workspace-invalid': return 'The Python file is not available inside the active workspace.'
      case 'server-not-found': return 'Pyright or its Node.js runtime could not be resolved.'
      case 'unsupported-platform': return 'Python Intelligence is supported on macOS and Windows.'
      default: break
    }
  }
  if (provider === undefined && reason === 'server-exited') {
    return 'Pyright stopped unexpectedly. Try completion again after a short delay.'
  }
  const language = provider?.displayName ?? 'Language intelligence'
  switch (reason) {
    case 'environment-limited': return `${language} runtime is unavailable. Check the CodeCraft settings.`
    case 'initialize-timeout': return `${language} language server did not initialize in time.`
    case 'spawn-failed': return `${language} language server could not start.`
    case 'server-exited': return `${language} language server stopped unexpectedly.`
    case 'workspace-invalid': return 'The file is not available inside the active workspace.'
    case 'server-not-found': return `${language} language server could not be resolved.`
    case 'unsupported-platform': return `${language} is supported on macOS and Windows.`
    case 'jdk-too-old': return 'JDT LS requires a tooling JDK 21 or newer.'
    case 'jdtls-not-found': return 'Set the extracted JDT LS directory in CodeCraft settings or JDTLS_HOME.'
    case 'distribution-invalid': return 'The selected JDT LS directory is not a valid distribution.'
    case 'platform-config-missing': return 'The JDT LS distribution does not contain this platform configuration.'
    case 'cache-unwritable': return 'The Java language-server cache is not writable.'
  }
}

/** Convert provider failures into stable messages safe for the browser. */
export function publicIntelligenceError(error: unknown): Error {
  if (error instanceof CodeCraftError) return error
  if (error instanceof Error && error.name === 'AbortError') return error
  const reason = unavailableReason(error)
  return new CodeCraftError(ERROR_CODES.intelligenceUnavailable, unavailableMessage(reason), 503)
}

/** Provider-aware owner of workspace-scoped language-server sessions. */
export class IntelligenceManager {
  readonly #sessions = new Map<string, Promise<LspSession>>()
  readonly #emptyCompletionRecovery = new WeakSet<LspSession>()
  readonly #semanticReady = new WeakSet<LspSession>()
  readonly #recoveryBlocks = new Map<string, RecoveryBlock>()
  readonly #providers: readonly IntelligenceProvider[]
  #disposed = false

  constructor(
    readonly subprocess: ManagedSubprocessService,
    pythonSettings: PythonIntelligenceSettings,
    readonly platform: NodeJS.Platform = process.platform,
    javaSettings: JavaIntelligenceSettings = DEFAULT_JAVA_INTELLIGENCE_SETTINGS,
  ) {
    this.#providers = [pythonIntelligenceProvider(pythonSettings), javaIntelligenceProvider(javaSettings)]
  }

  async sync(root: string, request: IntelligenceSyncRequest): Promise<IntelligenceStatusResult> {
    const provider = this.#assertAvailable(request.path)
    const { root: canonicalRoot, target } = await resolveReadablePath(root, request.path)
    const key = this.#key(provider, canonicalRoot)
    const session = await this.#session(provider, canonicalRoot)
    try {
      await session.sync(target, request.tabId, request.revision, request.content)
    } catch (error) {
      if (error instanceof LspSessionRetiredError) {
        const replacement = await this.#session(provider, canonicalRoot)
        await replacement.sync(target, request.tabId, request.revision, request.content)
        this.#recoveryBlocks.delete(key)
        return this.#ready(provider, replacement)
      }
      if (error instanceof Error && error.message === 'stale document revision') {
        throw new CodeCraftError(ERROR_CODES.intelligenceStale, 'The intelligence request is stale.', 409)
      }
      if (error instanceof LspTransportError) {
        const restarted = await this.#recover(provider, canonicalRoot, session, error)
        await this.#completeRecovery(key, () => restarted.sync(target, request.tabId, request.revision, request.content))
        return this.#ready(provider, restarted)
      }
      throw error
    }
    this.#recoveryBlocks.delete(key)
    return this.#ready(provider, session)
  }

  async complete(root: string, request: IntelligenceCompletionRequest, signal?: AbortSignal): Promise<IntelligenceCompletionResult> {
    const provider = this.#assertAvailable(request.path)
    if (!provider.completion) {
      throw new CodeCraftError(ERROR_CODES.intelligenceDisabled, `${provider.displayName} semantic completion is disabled.`, 409)
    }
    const { root: canonicalRoot, target } = await resolveReadablePath(root, request.path)
    const key = this.#key(provider, canonicalRoot)
    const session = await this.#session(provider, canonicalRoot)
    let result: IntelligenceCompletionResult
    try {
      result = await session.complete(target, request.tabId, request.revision, request.content, request.position, signal)
    } catch (error) {
      if (error instanceof LspSessionRetiredError) {
        const replacement = await this.#session(provider, canonicalRoot)
        result = await replacement.complete(target, request.tabId, request.revision, request.content, request.position, signal)
        this.#semanticReady.add(replacement)
        this.#recoveryBlocks.delete(key)
        return result
      }
      if (error instanceof Error && error.message === 'stale document revision') {
        throw new CodeCraftError(ERROR_CODES.intelligenceStale, 'The intelligence request is stale.', 409)
      }
      if (error instanceof LspTransportError) {
        const restarted = await this.#recover(provider, canonicalRoot, session, error)
        const recovered = await this.#completeRecovery(key, () => restarted.complete(
          target, request.tabId, request.revision, request.content, request.position, signal,
        ))
        this.#semanticReady.add(restarted)
        return recovered
      }
      throw error
    }
    this.#recoveryBlocks.delete(key)
    this.#semanticReady.add(session)
    if (provider.emptyMemberRecovery === true
      && result.items.length === 0
      && followsMemberAccess(request.content, request.position.line, request.position.character)
      && !this.#emptyCompletionRecovery.has(session)) {
      this.#emptyCompletionRecovery.add(session)
      this.#blockRecovery(key, new LspTransportError(`${provider.displayName} returned no member completions`))
      const restarted = await this.#restart(provider, canonicalRoot, session)
      this.#emptyCompletionRecovery.add(restarted)
      const recovered = await this.#completeRecovery(key, () => restarted.complete(
        target, request.tabId, request.revision, request.content, request.position, signal,
      ))
      this.#semanticReady.add(restarted)
      return recovered
    }
    return result
  }

  async close(root: string, path: string, tabId: string): Promise<void> {
    const provider = this.#provider(path)
    if (provider === undefined) return
    const { root: canonicalRoot, target } = await resolveReadablePath(root, path)
    const key = this.#key(provider, canonicalRoot)
    const pending = this.#sessions.get(key)
    if (pending === undefined) return
    const session = await pending
    await session.close(target, tabId)
    await this.#retireIfIdle(key, pending, session)
  }

  async status(root: string, path: string): Promise<IntelligenceStatusResult> {
    const provider = this.#provider(path)
    if (provider === undefined || !provider.enabled) return { status: 'disabled' }
    if (!provider.supports(this.platform)) {
      return {
        status: 'unavailable',
        reason: 'unsupported-platform',
        message: provider.unsupportedMessage(this.platform),
      }
    }
    try {
      const { root: canonicalRoot } = await resolveReadablePath(root, path)
      const key = this.#key(provider, canonicalRoot)
      const pending = this.#session(provider, canonicalRoot)
      const session = await pending
      try {
        return this.#ready(provider, session)
      } finally {
        await this.#retireIfIdle(key, pending, session)
      }
    } catch (error) {
      const reason = unavailableReason(error)
      return { status: 'unavailable', reason, message: unavailableMessage(reason, provider) }
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

  #provider(path: string): IntelligenceProvider | undefined {
    return this.#providers.find(provider => provider.matches(path))
  }

  #assertAvailable(path: string): IntelligenceProvider {
    const provider = this.#provider(path)
    if (this.#disposed) throw new CodeCraftError(ERROR_CODES.intelligenceUnavailable, 'The intelligence service has stopped.', 503)
    if (provider === undefined || !provider.enabled) throw new CodeCraftError(ERROR_CODES.intelligenceDisabled, 'Intelligence is disabled for this file.', 409)
    if (!provider.supports(this.platform)) {
      throw new CodeCraftError(ERROR_CODES.intelligenceUnavailable, provider.unsupportedMessage(this.platform), 503)
    }
    return provider
  }

  #ready(provider: IntelligenceProvider, session: LspSession): IntelligenceStatusResult {
    return {
      status: provider.id === 'java' && !this.#semanticReady.has(session) ? 'starting' : 'ready',
      ...(session.interpreterPath === undefined ? {} : { interpreterPath: session.interpreterPath }),
    }
  }

  #key(provider: IntelligenceProvider, root: string): string {
    return `${provider.id}\0${root}`
  }

  #session(provider: IntelligenceProvider, root: string, bypassRecoveryBlock = false): Promise<LspSession> {
    const key = this.#key(provider, root)
    const existing = this.#sessions.get(key)
    if (existing !== undefined) return existing
    const blocked = this.#activeRecoveryBlock(key)
    if (blocked !== undefined && !bypassRecoveryBlock) return Promise.reject(blocked.error)
    const created = provider.createSession(this.subprocess, root, this.platform)
    this.#sessions.set(key, created)
    void created.catch((error: unknown) => {
      if (this.#sessions.get(key) === created) this.#sessions.delete(key)
      this.#blockRecovery(key, error instanceof Error ? error : new Error(String(error)))
    })
    return created
  }

  async #restart(provider: IntelligenceProvider, root: string, failed: LspSession): Promise<LspSession> {
    const key = this.#key(provider, root)
    const documents = failed.documents()
    const current = this.#sessions.get(key)
    if (current !== undefined && await current.catch(() => undefined) === failed) this.#sessions.delete(key)
    await failed.dispose().catch(() => undefined)
    const restarted = await this.#session(provider, root, true)
    for (const document of documents) {
      await restarted.sync(document.target, document.tabId, document.revision, document.content)
    }
    return restarted
  }

  async #recover(provider: IntelligenceProvider, root: string, failed: LspSession, error: LspTransportError): Promise<LspSession> {
    const key = this.#key(provider, root)
    const blocked = this.#activeRecoveryBlock(key)
    if (blocked !== undefined) throw blocked.error
    this.#blockRecovery(key, error)
    return this.#restart(provider, root, failed)
  }

  async #completeRecovery<T>(key: string, operation: () => Promise<T>): Promise<T> {
    try {
      const result = await operation()
      this.#recoveryBlocks.delete(key)
      return result
    } catch (error) {
      if (error instanceof LspTransportError) this.#blockRecovery(key, error)
      else this.#recoveryBlocks.delete(key)
      throw error
    }
  }

  #blockRecovery(key: string, error: Error): void {
    this.#recoveryBlocks.set(key, { until: Date.now() + RECOVERY_COOLDOWN_MS, error })
  }

  #activeRecoveryBlock(key: string): RecoveryBlock | undefined {
    const block = this.#recoveryBlocks.get(key)
    if (block === undefined) return undefined
    if (block.until > Date.now()) return block
    this.#recoveryBlocks.delete(key)
    return undefined
  }

  async #retireIfIdle(key: string, pending: Promise<LspSession>, session: LspSession): Promise<void> {
    if (session.hasDocuments() || this.#sessions.get(key) !== pending) return
    this.#sessions.delete(key)
    await session.dispose().catch(() => undefined)
  }
}
