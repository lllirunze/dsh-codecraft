import type { ManagedSubprocessHandle, ManagedSubprocessService } from '../context.js'
import { MessageDecoder, encodeMessage } from './framing.js'

interface JsonRpcError {
  code: number
  message: string
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  removeAbort?: () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export class LspTransportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LspTransportError'
  }
}

export interface LspLaunchOptions {
  argv: readonly string[]
  cwd: string
  pythonPath?: string
  workspaceSettings?: unknown
}

/** One JSON-RPC connection over a DSH-managed language-server process. */
export class LspConnection {
  readonly #handle: ManagedSubprocessHandle
  readonly #pending = new Map<number, PendingRequest>()
  readonly #pythonPath: string | undefined
  readonly #workspaceSettings: unknown
  #nextId = 1
  #failed: Error | undefined
  #disposing = false

  private constructor(handle: ManagedSubprocessHandle, pythonPath: string | undefined, workspaceSettings: unknown) {
    this.#handle = handle
    this.#pythonPath = pythonPath
    this.#workspaceSettings = workspaceSettings
    const stdout = handle.stdout
    const stdin = handle.stdin
    if (stdout === undefined || stdin === undefined) throw new Error('language server did not expose piped stdio')
    const decoder = new MessageDecoder(16 * 1024 * 1024, message => this.#receive(message))
    stdout.on('data', (chunk: Buffer | Uint8Array) => {
      try {
        decoder.push(chunk)
      } catch (error) {
        this.#fail(new LspTransportError(`language server protocol failure: ${messageOf(error)}`))
        handle.terminate()
      }
    })
    stdout.on('error', error => this.#fail(new LspTransportError(`language server stdout failed: ${messageOf(error)}`)))
    stdin.on('error', error => this.#fail(new LspTransportError(`language server stdin failed: ${messageOf(error)}`)))
    void handle.done.then(
      outcome => {
        if (!this.#disposing) {
          const stderr = handle.collected.stderr?.readFrom(0).text.trim()
          const detail = stderr === undefined || stderr === '' ? '' : `: ${stderr.slice(-2000)}`
          this.#fail(new LspTransportError(`language server exited (${outcome.exitCode ?? outcome.signal ?? 'unknown'})${detail}`))
        }
      },
      error => this.#fail(new LspTransportError(`language server failed to start: ${messageOf(error)}`)),
    )
  }

  static start(subprocess: ManagedSubprocessService, options: LspLaunchOptions): LspConnection {
    const handle = subprocess.spawn({
      argv: options.argv,
      cwd: options.cwd,
      stdio: {
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: { maxBytes: 1024 * 1024 },
      },
      graceMs: 2000,
    })
    return new LspConnection(handle, options.pythonPath, options.workspaceSettings)
  }

  notify(method: string, params?: unknown): void {
    this.#write({ jsonrpc: '2.0', method, ...(params === undefined ? {} : { params }) })
  }

  request<T>(method: string, params?: unknown, signal?: AbortSignal): Promise<T> {
    if (this.#failed !== undefined) return Promise.reject(this.#failed)
    if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    const id = this.#nextId++
    return new Promise<T>((resolve, reject) => {
      const pending: PendingRequest = {
        resolve: value => resolve(value as T),
        reject,
      }
      if (signal !== undefined) {
        const onAbort = (): void => {
          if (!this.#pending.delete(id)) return
          this.notify('$/cancelRequest', { id })
          reject(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'))
        }
        signal.addEventListener('abort', onAbort, { once: true })
        pending.removeAbort = () => signal.removeEventListener('abort', onAbort)
      }
      this.#pending.set(id, pending)
      try {
        this.#write({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) })
      } catch (error) {
        this.#pending.delete(id)
        pending.removeAbort?.()
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  async dispose(): Promise<void> {
    if (this.#disposing) return
    this.#disposing = true
    const timeout = AbortSignal.timeout(3000)
    try {
      await this.request('shutdown', undefined, timeout)
      this.notify('exit')
    } catch {
      // Escalate through the managed process boundary below.
    }
    this.#handle.stdin?.end()
    const graceful = await Promise.race([
      this.#handle.done.then(() => true, () => true),
      new Promise<false>(resolve => setTimeout(() => resolve(false), 1000)),
    ])
    if (!graceful) this.#handle.terminate()
    const waitSignal = AbortSignal.timeout(4000)
    await this.#handle.waitForExit(waitSignal).catch(() => false)
    this.#fail(new Error('language server connection disposed'))
  }

  #write(message: unknown): void {
    if (this.#failed !== undefined) throw this.#failed
    const stdin = this.#handle.stdin
    if (stdin === undefined || stdin.destroyed) throw new Error('language server stdin is closed')
    stdin.write(encodeMessage(message))
  }

  #receive(value: unknown): void {
    if (!isRecord(value) || value.jsonrpc !== '2.0') return
    const id = value.id
    if ((typeof id === 'number' || typeof id === 'string') && typeof value.method === 'string') {
      this.#answerServerRequest(id, value.method, value.params)
      return
    }
    if (typeof id !== 'number') return
    const pending = this.#pending.get(id)
    if (pending === undefined) return
    this.#pending.delete(id)
    pending.removeAbort?.()
    if (isRecord(value.error)) {
      const error = value.error as unknown as JsonRpcError
      pending.reject(new Error(`LSP ${String(error.code)}: ${String(error.message)}`))
    } else {
      pending.resolve(value.result)
    }
  }

  #answerServerRequest(id: number | string, method: string, params: unknown): void {
    let result: unknown = null
    if (method === 'workspace/configuration') {
      const items = isRecord(params) && Array.isArray(params.items) ? params.items : []
      result = items.map(item => {
        const section = isRecord(item) && typeof item.section === 'string' ? item.section : ''
        if (section === 'python') return this.#pythonPath === undefined ? {} : { pythonPath: this.#pythonPath }
        if (section === 'python.analysis') return { autoSearchPaths: true, useLibraryCodeForTypes: true }
        if (section !== '' && isRecord(this.#workspaceSettings)) {
          let current: unknown = this.#workspaceSettings
          for (const key of section.split('.')) {
            current = isRecord(current) ? current[key] : undefined
          }
          if (current !== undefined) return current
        }
        return {}
      })
    } else if (method === 'workspace/workspaceFolders') {
      result = null
    } else if (method === 'client/registerCapability' || method === 'client/unregisterCapability') {
      result = null
    } else if (method === 'workspace/applyEdit') {
      result = { applied: false, failureReason: 'CodeCraft does not accept server workspace edits.' }
    }
    try {
      this.#write({ jsonrpc: '2.0', id, result })
    } catch {
      // Connection failure already rejects callers.
    }
  }

  #fail(error: Error): void {
    if (this.#failed !== undefined) return
    this.#failed = error
    for (const pending of this.#pending.values()) {
      pending.removeAbort?.()
      pending.reject(error)
    }
    this.#pending.clear()
  }
}
