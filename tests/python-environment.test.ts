import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ManagedSubprocessService } from '../src/host/context.js'
import {
  resolvePyrightLaunch,
  resolvePythonInterpreter,
} from '../src/host/languages/python/environment.js'
import { DEFAULT_PYTHON_INTELLIGENCE_SETTINGS } from '../src/settings/schema.js'

const cleanups: string[] = []

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function resolver(resolveExecutable = vi.fn(async (command: string) => `/bin/${command}`)): ManagedSubprocessService {
  return {
    resolveExecutable,
    spawn: () => { throw new Error('not used') },
  }
}

describe('Python environment discovery', () => {
  it('prefers a workspace .venv before PATH interpreters', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft-python-env-'))
    cleanups.push(workspace)
    const python = join(workspace, '.venv', 'bin', 'python')
    await mkdir(join(workspace, '.venv', 'bin'), { recursive: true })
    await writeFile(python, '#!/bin/sh\n')
    await chmod(python, 0o755)
    const service = resolver()
    await expect(resolvePythonInterpreter(service, workspace, DEFAULT_PYTHON_INTELLIGENCE_SETTINGS, 'darwin'))
      .resolves.toBe(python)
  })

  it('recognizes a Windows workspace .venv without POSIX executable bits', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft-python-env-'))
    cleanups.push(workspace)
    const python = join(workspace, '.venv', 'Scripts', 'python.exe')
    await mkdir(join(workspace, '.venv', 'Scripts'), { recursive: true })
    await writeFile(python, '')
    await expect(resolvePythonInterpreter(
      resolver(),
      workspace,
      DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
      'win32',
    )).resolves.toBe(python)
  })

  it('falls back to the Windows venv directory and accepts an explicit python.exe', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft-python-env-'))
    cleanups.push(workspace)
    const python = join(workspace, 'venv', 'Scripts', 'python.exe')
    await mkdir(join(workspace, 'venv', 'Scripts'), { recursive: true })
    await writeFile(python, '')
    await expect(resolvePythonInterpreter(
      resolver(),
      workspace,
      DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
      'win32',
    )).resolves.toBe(python)
    await expect(resolvePythonInterpreter(resolver(), workspace, {
      ...DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
      interpreterPath: python,
    }, 'win32')).resolves.toBe(python)
  })

  it('uses platform-specific PATH fallback order', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft-python-env-'))
    cleanups.push(workspace)
    const resolveExecutable = vi.fn(async (command: string) => `/runtime/${command}`)
    await expect(resolvePythonInterpreter(
      resolver(resolveExecutable),
      workspace,
      DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
      'win32',
    )).resolves.toBe('/runtime/python')
    expect(resolveExecutable).toHaveBeenCalledWith('python')
  })

  it('rejects a relative configured interpreter path', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'codecraft-python-env-'))
    cleanups.push(workspace)
    await expect(resolvePythonInterpreter(resolver(), workspace, {
      ...DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
      interpreterPath: '.venv/bin/python',
    })).rejects.toThrow('absolute path')
  })

  it('uses the bundled Pyright entry through a resolved Node executable', async () => {
    const resolveExecutable = vi.fn(async (command: string) => `/runtime/${command}`)
    const argv = await resolvePyrightLaunch(resolver(resolveExecutable), DEFAULT_PYTHON_INTELLIGENCE_SETTINGS)
    expect(argv[0]).toBe('/runtime/node')
    expect(argv[1]?.replaceAll('\\', '/')).toMatch(/pyright\/langserver\.index\.js$/)
    expect(argv[2]).toBe('--stdio')
  })
})
