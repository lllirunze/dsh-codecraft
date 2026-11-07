import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { ManagedSubprocessHandle, ManagedSubprocessService } from '../src/host/context.js'
import {
  jdtLsArgv,
  parseJavaMajorVersion,
  resolveJavaRuntime,
  resolveJdtLsDistribution,
} from '../src/host/languages/java/environment.js'
import { DEFAULT_JAVA_INTELLIGENCE_SETTINGS } from '../src/settings/schema.js'

const cleanups: string[] = []

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function completedJava(output: string): ManagedSubprocessService {
  return {
    resolveExecutable: async command => `/resolved/${command}`,
    spawn: spec => ({
      pid: 1,
      stdin: undefined,
      stdout: undefined,
      stderr: undefined,
      collected: { stderr: { readFrom: () => ({ text: output }) } },
      done: Promise.resolve({ exitCode: 0, signal: null }),
      terminate: () => {},
      waitForExit: async () => true,
    } satisfies ManagedSubprocessHandle),
  }
}

describe('Java Intelligence environment', () => {
  it('parses current and legacy Java version output', () => {
    expect(parseJavaMajorVersion('openjdk version "21.0.8" 2025-07-15')).toBe(21)
    expect(parseJavaMajorVersion('java version "1.8.0_401"')).toBe(8)
    expect(parseJavaMajorVersion('unrelated output')).toBeUndefined()
  })

  it('accepts an explicit JDK 21 home and rejects an old tooling JDK', async () => {
    const home = await mkdtemp(join(tmpdir(), 'codecraft-java-home-'))
    cleanups.push(home)
    const executable = join(home, 'bin', 'java')
    await mkdir(join(home, 'bin'))
    await writeFile(executable, '')
    await chmod(executable, 0o755)
    await expect(resolveJavaRuntime(completedJava('openjdk version "21.0.8"'), {
      ...DEFAULT_JAVA_INTELLIGENCE_SETTINGS,
      serverRuntimePath: home,
    }, 'darwin', {})).resolves.toBe(executable)
    await expect(resolveJavaRuntime(completedJava('openjdk version "17.0.12"'), {
      ...DEFAULT_JAVA_INTELLIGENCE_SETTINGS,
      serverRuntimePath: home,
    }, 'darwin', {})).rejects.toMatchObject({ reason: 'jdk-too-old' })
  })

  it('discovers one launcher and selects the platform configuration', async () => {
    const root = await mkdtemp(join(tmpdir(), 'codecraft-jdtls-测试-'))
    cleanups.push(root)
    await mkdir(join(root, 'plugins'))
    await mkdir(join(root, 'config_mac'))
    await mkdir(join(root, 'config_win'))
    await writeFile(join(root, 'plugins', 'org.eclipse.equinox.launcher_1.7.0.jar'), '')
    const mac = await resolveJdtLsDistribution({
      ...DEFAULT_JAVA_INTELLIGENCE_SETTINGS,
      serverPath: root,
    }, 'darwin', {})
    const windows = await resolveJdtLsDistribution({
      ...DEFAULT_JAVA_INTELLIGENCE_SETTINGS,
      serverPath: root,
    }, 'win32', {})
    expect(mac.configuration).toBe(join(root, 'config_mac'))
    expect(windows.configuration).toBe(join(root, 'config_win'))
    expect(mac.launcher).toContain('org.eclipse.equinox.launcher_1.7.0.jar')
  })

  it('keeps paths with spaces as individual launch arguments', () => {
    const argv = jdtLsArgv('/Java Home/bin/java', {
      root: '/JDT LS',
      launcher: '/JDT LS/plugins/launcher.jar',
      configuration: '/JDT LS/config_mac',
    }, '/Cache Root/workspace')
    expect(argv[0]).toBe('/Java Home/bin/java')
    expect(argv).toContain('/JDT LS/plugins/launcher.jar')
    expect(argv).toContain('/Cache Root/workspace')
  })

  it('rejects missing, ambiguous, and unsupported distributions', async () => {
    await expect(resolveJdtLsDistribution(DEFAULT_JAVA_INTELLIGENCE_SETTINGS, 'darwin', {}))
      .rejects.toMatchObject({ reason: 'jdtls-not-found' })
    const root = await mkdtemp(join(tmpdir(), 'codecraft-jdtls-invalid-'))
    cleanups.push(root)
    await mkdir(join(root, 'plugins'))
    await mkdir(join(root, 'config_mac'))
    await writeFile(join(root, 'plugins', 'org.eclipse.equinox.launcher_a.jar'), '')
    await writeFile(join(root, 'plugins', 'org.eclipse.equinox.launcher_b.jar'), '')
    await expect(resolveJdtLsDistribution({
      ...DEFAULT_JAVA_INTELLIGENCE_SETTINGS,
      serverPath: root,
    }, 'darwin', {})).rejects.toMatchObject({ reason: 'distribution-invalid' })
  })
})
