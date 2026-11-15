import type { PythonIntelligenceSettings } from '../../../settings/schema.js'
import type { IntelligenceProvider } from '../../intelligence/provider.js'
import { LspSession } from '../../lsp/session.js'
import { resolvePyrightLaunch, resolvePythonInterpreter } from './environment.js'
import { supportsPythonIntelligence, unsupportedPythonPlatformMessage } from './platform.js'

export function pythonIntelligenceProvider(
  settingsSource: PythonIntelligenceSettings | (() => PythonIntelligenceSettings),
): IntelligenceProvider {
  const settings = (): PythonIntelligenceSettings => typeof settingsSource === 'function'
    ? settingsSource()
    : settingsSource
  return {
    id: 'python',
    displayName: 'Python',
    get enabled() { return settings().enabled },
    get completion() { return settings().completion },
    matches: path => /\.(?:py|pyi|pyw)$/i.test(path),
    supports: supportsPythonIntelligence,
    unsupportedMessage: unsupportedPythonPlatformMessage,
    emptyMemberRecovery: true,
    async createSession(subprocess, root, platform) {
      const currentSettings = settings()
      const [argv, interpreterPath] = await Promise.all([
        resolvePyrightLaunch(subprocess, currentSettings),
        resolvePythonInterpreter(subprocess, root, currentSettings, platform),
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
