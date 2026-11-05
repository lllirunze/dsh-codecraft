import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { ManagedSubprocessService } from '../src/host/context.js'
import { IntelligenceManager } from '../src/host/intelligence/manager.js'
import {
  supportsPythonIntelligence,
  unsupportedPythonPlatformMessage,
} from '../src/host/languages/python/platform.js'
import { DEFAULT_PYTHON_INTELLIGENCE_SETTINGS } from '../src/settings/schema.js'

function unusedSubprocess(): ManagedSubprocessService {
  return {
    resolveExecutable: vi.fn(async () => { throw new Error('must not resolve') }),
    spawn: vi.fn(() => { throw new Error('must not spawn') }),
  }
}

describe('Python Intelligence platform policy', () => {
  it('supports macOS and Windows without widening support to Linux', () => {
    expect(supportsPythonIntelligence('darwin')).toBe(true)
    expect(supportsPythonIntelligence('win32')).toBe(true)
    expect(supportsPythonIntelligence('linux')).toBe(false)
  })

  it('uses the same unsupported-platform policy for status and requests', async () => {
    const subprocess = unusedSubprocess()
    const manager = new IntelligenceManager(subprocess, DEFAULT_PYTHON_INTELLIGENCE_SETTINGS, 'linux')
    await expect(manager.status('/workspace', 'main.py')).resolves.toEqual({
      status: 'unavailable',
      reason: 'unsupported-platform',
      message: unsupportedPythonPlatformMessage('linux'),
    })
    await expect(manager.sync('/workspace', {
      action: 'intelligence-sync',
      sessionId: 'session',
      path: 'main.py',
      tabId: 'tab',
      revision: 1,
      content: '',
    })).rejects.toMatchObject({
      code: 'intelligence-unavailable',
      status: 503,
    })
    expect(subprocess.resolveExecutable).not.toHaveBeenCalled()
    expect(subprocess.spawn).not.toHaveBeenCalled()
  })

  it('reports an interpreter failure without exposing the configured path', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft-platform-'))
    const path = join(workspace, 'main.py')
    await writeFile(path, '')
    const subprocess: ManagedSubprocessService = {
      resolveExecutable: vi.fn(async command => command === 'node'
        ? process.execPath
        : Promise.reject(new Error('unavailable'))),
      spawn: vi.fn(() => { throw new Error('must not spawn') }),
    }
    const manager = new IntelligenceManager(subprocess, {
      ...DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
      interpreterPath: 'private/missing/python',
    }, 'darwin')
    try {
      const status = await manager.status(workspace, path)
      expect(status).toEqual({
        status: 'unavailable',
        reason: 'environment-limited',
        message: 'The configured Python interpreter is unavailable. Check the CodeCraft settings.',
      })
      expect(status.message).not.toContain('private/missing/python')
      expect(subprocess.spawn).not.toHaveBeenCalled()
    } finally {
      await manager.dispose()
      await rm(workspace, { recursive: true, force: true })
    }
  })
})
