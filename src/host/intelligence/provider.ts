import type { IntelligenceUnavailableReason } from '../../protocol.js'
import type { ManagedSubprocessService } from '../context.js'
import type { LspSession } from '../lsp/session.js'

export type IntelligenceLanguageId = 'python' | 'java'

export interface IntelligenceProvider {
  id: IntelligenceLanguageId
  displayName: string
  enabled: boolean
  completion: boolean
  matches(path: string): boolean
  supports(platform: NodeJS.Platform): boolean
  unsupportedMessage(platform: NodeJS.Platform): string
  createSession(subprocess: ManagedSubprocessService, root: string, platform: NodeJS.Platform): Promise<LspSession>
  emptyMemberRecovery?: boolean
}

export class IntelligenceProviderError extends Error {
  constructor(
    readonly reason: IntelligenceUnavailableReason,
    message: string,
  ) {
    super(message)
    this.name = 'IntelligenceProviderError'
  }
}
