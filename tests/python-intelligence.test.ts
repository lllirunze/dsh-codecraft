import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { afterEach, describe, expect, it } from 'vitest'
import type {
  ManagedSubprocessHandle,
  ManagedSubprocessService,
  ManagedSubprocessSpawnSpec,
} from '../src/host/context.js'
import { LspSession } from '../src/host/lsp/session.js'
import { followsMemberAccess, IntelligenceManager } from '../src/host/intelligence/manager.js'
import { DEFAULT_PYTHON_INTELLIGENCE_SETTINGS } from '../src/settings/schema.js'
import { MessageDecoder, encodeMessage } from '../src/host/lsp/framing.js'

const require = createRequire(import.meta.url)
const cleanups: string[] = []

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function localTestSubprocess(): ManagedSubprocessService {
  return {
    resolveExecutable: async command => {
      if (command === 'node') return process.execPath
      throw new Error(`${command} is intentionally unavailable in this test`)
    },
    spawn(spec: ManagedSubprocessSpawnSpec): ManagedSubprocessHandle {
      const child = spawn(spec.argv[0] ?? '', spec.argv.slice(1), {
        cwd: spec.cwd,
        env: { ...process.env, ...spec.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      const done = new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
        child.once('error', reject)
        child.once('close', (exitCode, signal) => resolve({ exitCode, signal }))
      })
      return {
        pid: child.pid ?? -1,
        stdin: child.stdin,
        stdout: child.stdout,
        stderr: child.stderr,
        collected: {},
        done,
        terminate: () => { child.kill('SIGTERM') },
        waitForExit: async signal => {
          if (child.exitCode !== null || child.signalCode !== null) return true
          return await Promise.race([
            done.then(() => true, () => true),
            new Promise<false>(resolve => signal?.addEventListener('abort', () => resolve(false), { once: true })),
          ])
        },
      }
    },
  }
}

function trackedTestSubprocess(): {
  service: ManagedSubprocessService
  readonly spawnCount: number
  readonly activeCount: number
} {
  const base = localTestSubprocess()
  let spawnCount = 0
  let activeCount = 0
  return {
    service: {
      resolveExecutable: base.resolveExecutable,
      spawn(spec) {
        spawnCount += 1
        activeCount += 1
        const handle = base.spawn(spec)
        void handle.done.then(
          () => { activeCount -= 1 },
          () => { activeCount -= 1 },
        )
        return handle
      },
    },
    get spawnCount() { return spawnCount },
    get activeCount() { return activeCount },
  }
}

function fakeLspSubprocess(mode: 'crash-completion' | 'hang-completion'): {
  service: ManagedSubprocessService
  readonly spawnCount: number
} {
  let spawnCount = 0
  return {
    service: {
      resolveExecutable: async command => command === 'node' ? process.execPath : `/runtime/${command}`,
      spawn(_spec) {
        spawnCount += 1
        const stdin = new PassThrough()
        const stdout = new PassThrough()
        const stderr = new PassThrough()
        let settled = false
        let finish: ((outcome: { exitCode: number | null, signal: NodeJS.Signals | null }) => void) | undefined
        const done = new Promise<{ exitCode: number | null, signal: NodeJS.Signals | null }>(resolve => {
          finish = resolve
        })
        const exit = (exitCode: number | null, signal: NodeJS.Signals | null): void => {
          if (settled) return
          settled = true
          finish?.({ exitCode, signal })
        }
        const decoder = new MessageDecoder(1024 * 1024, value => {
          if (typeof value !== 'object' || value === null) return
          const message = value as { id?: number, method?: string }
          if (message.method === 'initialize' && message.id !== undefined) {
            stdout.write(encodeMessage({ jsonrpc: '2.0', id: message.id, result: { capabilities: {} } }))
          } else if (message.method === 'textDocument/completion' && mode === 'crash-completion') {
            exit(1, null)
          } else if (message.method === 'shutdown' && message.id !== undefined) {
            stdout.write(encodeMessage({ jsonrpc: '2.0', id: message.id, result: null }))
          } else if (message.method === 'exit') {
            exit(0, null)
          }
        })
        stdin.on('data', chunk => decoder.push(chunk))
        return {
          pid: spawnCount,
          stdin,
          stdout,
          stderr,
          collected: { stderr: { readFrom: () => ({ text: '' }) } },
          done,
          terminate: () => exit(null, 'SIGTERM'),
          waitForExit: async signal => {
            if (settled) return true
            return Promise.race([
              done.then(() => true),
              new Promise<false>(resolve => signal?.addEventListener('abort', () => resolve(false), { once: true })),
            ])
          },
        }
      },
    },
    get spawnCount() { return spawnCount },
  }
}

function delayedCompletionSubprocess(): {
  service: ManagedSubprocessService
  respond(items: unknown[]): void
} {
  const stdin = new PassThrough()
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  let completionId: number | undefined
  let settled = false
  let finish: ((outcome: { exitCode: number | null, signal: NodeJS.Signals | null }) => void) | undefined
  const done = new Promise<{ exitCode: number | null, signal: NodeJS.Signals | null }>(resolve => {
    finish = resolve
  })
  const exit = (exitCode: number | null, signal: NodeJS.Signals | null): void => {
    if (settled) return
    settled = true
    finish?.({ exitCode, signal })
  }
  const decoder = new MessageDecoder(1024 * 1024, value => {
    if (typeof value !== 'object' || value === null) return
    const message = value as { id?: number, method?: string }
    if (message.method === 'initialize' && message.id !== undefined) {
      stdout.write(encodeMessage({ jsonrpc: '2.0', id: message.id, result: { capabilities: {} } }))
    } else if (message.method === 'textDocument/completion') {
      completionId = message.id
    } else if (message.method === 'shutdown' && message.id !== undefined) {
      stdout.write(encodeMessage({ jsonrpc: '2.0', id: message.id, result: null }))
    } else if (message.method === 'exit') {
      exit(0, null)
    }
  })
  stdin.on('data', chunk => decoder.push(chunk))
  const handle: ManagedSubprocessHandle = {
    pid: 1,
    stdin,
    stdout,
    stderr,
    collected: { stderr: { readFrom: () => ({ text: '' }) } },
    done,
    terminate: () => exit(null, 'SIGTERM'),
    waitForExit: async () => {
      await done
      return true
    },
  }
  return {
    service: {
      resolveExecutable: async command => command,
      spawn: () => handle,
    },
    respond(items) {
      if (completionId === undefined) throw new Error('completion request was not received')
      stdout.write(encodeMessage({ jsonrpc: '2.0', id: completionId, result: { items } }))
    },
  }
}

describe('Python Intelligence with Pyright', () => {
  it('recognizes member completion positions without crossing lines', () => {
    expect(followsMemberAccess('service.\nnext', 0, 8)).toBe(true)
    expect(followsMemberAccess('service\n.next', 1, 0)).toBe(false)
    expect(followsMemberAccess('service', 0, 7)).toBe(false)
  })

  it('completes a cross-file member from unsaved editor content', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft pyright-测试-'))
    cleanups.push(workspace)
    await writeFile(join(workspace, 'service.py'), [
      'class UserService:',
      '    def create_user(self) -> None:',
      '        pass',
      '',
    ].join('\n'))
    await writeFile(join(workspace, 'main.py'), '')
    const pyright = require.resolve('pyright/langserver.index.js')
    const session = new LspSession(localTestSubprocess(), workspace, [process.execPath, pyright, '--stdio'], undefined)
    try {
      const content = [
        'from service import UserService',
        'service = UserService()',
        'service.',
      ].join('\n')
      const result = await session.complete(
        join(workspace, 'main.py'),
        'tab:1',
        1,
        content,
        { line: 2, character: 8 },
        AbortSignal.timeout(15_000),
      )
      expect(result.items.map(item => item.label)).toContain('create_user')
      expect(result.items.find(item => item.label === 'create_user')).toMatchObject({ kind: 2 })
    } finally {
      await session.dispose()
    }
  }, 20_000)

  it('returns real Hover, definition, and project reference locations through the manager', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft navigation-测试-'))
    cleanups.push(workspace)
    const service = [
      'class UserService:',
      '    def validate_user(self, username: str) -> bool:',
      '        """Validate a user."""',
      '        return bool(username)',
      '',
    ].join('\n')
    const main = [
      'from service import UserService',
      'service = UserService()',
      'allowed = service.validate_user("Alice")',
      '',
    ].join('\n')
    await writeFile(join(workspace, 'service.py'), service)
    await writeFile(join(workspace, 'main.py'), main)
    const manager = new IntelligenceManager(
      localTestSubprocess(),
      DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
      'darwin',
    )
    try {
      const common = {
        sessionId: 'session',
        path: 'main.py',
        tabId: 'main-tab',
        revision: 1,
        content: main,
        position: { line: 2, character: 20 },
      }
      const hover = await manager.hover(workspace, { action: 'intelligence-hover', ...common })
      expect(hover.contents?.value).toContain('validate_user')
      expect(hover.source?.path).toBe('service.py')

      const definition = await manager.definition(workspace, { action: 'intelligence-definition', ...common })
      expect(definition).toMatchObject({
        revision: 1,
        sourcePath: 'main.py',
        locations: [{ path: 'service.py', range: { start: { line: 1 } } }],
      })

      const references = await manager.references(workspace, {
        action: 'intelligence-references',
        sessionId: 'session',
        path: 'service.py',
        tabId: 'service-tab',
        revision: 1,
        content: service,
        position: { line: 1, character: 8 },
      })
      expect(references.locations).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: 'main.py', excerpt: expect.stringContaining('validate_user') }),
      ]))
      const declarationDefinition = await manager.definition(workspace, {
        action: 'intelligence-definition',
        sessionId: 'session',
        path: 'service.py',
        tabId: 'service-tab',
        revision: 1,
        content: service,
        position: { line: 1, character: 8 },
      })
      expect(declarationDefinition.locations).toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: 'service.py',
          range: expect.objectContaining({
            start: { line: 1, character: 8 },
          }),
        }),
      ]))
    } finally {
      await manager.dispose()
    }
  }, 20_000)

  it.runIf(process.platform === 'darwin' || process.platform === 'win32')(
    'initializes the provider manager and reports Ready on the native platform',
    async () => {
      const workspace = await mkdtemp(join(tmpdir(), 'codecraft manager-测试-'))
      cleanups.push(workspace)
      const main = join(workspace, 'main.py')
      await writeFile(main, 'value = "ready"\n')
      const manager = new IntelligenceManager(
        localTestSubprocess(),
        DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
        process.platform,
      )
      try {
        await expect(manager.status(workspace, main)).resolves.toMatchObject({ status: 'ready' })
      } finally {
        await manager.dispose()
      }
    },
    20_000,
  )

  it('reuses one workspace session and retires it after the last document closes', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft lifecycle-测试-'))
    cleanups.push(workspace)
    await writeFile(join(workspace, 'first.py'), 'first = 1\n')
    await writeFile(join(workspace, 'second.py'), 'second = 2\n')
    const tracked = trackedTestSubprocess()
    const manager = new IntelligenceManager(tracked.service, DEFAULT_PYTHON_INTELLIGENCE_SETTINGS, process.platform)
    try {
      await manager.sync(workspace, {
        action: 'intelligence-sync',
        sessionId: 'session',
        path: 'first.py',
        tabId: 'first-tab',
        revision: 1,
        content: 'first = 1\n',
      })
      await manager.sync(workspace, {
        action: 'intelligence-sync',
        sessionId: 'session',
        path: 'second.py',
        tabId: 'second-tab',
        revision: 1,
        content: 'second = 2\n',
      })
      expect(tracked.spawnCount).toBe(1)
      expect(tracked.activeCount).toBe(1)
      await manager.close(workspace, 'first.py', 'first-tab')
      expect(tracked.activeCount).toBe(1)
      await manager.close(workspace, 'second.py', 'second-tab')
      expect(tracked.activeCount).toBe(0)
    } finally {
      await manager.dispose()
    }
  }, 20_000)

  it('keeps semantic completion isolated between workspaces', async () => {
    const firstWorkspace = await mkdtemp(join(tmpdir(), 'codecraft first-workspace-测试-'))
    const secondWorkspace = await mkdtemp(join(tmpdir(), 'codecraft second-workspace-测试-'))
    cleanups.push(firstWorkspace, secondWorkspace)
    await writeFile(join(firstWorkspace, 'service.py'), [
      'class Service:',
      '    def first_only(self) -> None:',
      '        pass',
      '',
    ].join('\n'))
    await writeFile(join(secondWorkspace, 'service.py'), [
      'class Service:',
      '    def second_only(self) -> None:',
      '        pass',
      '',
    ].join('\n'))
    await writeFile(join(firstWorkspace, 'main.py'), '')
    await writeFile(join(secondWorkspace, 'main.py'), '')
    const manager = new IntelligenceManager(localTestSubprocess(), DEFAULT_PYTHON_INTELLIGENCE_SETTINGS, process.platform)
    const input = (member: string) => ({
      action: 'intelligence-complete' as const,
      sessionId: 'session',
      path: 'main.py',
      tabId: member,
      revision: 1,
      content: 'from service import Service\nservice = Service()\nservice.',
      position: { line: 2, character: 8 },
    })
    try {
      const first = await manager.complete(firstWorkspace, input('first'))
      const second = await manager.complete(secondWorkspace, input('second'))
      expect(first.items.map(item => item.label)).toContain('first_only')
      expect(first.items.map(item => item.label)).not.toContain('second_only')
      expect(second.items.map(item => item.label)).toContain('second_only')
      expect(second.items.map(item => item.label)).not.toContain('first_only')
    } finally {
      await manager.dispose()
    }
  }, 20_000)

  it('retires a status-only probe instead of leaving an idle process', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft status-测试-'))
    cleanups.push(workspace)
    await writeFile(join(workspace, 'main.py'), '')
    const tracked = trackedTestSubprocess()
    const manager = new IntelligenceManager(tracked.service, DEFAULT_PYTHON_INTELLIGENCE_SETTINGS, process.platform)
    try {
      await expect(manager.status(workspace, 'main.py')).resolves.toMatchObject({ status: 'ready' })
      expect(tracked.spawnCount).toBe(1)
      expect(tracked.activeCount).toBe(0)
    } finally {
      await manager.dispose()
    }
  }, 20_000)

  it('rejects changed content at an equal or older document revision', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft revision-测试-'))
    cleanups.push(workspace)
    const target = join(workspace, 'main.py')
    await writeFile(target, '')
    const pyright = require.resolve('pyright/langserver.index.js')
    const session = new LspSession(localTestSubprocess(), workspace, [process.execPath, pyright, '--stdio'], undefined)
    try {
      await session.sync(target, 'tab', 2, 'value = 2\n')
      await expect(session.sync(target, 'tab', 2, 'value = 3\n')).rejects.toThrow('stale document revision')
      await expect(session.sync(target, 'tab', 1, 'value = 1\n')).rejects.toThrow('stale document revision')
      await expect(session.sync(target, 'tab', 2, 'value = 2\n')).resolves.toBeUndefined()
    } finally {
      await session.dispose()
    }
  }, 20_000)

  it('keeps a replacement tab generation open when the older generation closes', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft generation-测试-'))
    cleanups.push(workspace)
    const target = join(workspace, 'main.py')
    await writeFile(target, '')
    const pyright = require.resolve('pyright/langserver.index.js')
    const session = new LspSession(localTestSubprocess(), workspace, [process.execPath, pyright, '--stdio'], undefined)
    try {
      await session.sync(target, 'old-tab', 1, 'old = True\n')
      await session.sync(target, 'new-tab', 1, 'new = True\n')
      await session.close(target, 'old-tab')
      expect(session.hasDocuments()).toBe(true)
      await session.close(target, 'new-tab')
      expect(session.hasDocuments()).toBe(false)
    } finally {
      await session.dispose()
    }
  }, 20_000)

  it('rejects a late completion from a replaced tab generation', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft late-generation-测试-'))
    cleanups.push(workspace)
    const target = join(workspace, 'main.py')
    await writeFile(target, '')
    const delayed = delayedCompletionSubprocess()
    const session = new LspSession(delayed.service, workspace, ['server'], undefined)
    try {
      const oldCompletion = session.complete(
        target,
        'old-tab',
        1,
        'old.',
        { line: 0, character: 4 },
      )
      await new Promise(resolve => setTimeout(resolve, 0))
      await session.sync(target, 'new-tab', 1, 'new.')
      delayed.respond([{ label: 'stale_member' }])
      await expect(oldCompletion).rejects.toThrow('stale document revision')
    } finally {
      await session.dispose()
    }
  })

  it('bounds repeated transport recovery within the cooldown window', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft recovery-测试-'))
    cleanups.push(workspace)
    await writeFile(join(workspace, 'main.py'), '')
    const fake = fakeLspSubprocess('crash-completion')
    const manager = new IntelligenceManager(fake.service, DEFAULT_PYTHON_INTELLIGENCE_SETTINGS, 'darwin')
    const request = {
      action: 'intelligence-complete' as const,
      sessionId: 'session',
      path: 'main.py',
      tabId: 'tab',
      revision: 1,
      content: 'value.',
      position: { line: 0, character: 6 },
    }
    try {
      await expect(manager.complete(workspace, request)).rejects.toThrow('language server exited')
      expect(fake.spawnCount).toBe(2)
      await expect(manager.complete(workspace, request)).rejects.toThrow('language server exited')
      expect(fake.spawnCount).toBe(2)
    } finally {
      await manager.dispose()
    }
  })

  it('does not restart Pyright when an in-flight completion is cancelled', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft cancellation-测试-'))
    cleanups.push(workspace)
    await writeFile(join(workspace, 'main.py'), '')
    const fake = fakeLspSubprocess('hang-completion')
    const manager = new IntelligenceManager(fake.service, DEFAULT_PYTHON_INTELLIGENCE_SETTINGS, 'darwin')
    const controller = new AbortController()
    const completion = manager.complete(workspace, {
      action: 'intelligence-complete',
      sessionId: 'session',
      path: 'main.py',
      tabId: 'tab',
      revision: 1,
      content: 'value.',
      position: { line: 0, character: 6 },
    }, controller.signal)
    await new Promise(resolve => setTimeout(resolve, 0))
    controller.abort(new DOMException('Superseded', 'AbortError'))
    try {
      await expect(completion).rejects.toMatchObject({ name: 'AbortError' })
      expect(fake.spawnCount).toBe(1)
    } finally {
      await manager.dispose()
    }
  })

  it('reports a missing navigation capability without sending an unsupported request', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft capability-测试-'))
    cleanups.push(workspace)
    await writeFile(join(workspace, 'main.py'), 'value = 1\n')
    const fake = fakeLspSubprocess('hang-completion')
    const manager = new IntelligenceManager(fake.service, DEFAULT_PYTHON_INTELLIGENCE_SETTINGS, 'darwin')
    try {
      await expect(manager.definition(workspace, {
        action: 'intelligence-definition',
        sessionId: 'session',
        path: 'main.py',
        tabId: 'tab',
        revision: 1,
        content: 'value = 1\n',
        position: { line: 0, character: 0 },
      })).rejects.toMatchObject({ code: 'intelligence-unsupported', status: 409 })
      expect(fake.spawnCount).toBe(1)
    } finally {
      await manager.dispose()
    }
  })

  it('throttles repeated startup failures without exposing the private server path', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft startup-测试-'))
    cleanups.push(workspace)
    await writeFile(join(workspace, 'main.py'), '')
    let spawnCount = 0
    const subprocess: ManagedSubprocessService = {
      resolveExecutable: async command => command === 'node' ? process.execPath : `/private/runtime/${command}`,
      spawn: () => {
        spawnCount += 1
        throw new Error('spawn failed at /private/project/server')
      },
    }
    const manager = new IntelligenceManager(subprocess, DEFAULT_PYTHON_INTELLIGENCE_SETTINGS, 'darwin')
    try {
      const first = await manager.status(workspace, 'main.py')
      const second = await manager.status(workspace, 'main.py')
      expect(first).toEqual(second)
      expect(first).toMatchObject({ status: 'unavailable', reason: 'spawn-failed' })
      expect(first.message).not.toContain('/private')
      expect(spawnCount).toBe(1)
    } finally {
      await manager.dispose()
    }
  })
})
