import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IntelligenceManager } from '../src/host/intelligence/manager.js'
import type { HostContext, RequestLike, ResponseLike } from '../src/host/context.js'
import { createApiHandler, dispatch } from '../src/host/routes.js'
import { MAX_REQUEST_BYTES } from '../src/protocol.js'

const cleanups: string[] = []

async function workspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'codecraft-route-'))
  cleanups.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

class FakeResponse implements ResponseLike {
  statusCode = 200
  headersSent = false
  body = ''
  readonly headers: Record<string, string | number | readonly string[]> = {}
  destroyed = false

  setHeader(name: string, value: string | number | readonly string[]): void {
    this.headers[name.toLowerCase()] = value
  }

  end(body?: string | Uint8Array): void {
    this.body = body === undefined ? '' : typeof body === 'string' ? body : Buffer.from(body).toString('utf8')
    this.headersSent = true
  }

  destroy(): void {
    this.destroyed = true
  }

  json(): any {
    return JSON.parse(this.body)
  }
}

function makeContext(root: string, rejection: number | undefined = undefined): HostContext {
  return {
    webServer: { register: () => () => undefined },
    connection: { requestRejection: () => rejection },
    subprocess: undefined as unknown as HostContext['subprocess'],
    sessions: {
      get: (id: string) => id === 's1' ? { header: { cwd: root } } : undefined,
    },
    get: (name: string) => name === 'workingDirectory'
      ? { get: (session: { header: { cwd?: string } }) => session.header.cwd }
      : undefined,
    effect: () => undefined,
  }
}

function request(body: unknown, options: { method?: string, contentType?: string } = {}): RequestLike {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  const stream = Readable.from([Buffer.from(text)]) as unknown as RequestLike
  Object.defineProperty(stream, 'method', { value: options.method ?? 'POST' })
  Object.defineProperty(stream, 'headers', {
    value: { 'content-type': options.contentType ?? 'application/json' },
  })
  return stream
}

async function call(ctx: HostContext, body: unknown, options?: { method?: string, contentType?: string }): Promise<FakeResponse> {
  const response = new FakeResponse()
  await createApiHandler(ctx)(request(body, options), response)
  return response
}

describe('CodeCraft API route', () => {
  it('rejects requests the connection fence refuses', async () => {
    const root = await workspace()
    const response = await call(makeContext(root, 401), { action: 'read', sessionId: 's1', path: 'a.ts' })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ ok: false, error: { code: 'forbidden' } })
  })

  it('requires POST and JSON', async () => {
    const root = await workspace()
    const ctx = makeContext(root)
    const get = await call(ctx, { action: 'read', sessionId: 's1', path: 'a.ts' }, { method: 'GET' })
    expect(get.statusCode).toBe(405)
    const wrongType = await call(ctx, { action: 'read', sessionId: 's1', path: 'a.ts' }, { contentType: 'text/plain' })
    expect(wrongType.statusCode).toBe(415)
  })

  it('validates the body before touching the filesystem', async () => {
    const root = await workspace()
    const ctx = makeContext(root)
    expect((await call(ctx, '{not json')).statusCode).toBe(400)
    expect((await call(ctx, { action: 'nope', sessionId: 's1', path: 'a.ts' })).statusCode).toBe(400)
    expect((await call(ctx, { action: 'read', sessionId: 's1' })).statusCode).toBe(400)
    expect((await call(ctx, { action: 'save', sessionId: 's1', path: 'a.ts', content: 'x' })).statusCode).toBe(400)
    expect((await call(ctx, {
      action: 'intelligence-complete',
      sessionId: 's1',
      path: 'a.py',
      tabId: 'tab',
      revision: 1,
      content: 'value.',
      position: { line: -1, character: 0 },
    })).statusCode).toBe(400)
  })

  it('reports unavailable intelligence when no manager is mounted', async () => {
    const root = await workspace()
    await writeFile(join(root, 'a.py'), 'value = 1\n')
    const response = await call(makeContext(root), {
      action: 'intelligence-sync',
      sessionId: 's1',
      path: 'a.py',
      tabId: 'tab',
      revision: 1,
      content: 'value = 2\n',
    })
    expect(response.statusCode).toBe(503)
    expect(response.json()).toMatchObject({
      ok: false,
      error: { code: 'intelligence-unavailable' },
    })
  })

  it('reports an unknown session without resolving a path', async () => {
    const root = await workspace()
    const response = await call(makeContext(root), { action: 'read', sessionId: 'other', path: 'a.ts' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ ok: false, error: { code: 'session-not-found' } })
  })

  it('reads and saves through the Session workspace', async () => {
    const root = await workspace()
    await writeFile(join(root, 'a.ts'), 'const a = 1\n')
    const ctx = makeContext(root)
    const read = await call(ctx, { action: 'read', sessionId: 's1', path: 'a.ts' })
    expect(read.statusCode).toBe(200)
    const readBody = read.json()
    expect(readBody.ok).toBe(true)
    expect(readBody.result).toMatchObject({ kind: 'text', content: 'const a = 1\n', newline: 'lf', bom: false })

    const save = await call(ctx, {
      action: 'save',
      sessionId: 's1',
      path: 'a.ts',
      content: 'const a = 2\n',
      expectedVersion: readBody.result.version,
      newline: 'lf',
      bom: false,
    })
    expect(save.statusCode).toBe(200)
    expect(save.json().ok).toBe(true)
    expect(await readFile(join(root, 'a.ts'), 'utf8')).toBe('const a = 2\n')
  })

  it('returns a conflict instead of overwriting an external change', async () => {
    const root = await workspace()
    await writeFile(join(root, 'a.ts'), 'one\n')
    const ctx = makeContext(root)
    const read = (await call(ctx, { action: 'read', sessionId: 's1', path: 'a.ts' })).json()
    await writeFile(join(root, 'a.ts'), 'external\n')
    const save = await call(ctx, {
      action: 'save',
      sessionId: 's1',
      path: 'a.ts',
      content: 'draft\n',
      expectedVersion: read.result.version,
      newline: 'lf',
      bom: false,
    })
    expect(save.statusCode).toBe(409)
    expect(save.json()).toMatchObject({ ok: false, error: { code: 'conflict' } })
    expect(await readFile(join(root, 'a.ts'), 'utf8')).toBe('external\n')
  })

  it('rejects request bodies above the bounded limit', async () => {
    const root = await workspace()
    const response = await call(makeContext(root), 'x'.repeat(MAX_REQUEST_BYTES + 1))
    expect(response.statusCode).toBe(413)
  })

  it('dispatches stat through the same Session authority', async () => {
    const root = await workspace()
    await writeFile(join(root, 'a.ts'), 'a\n')
    const response = await dispatch(makeContext(root), { action: 'stat', sessionId: 's1', path: 'a.ts' })
    expect(response).toMatchObject({ exists: true })
  })

  it('propagates an abandoned HTTP completion request to the intelligence signal', async () => {
    const root = await workspace()
    await writeFile(join(root, 'a.py'), 'value.\n')
    let receivedSignal: AbortSignal | undefined
    const intelligence = {
      complete: vi.fn(async (_root: string, _input: unknown, signal?: AbortSignal) => {
        receivedSignal = signal
        await new Promise<never>((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
      }),
    } as unknown as IntelligenceManager
    const req = request({
      action: 'intelligence-complete',
      sessionId: 's1',
      path: 'a.py',
      tabId: 'tab',
      revision: 1,
      content: 'value.',
      position: { line: 0, character: 6 },
    })
    const response = new FakeResponse()
    const pending = createApiHandler(makeContext(root), intelligence)(req, response)
    await new Promise(resolve => setTimeout(resolve, 0))
    const eventRequest = req as unknown as { emit(event: string): void }
    eventRequest.emit('aborted')
    await pending
    expect(receivedSignal?.aborted).toBe(true)
    expect(response.destroyed).toBe(true)
    expect(response.body).toBe('')
  })

  it('dispatches Hover, definition, and references through the authenticated intelligence manager', async () => {
    const root = await workspace()
    await writeFile(join(root, 'a.py'), 'value = 1\n')
    const hover = vi.fn(async () => ({ revision: 1, contents: { kind: 'plaintext', value: 'int' } }))
    const definition = vi.fn(async () => ({ revision: 1, sourcePath: 'a.py', locations: [] }))
    const references = vi.fn(async () => ({ revision: 1, sourcePath: 'a.py', locations: [] }))
    const intelligence = { hover, definition, references } as unknown as IntelligenceManager
    const common = {
      sessionId: 's1',
      path: 'a.py',
      tabId: 'tab',
      revision: 1,
      content: 'value = 1\n',
      position: { line: 0, character: 1 },
    }

    await expect(dispatch(makeContext(root), { action: 'intelligence-hover', ...common }, intelligence))
      .resolves.toMatchObject({ revision: 1 })
    await expect(dispatch(makeContext(root), { action: 'intelligence-definition', ...common }, intelligence))
      .resolves.toMatchObject({ sourcePath: 'a.py' })
    await expect(dispatch(makeContext(root), { action: 'intelligence-references', ...common }, intelligence))
      .resolves.toMatchObject({ locations: [] })
    expect(hover).toHaveBeenCalledOnce()
    expect(definition).toHaveBeenCalledOnce()
    expect(references).toHaveBeenCalledOnce()
  })

  it('rejects malformed positions for every navigation action', async () => {
    const root = await workspace()
    const common = {
      sessionId: 's1',
      path: 'a.py',
      tabId: 'tab',
      revision: 1,
      content: 'value = 1\n',
      position: { line: 0, character: -1 },
    }
    for (const action of ['intelligence-hover', 'intelligence-definition', 'intelligence-references'] as const) {
      const response = await call(makeContext(root), { action, ...common })
      expect(response.statusCode).toBe(400)
      expect(response.json()).toMatchObject({ ok: false, error: { code: 'bad-request' } })
    }
  })

  it('lists workspace entries and creates a file through the authenticated route', async () => {
    const root = await workspace()
    await writeFile(join(root, 'seed.txt'), 'seed\n')
    const listed = await call(makeContext(root), { action: 'workspace-list', sessionId: 's1', path: '' })
    expect(listed.statusCode).toBe(200)
    expect(listed.json()).toMatchObject({
      ok: true,
      result: { path: '', entries: [{ path: 'seed.txt', kind: 'file', size: 5 }] },
    })

    const created = await call(makeContext(root), {
      action: 'workspace-operation',
      sessionId: 's1',
      operation: { kind: 'createFile', path: 'new.txt', content: 'hello\n' },
    })
    expect(created.statusCode).toBe(200)
    expect(created.json()).toMatchObject({
      ok: true,
      result: { succeeded: [{ path: 'new.txt' }], failed: [] },
    })
    expect(await readFile(join(root, 'new.txt'), 'utf8')).toBe('hello\n')
  })

  it('rejects a workspace operation outside the session workspace', async () => {
    const root = await workspace()
    const response = await call(makeContext(root), {
      action: 'workspace-operation',
      sessionId: 's1',
      operation: { kind: 'createFile', path: '../escape.txt' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      ok: true,
      result: { succeeded: [], failed: [{ path: '../escape.txt', code: 'outside-workspace' }] },
    })
  })

  it('rejects an unknown workspace operation shape', async () => {
    const root = await workspace()
    const response = await call(makeContext(root), {
      action: 'workspace-operation',
      sessionId: 's1',
      operation: { kind: 'chmod', path: 'a.txt' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ ok: false, error: { code: 'bad-request' } })
  })

  it('does not expose internal Python provider paths to the browser', async () => {
    const root = await workspace()
    await writeFile(join(root, 'a.py'), 'value.\n')
    const intelligence = {
      complete: vi.fn(async () => {
        throw new Error('language server exited at /private/user/project with TOKEN=secret')
      }),
    } as unknown as IntelligenceManager
    const response = new FakeResponse()
    await createApiHandler(makeContext(root), intelligence)(request({
      action: 'intelligence-complete',
      sessionId: 's1',
      path: 'a.py',
      tabId: 'tab',
      revision: 1,
      content: 'value.',
      position: { line: 0, character: 6 },
    }), response)
    expect(response.statusCode).toBe(503)
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'intelligence-unavailable',
        message: 'Pyright stopped unexpectedly. Try completion again after a short delay.',
      },
    })
    expect(response.body).not.toContain('/private')
    expect(response.body).not.toContain('TOKEN')
  })
})
