import { Buffer } from 'node:buffer'
import { PassThrough } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import type {
  ManagedSubprocessHandle,
  ManagedSubprocessService,
  ManagedSubprocessSpawnSpec,
} from '../src/host/context.js'
import { LspConnection } from '../src/host/lsp/connection.js'
import { MessageDecoder, encodeMessage } from '../src/host/lsp/framing.js'

describe('LSP message framing', () => {
  it('decodes split and combined Content-Length messages', () => {
    const received: unknown[] = []
    const decoder = new MessageDecoder(1024, message => received.push(message))
    const first = encodeMessage({ jsonrpc: '2.0', id: 1, result: { ready: true } })
    const second = encodeMessage({ jsonrpc: '2.0', method: 'initialized', params: {} })
    decoder.push(first.subarray(0, 9))
    expect(received).toEqual([])
    decoder.push(Buffer.concat([first.subarray(9), second]))
    expect(received).toEqual([
      { jsonrpc: '2.0', id: 1, result: { ready: true } },
      { jsonrpc: '2.0', method: 'initialized', params: {} },
    ])
  })

  it('rejects malformed, duplicate, and oversized lengths', () => {
    const onMessage = vi.fn()
    expect(() => new MessageDecoder(8, onMessage).push(Buffer.from('Content-Length: 9\r\n\r\n123456789')))
      .toThrow('exceeds')
    expect(() => new MessageDecoder(100, onMessage).push(Buffer.from('Content-Type: json\r\n\r\n{}')))
      .toThrow('Content-Length')
    expect(() => new MessageDecoder(100, onMessage).push(Buffer.from(
      'Content-Length: 2\r\nContent-Length: 2\r\n\r\n{}',
    ))).toThrow('Content-Length')
  })
})

describe('LSP request cancellation', () => {
  it('sends $/cancelRequest and releases an aborted pending request', async () => {
    const stdin = new PassThrough()
    const stdout = new PassThrough()
    const messages: unknown[] = []
    const decoder = new MessageDecoder(4096, message => messages.push(message))
    stdin.on('data', chunk => decoder.push(chunk))
    let finish: ((outcome: { exitCode: number | null, signal: NodeJS.Signals | null }) => void) | undefined
    const done = new Promise<{ exitCode: number | null, signal: NodeJS.Signals | null }>(resolve => {
      finish = resolve
    })
    const handle: ManagedSubprocessHandle = {
      pid: 1,
      stdin,
      stdout,
      stderr: new PassThrough(),
      collected: {},
      done,
      terminate: () => finish?.({ exitCode: null, signal: 'SIGTERM' }),
      waitForExit: async () => true,
    }
    const subprocess: ManagedSubprocessService = {
      resolveExecutable: async command => command,
      spawn: (_spec: ManagedSubprocessSpawnSpec) => handle,
    }
    const connection = LspConnection.start(subprocess, { argv: ['server'], cwd: '/workspace' })
    const controller = new AbortController()
    const request = connection.request('textDocument/completion', {}, controller.signal)
    controller.abort(new DOMException('Superseded', 'AbortError'))
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
    expect(messages).toEqual([
      { jsonrpc: '2.0', id: 1, method: 'textDocument/completion', params: {} },
      { jsonrpc: '2.0', method: '$/cancelRequest', params: { id: 1 } },
    ])
    handle.terminate()
  })

  it('terminates a server that acknowledges shutdown but does not exit', async () => {
    const stdin = new PassThrough()
    const stdout = new PassThrough()
    let finish: ((outcome: { exitCode: number | null, signal: NodeJS.Signals | null }) => void) | undefined
    let terminated = false
    const done = new Promise<{ exitCode: number | null, signal: NodeJS.Signals | null }>(resolve => {
      finish = resolve
    })
    const decoder = new MessageDecoder(4096, value => {
      if (typeof value !== 'object' || value === null) return
      const message = value as { id?: number, method?: string }
      if (message.method === 'shutdown' && message.id !== undefined) {
        stdout.write(encodeMessage({ jsonrpc: '2.0', id: message.id, result: null }))
      }
    })
    stdin.on('data', chunk => decoder.push(chunk))
    const handle: ManagedSubprocessHandle = {
      pid: 2,
      stdin,
      stdout,
      stderr: new PassThrough(),
      collected: {},
      done,
      terminate: () => {
        terminated = true
        finish?.({ exitCode: null, signal: 'SIGTERM' })
      },
      waitForExit: async () => {
        await done
        return true
      },
    }
    const subprocess: ManagedSubprocessService = {
      resolveExecutable: async command => command,
      spawn: () => handle,
    }
    const connection = LspConnection.start(subprocess, { argv: ['server'], cwd: '/workspace' })
    await connection.dispose()
    expect(terminated).toBe(true)
  }, 5_000)
})
