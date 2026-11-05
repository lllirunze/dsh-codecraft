import { constants } from 'node:fs'
import { access } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { isAbsolute, join } from 'node:path'
import type { PythonIntelligenceSettings } from '../../../settings/schema.js'
import type { ManagedSubprocessService } from '../../context.js'

const require = createRequire(import.meta.url)

async function executableFile(path: string, platform: NodeJS.Platform): Promise<boolean> {
  try {
    await access(path, platform === 'win32' ? constants.F_OK : constants.X_OK)
    return true
  } catch {
    return false
  }
}

export async function resolvePythonInterpreter(
  subprocess: ManagedSubprocessService,
  workspace: string,
  settings: PythonIntelligenceSettings,
  platform: NodeJS.Platform = process.platform,
): Promise<string | undefined> {
  if (settings.interpreterPath !== '') {
    if (!isAbsolute(settings.interpreterPath) || !await executableFile(settings.interpreterPath, platform)) {
      throw new Error('The configured Python interpreter is not an executable absolute path.')
    }
    return settings.interpreterPath
  }
  for (const environment of ['.venv', 'venv']) {
    const candidate = platform === 'win32'
      ? join(workspace, environment, 'Scripts', 'python.exe')
      : join(workspace, environment, 'bin', 'python')
    if (await executableFile(candidate, platform)) return candidate
  }
  const commands = platform === 'win32' ? ['python', 'python3'] : ['python3', 'python']
  for (const command of commands) {
    try {
      return await subprocess.resolveExecutable(command)
    } catch {
      // Try the next supported command.
    }
  }
  return undefined
}

export async function resolvePyrightLaunch(
  subprocess: ManagedSubprocessService,
  settings: PythonIntelligenceSettings,
): Promise<readonly string[]> {
  if (settings.serverPath !== '') {
    if (!isAbsolute(settings.serverPath)) {
      throw new Error('The configured Pyright server path must be absolute.')
    }
    if (settings.serverPath.endsWith('.js') || settings.serverPath.endsWith('.cjs')) {
      const node = await subprocess.resolveExecutable('node')
      return [node, settings.serverPath, '--stdio']
    }
    const executable = await subprocess.resolveExecutable(settings.serverPath)
    return [executable, '--stdio']
  }
  const entry = require.resolve('pyright/langserver.index.js')
  const node = await subprocess.resolveExecutable('node')
  return [node, entry, '--stdio']
}
