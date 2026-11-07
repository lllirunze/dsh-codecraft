import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { afterEach, describe, expect, it } from 'vitest'
import type { ManagedSubprocessHandle, ManagedSubprocessService } from '../src/host/context.js'
import { MessageDecoder, encodeMessage } from '../src/host/lsp/framing.js'
import { LspSession } from '../src/host/lsp/session.js'
import { IntelligenceManager } from '../src/host/intelligence/manager.js'
import {
  DEFAULT_JAVA_INTELLIGENCE_SETTINGS,
  DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
} from '../src/settings/schema.js'

const cleanups: string[] = []

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('Java LSP session', () => {
  it('reports a stable unavailable reason without starting a process when JDT LS is missing', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft-java-missing-'))
    cleanups.push(workspace)
    const target = join(workspace, 'Main.java')
    await writeFile(target, 'class Main {}\n')
    let spawned = false
    const subprocess: ManagedSubprocessService = {
      resolveExecutable: async command => command,
      spawn: () => {
        spawned = true
        throw new Error('must not start')
      },
    }
    const manager = new IntelligenceManager(
      subprocess,
      DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
      'darwin',
      DEFAULT_JAVA_INTELLIGENCE_SETTINGS,
    )
    try {
      await expect(manager.status(workspace, target)).resolves.toMatchObject({
        status: 'unavailable',
        reason: 'jdtls-not-found',
      })
      expect(spawned).toBe(false)
    } finally {
      await manager.dispose()
    }
  })

  it('uses the Java language ID and returns semantic completion', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft-java-session-'))
    cleanups.push(workspace)
    const target = join(workspace, 'Main.java')
    await writeFile(target, '')
    const stdin = new PassThrough()
    const stdout = new PassThrough()
    const received: Array<Record<string, unknown>> = []
    let finished = false
    let finish: ((value: { exitCode: number | null, signal: NodeJS.Signals | null }) => void) | undefined
    const done = new Promise<{ exitCode: number | null, signal: NodeJS.Signals | null }>(resolve => { finish = resolve })
    const decoder = new MessageDecoder(1024 * 1024, value => {
      if (typeof value !== 'object' || value === null) return
      const message = value as Record<string, unknown>
      received.push(message)
      if (message.method === 'initialize') {
        stdout.write(encodeMessage({ jsonrpc: '2.0', id: message.id, result: { capabilities: {} } }))
      } else if (message.method === 'textDocument/completion') {
        stdout.write(encodeMessage({
          jsonrpc: '2.0',
          id: message.id,
          result: { items: [{ label: 'length', kind: 2 }] },
        }))
      } else if (message.method === 'shutdown') {
        stdout.write(encodeMessage({ jsonrpc: '2.0', id: message.id, result: null }))
      } else if (message.method === 'exit' && !finished) {
        finished = true
        finish?.({ exitCode: 0, signal: null })
      }
    })
    stdin.on('data', chunk => decoder.push(chunk))
    const handle: ManagedSubprocessHandle = {
      pid: 1,
      stdin,
      stdout,
      stderr: new PassThrough(),
      collected: {},
      done,
      terminate: () => {
        if (!finished) {
          finished = true
          finish?.({ exitCode: null, signal: 'SIGTERM' })
        }
      },
      waitForExit: async () => true,
    }
    const subprocess: ManagedSubprocessService = {
      resolveExecutable: async command => command,
      spawn: () => handle,
    }
    const session = new LspSession(subprocess, workspace, ['java', '-jar', 'launcher.jar'], '/jdk/bin/java', {
      languageId: 'java',
      workspaceSettings: { java: { home: '/project-jdk' } },
    })
    try {
      const result = await session.complete(
        target,
        'tab',
        1,
        'class Main { void run() { "x". } }',
        { line: 0, character: 31 },
      )
      expect(result.items).toEqual([{ label: 'length', kind: 2 }])
      const didOpen = received.find(message => message.method === 'textDocument/didOpen')
      expect(didOpen).toMatchObject({
        params: { textDocument: { languageId: 'java', uri: expect.stringContaining('Main.java') } },
      })
    } finally {
      await session.dispose()
    }
  })
})
