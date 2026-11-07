import type { PythonIntelligenceSettings } from '../../../settings/schema.js'
import type { IntelligenceProvider } from '../../intelligence/provider.js'
import { LspSession } from '../../lsp/session.js'
import { resolvePyrightLaunch, resolvePythonInterpreter } from './environment.js'
import { supportsPythonIntelligence, unsupportedPythonPlatformMessage } from './platform.js'

export function pythonIntelligenceProvider(settings: PythonIntelligenceSettings): IntelligenceProvider {
  return {
    id: 'python',
    displayName: 'Python',
    enabled: settings.enabled,
    completion: settings.completion,
    matches: path => /\.(?:py|pyi|pyw)$/i.test(path),
    supports: supportsPythonIntelligence,
    unsupportedMessage: unsupportedPythonPlatformMessage,
    emptyMemberRecovery: true,
    async createSession(subprocess, root, platform) {
      const [argv, interpreterPath] = await Promise.all([
        resolvePyrightLaunch(subprocess, settings),
        resolvePythonInterpreter(subprocess, root, settings, platform),
      ])
      const session = new LspSession(subprocess, root, argv, interpreterPath, { languageId: 'python' })
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
