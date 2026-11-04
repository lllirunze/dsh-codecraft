import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
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
