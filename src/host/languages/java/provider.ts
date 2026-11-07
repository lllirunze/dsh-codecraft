import { isAbsolute } from 'node:path'
import type { JavaIntelligenceSettings } from '../../../settings/schema.js'
import type { IntelligenceProvider } from '../../intelligence/provider.js'
import { LspSession } from '../../lsp/session.js'
import {
  JavaEnvironmentError,
  javaWorkspaceDataDirectory,
  jdtLsArgv,
  resolveJavaRuntime,
  resolveJdtLsDistribution,
} from './environment.js'

export function javaIntelligenceProvider(settings: JavaIntelligenceSettings): IntelligenceProvider {
  return {
    id: 'java',
    displayName: 'Java',
    enabled: settings.enabled,
    completion: settings.completion,
    matches: path => /\.java$/i.test(path),
    supports: platform => platform === 'darwin' || platform === 'win32',
    unsupportedMessage: () => 'Java Intelligence is supported on macOS and Windows.',
    async createSession(subprocess, root, platform) {
      const distribution = await resolveJdtLsDistribution(settings, platform)
      const [java, data] = await Promise.all([
        resolveJavaRuntime(subprocess, settings, platform),
        javaWorkspaceDataDirectory(root, platform),
      ])
      if (settings.projectRuntimePath !== '' && !isAbsolute(settings.projectRuntimePath)) {
        throw new JavaEnvironmentError('environment-limited', 'The project JDK path must be absolute.')
      }
      const projectRuntime = settings.projectRuntimePath || undefined
      const javaSettings = {
        java: {
          ...(projectRuntime === undefined ? {} : { home: projectRuntime }),
          import: { maven: { enabled: true }, gradle: { enabled: false } },
        },
      }
      const session = new LspSession(subprocess, root, jdtLsArgv(java, distribution, data), java, {
        languageId: 'java',
        initializationOptions: { settings: javaSettings },
        workspaceSettings: javaSettings,
        initializeTimeoutMs: 60_000,
      })
      try {
        await session.ready()
        return session
      } catch (error) {
        await session.dispose().catch(() => undefined)
        throw error
      }
    },
  }
}
