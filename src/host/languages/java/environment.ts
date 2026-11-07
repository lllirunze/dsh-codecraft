import { constants } from 'node:fs'
import { access, mkdir, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import type { JavaIntelligenceSettings } from '../../../settings/schema.js'
import type { IntelligenceUnavailableReason } from '../../../protocol.js'
import type { ManagedSubprocessService } from '../../context.js'

export const JDTLS_MINIMUM_JAVA = 21

export class JavaEnvironmentError extends Error {
  constructor(
    readonly reason: IntelligenceUnavailableReason,
    message: string,
  ) {
    super(message)
    this.name = 'JavaEnvironmentError'
  }
}

export function parseJavaMajorVersion(output: string): number | undefined {
  const match = /(?:openjdk|java) version "([^"\s]+)"/i.exec(output)
  if (match === null) return undefined
  const components = match[1]?.split('.') ?? []
  const major = components[0] === '1' ? Number(components[1]) : Number(components[0])
  return Number.isInteger(major) && major > 0 ? major : undefined
}

function javaInHome(home: string, platform: NodeJS.Platform): string {
  return join(home, 'bin', platform === 'win32' ? 'java.exe' : 'java')
}

async function isFile(path: string, platform: NodeJS.Platform): Promise<boolean> {
  try {
    const value = await stat(path)
    if (!value.isFile()) return false
    await access(path, platform === 'win32' ? constants.F_OK : constants.X_OK)
    return true
  } catch {
    return false
  }
}

async function validateJava(
  subprocess: ManagedSubprocessService,
  candidate: string,
): Promise<string> {
  const handle = subprocess.spawn({
    argv: [candidate, '-version'],
    cwd: process.cwd(),
    stdio: { stdin: 'ignore', stdout: { maxBytes: 8192 }, stderr: { maxBytes: 8192 } },
    graceMs: 1_000,
    signal: AbortSignal.timeout(5_000),
  })
  const outcome = await handle.done
  const output = `${handle.collected.stdout?.readFrom(0).text ?? ''}\n${handle.collected.stderr?.readFrom(0).text ?? ''}`
  const major = parseJavaMajorVersion(output)
  if (outcome.exitCode !== 0 || major === undefined) {
    throw new JavaEnvironmentError('environment-limited', 'The Java runtime could not be validated.')
  }
  if (major < JDTLS_MINIMUM_JAVA) {
    throw new JavaEnvironmentError(
      'jdk-too-old',
      `JDT LS requires JDK ${JDTLS_MINIMUM_JAVA} or newer; the selected tooling runtime is JDK ${major}.`,
    )
  }
  return candidate
}

export async function resolveJavaRuntime(
  subprocess: ManagedSubprocessService,
  settings: JavaIntelligenceSettings,
  platform: NodeJS.Platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  let candidate: string
  if (settings.serverRuntimePath !== '') {
    if (!isAbsolute(settings.serverRuntimePath)) {
      throw new JavaEnvironmentError('environment-limited', 'The configured tooling JDK path must be absolute.')
    }
    candidate = await isFile(settings.serverRuntimePath, platform)
      ? settings.serverRuntimePath
      : javaInHome(settings.serverRuntimePath, platform)
    if (!await isFile(candidate, platform)) {
      throw new JavaEnvironmentError('environment-limited', 'The configured tooling JDK does not contain Java.')
    }
  } else if (environment.JAVA_HOME !== undefined && environment.JAVA_HOME !== '') {
    candidate = javaInHome(environment.JAVA_HOME, platform)
    if (!await isFile(candidate, platform)) candidate = await subprocess.resolveExecutable('java')
  } else {
    candidate = await subprocess.resolveExecutable('java')
  }
  return validateJava(subprocess, candidate)
}

export interface JdtLsDistribution {
  root: string
  launcher: string
  configuration: string
}

export async function resolveJdtLsDistribution(
  settings: JavaIntelligenceSettings,
  platform: NodeJS.Platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<JdtLsDistribution> {
  const root = settings.serverPath || environment.JDTLS_HOME || ''
  if (root === '') {
    throw new JavaEnvironmentError(
      'jdtls-not-found',
      'Set the extracted JDT LS directory in CodeCraft settings or JDTLS_HOME.',
    )
  }
  if (!isAbsolute(root)) {
    throw new JavaEnvironmentError('distribution-invalid', 'The JDT LS directory must be an absolute path.')
  }
  let plugins: string[]
  try {
    plugins = await readdir(join(root, 'plugins'))
  } catch {
    throw new JavaEnvironmentError('distribution-invalid', 'The selected JDT LS directory has no plugins directory.')
  }
  const launchers = plugins.filter(name => /^org\.eclipse\.equinox\.launcher_[^/]+\.jar$/.test(name))
  if (launchers.length !== 1) {
    throw new JavaEnvironmentError('distribution-invalid', 'The selected JDT LS directory must contain exactly one launcher JAR.')
  }
  const configurationName = platform === 'darwin' ? 'config_mac' : platform === 'win32' ? 'config_win' : ''
  if (configurationName === '') {
    throw new JavaEnvironmentError('unsupported-platform', 'Java Intelligence is supported on macOS and Windows.')
  }
  const configuration = join(root, configurationName)
  try {
    if (!(await stat(configuration)).isDirectory()) throw new Error('not a directory')
  } catch {
    throw new JavaEnvironmentError('platform-config-missing', `The JDT LS distribution has no ${configurationName} directory.`)
  }
  return { root, launcher: join(root, 'plugins', launchers[0] ?? ''), configuration }
}

export async function javaWorkspaceDataDirectory(
  workspace: string,
  platform: NodeJS.Platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const base = platform === 'win32'
    ? environment.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
    : join(homedir(), 'Library', 'Caches')
  const key = createHash('sha256').update(workspace).digest('hex').slice(0, 24)
  const target = join(base, 'dsh-codecraft', 'jdtls', 'workspaces', key)
  try {
    await mkdir(target, { recursive: true })
    await access(target, constants.W_OK)
    return target
  } catch {
    throw new JavaEnvironmentError('cache-unwritable', 'The Java language-server cache is not writable.')
  }
}

export function jdtLsArgv(java: string, distribution: JdtLsDistribution, data: string): readonly string[] {
  return [
    java,
    '-Declipse.application=org.eclipse.jdt.ls.core.id1',
    '-Dosgi.bundles.defaultStartLevel=4',
    '-Declipse.product=org.eclipse.jdt.ls.core.product',
    '-Dlog.level=WARNING',
    '-Xms256m',
    '-Xmx1G',
    '--add-modules=ALL-SYSTEM',
    '--add-opens',
    'java.base/java.util=ALL-UNNAMED',
    '--add-opens',
    'java.base/java.lang=ALL-UNNAMED',
    '-jar',
    distribution.launcher,
    '-configuration',
    distribution.configuration,
    '-data',
    data,
  ]
}
