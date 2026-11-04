/** Minimal contract for selecting language-specific editor support. */

export interface LanguageAdapter {
  readonly id: string
  readonly extensions: readonly string[]
  detectProjectRoot?(fileUri: string, workspaceUri: string): Promise<string>
}
