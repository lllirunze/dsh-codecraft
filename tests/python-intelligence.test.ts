import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type {
  ManagedSubprocessHandle,
  ManagedSubprocessService,
  ManagedSubprocessSpawnSpec,
} from '../src/host/context.js'
import { LspSession } from '../src/host/lsp/session.js'
import { followsMemberAccess } from '../src/host/intelligence/manager.js'

const require = createRequire(import.meta.url)
const cleanups: string[] = []

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function localTestSubprocess(): ManagedSubprocessService {
  return {
    resolveExecutable: async command => command,
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

describe('Python Intelligence with Pyright', () => {
  it('recognizes member completion positions without crossing lines', () => {
    expect(followsMemberAccess('service.\nnext', 0, 8)).toBe(true)
    expect(followsMemberAccess('service\n.next', 1, 0)).toBe(false)
    expect(followsMemberAccess('service', 0, 7)).toBe(false)
  })

  it('completes a cross-file member from unsaved editor content', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft-pyright-'))
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
    } finally {
      await session.dispose()
    }
  }, 20_000)
})
