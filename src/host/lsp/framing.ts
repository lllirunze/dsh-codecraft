import { Buffer } from 'node:buffer'

const HEADER_SEPARATOR = Buffer.from('\r\n\r\n')

/** Bounded decoder for Language Server Protocol Content-Length frames. */
export class MessageDecoder {
  #buffer = Buffer.alloc(0)

  constructor(
    readonly maxMessageBytes = 16 * 1024 * 1024,
    readonly onMessage: (message: unknown) => void,
  ) {}

  push(chunk: Uint8Array): void {
    this.#buffer = Buffer.concat([this.#buffer, chunk])
    while (true) {
      const headerEnd = this.#buffer.indexOf(HEADER_SEPARATOR)
      if (headerEnd === -1) {
        if (this.#buffer.byteLength > 8192) throw new Error('LSP header exceeds 8 KiB')
        return
      }
      const header = this.#buffer.subarray(0, headerEnd).toString('ascii')
      const lengths = [...header.matchAll(/^Content-Length:\s*(\d+)\s*$/gim)]
      if (lengths.length !== 1) throw new Error('LSP frame has an invalid Content-Length header')
      const length = Number(lengths[0]?.[1])
      if (!Number.isSafeInteger(length) || length < 0 || length > this.maxMessageBytes) {
        throw new Error(`LSP message exceeds the ${this.maxMessageBytes}-byte limit`)
      }
      const bodyStart = headerEnd + HEADER_SEPARATOR.byteLength
      if (this.#buffer.byteLength < bodyStart + length) return
      const body = this.#buffer.subarray(bodyStart, bodyStart + length).toString('utf8')
      this.#buffer = this.#buffer.subarray(bodyStart + length)
      let parsed: unknown
      try {
        parsed = JSON.parse(body)
      } catch {
        throw new Error('LSP frame contains invalid JSON')
      }
      this.onMessage(parsed)
    }
  }
}

export function encodeMessage(message: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(message), 'utf8')
  return Buffer.concat([
    Buffer.from(`Content-Length: ${body.byteLength}\r\n\r\n`, 'ascii'),
    body,
  ])
}
