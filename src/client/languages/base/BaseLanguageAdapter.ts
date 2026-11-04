import type { LanguageAdapter } from './LanguageAdapter.js'

/** Conservative defaults shared by language adapters. */
export abstract class BaseLanguageAdapter implements LanguageAdapter {
  abstract readonly id: string
  abstract readonly extensions: readonly string[]

  async detectProjectRoot(_fileUri: string, workspaceUri: string): Promise<string> {
    return workspaceUri
  }
}
