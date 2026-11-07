import {
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_JAVA_INTELLIGENCE_SETTINGS,
  DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
  resolveEditorSettings,
  resolveJavaIntelligenceSettings,
  resolvePythonIntelligenceSettings,
  type AutoSaveInterval,
  type EditorSettings,
  type IndentSize,
  type JavaIntelligenceSettings,
  type PythonIntelligenceSettings,
} from '../../settings/schema.js'

export interface ConfigFormSnapshot {
  status: 'loading' | 'ready' | 'unavailable'
  value?: unknown
  writable: boolean
}

export interface ConfigMutation {
  op: 'set' | 'unset'
  path: string[]
  value?: unknown
}

export interface ConfigForm {
  getSnapshot(): ConfigFormSnapshot
  subscribe(listener: () => void): () => void
  mutate(operations: ConfigMutation[]): Promise<boolean>
}

export interface EditorSettingsSnapshot {
  settings: EditorSettings
  pythonIntelligence: PythonIntelligenceSettings
  javaIntelligence: JavaIntelligenceSettings
  status: ConfigFormSnapshot['status']
  writable: boolean
  saving: boolean
  error: boolean
}

const DEFAULT_SNAPSHOT: EditorSettingsSnapshot = {
  settings: DEFAULT_EDITOR_SETTINGS,
  pythonIntelligence: DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
  javaIntelligence: DEFAULT_JAVA_INTELLIGENCE_SETTINGS,
  status: 'loading',
  writable: false,
  saving: false,
  error: false,
}

/** Shared accepted settings and ordered writes for every open editor tab. */
export class EditorSettingsStore {
  #form: ConfigForm | undefined
  #unsubscribe: (() => void) | undefined
  #snapshot = DEFAULT_SNAPSHOT
  #listeners = new Set<() => void>()

  getSnapshot = (): EditorSettingsSnapshot => this.#snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  bind(form: ConfigForm): () => void {
    this.#unsubscribe?.()
    this.#form = form
    this.#unsubscribe = form.subscribe(() => this.#sync())
    this.#sync()
    return () => {
      this.#unsubscribe?.()
      this.#unsubscribe = undefined
      this.#form = undefined
      this.#replace(DEFAULT_SNAPSHOT)
    }
  }

  async setEnabled(enabled: boolean): Promise<boolean> {
    return this.#write(['editor', 'autoSave', 'enabled'], enabled)
  }

  async setInterval(intervalSeconds: AutoSaveInterval): Promise<boolean> {
    return this.#write(['editor', 'autoSave', 'intervalSeconds'], intervalSeconds)
  }

  async setIndentSize(indentSize: IndentSize): Promise<boolean> {
    return this.#write(['editor', 'indentation', 'indentSize'], indentSize)
  }

  async setPythonIntelligenceEnabled(enabled: boolean): Promise<boolean> {
    return this.#write(['pythonIntelligence', 'enabled'], enabled)
  }

  async setSemanticCompletionEnabled(completion: boolean): Promise<boolean> {
    return this.#write(['pythonIntelligence', 'completion'], completion)
  }

  async setPythonInterpreterPath(interpreterPath: string): Promise<boolean> {
    return this.#write(['pythonIntelligence', 'interpreterPath'], interpreterPath.trim())
  }

  async setPyrightServerPath(serverPath: string): Promise<boolean> {
    return this.#write(['pythonIntelligence', 'serverPath'], serverPath.trim())
  }

  async setJavaIntelligenceEnabled(enabled: boolean): Promise<boolean> {
    return this.#write(['javaIntelligence', 'enabled'], enabled)
  }

  async setJavaSemanticCompletionEnabled(completion: boolean): Promise<boolean> {
    return this.#write(['javaIntelligence', 'completion'], completion)
  }

  async setJavaServerRuntimePath(serverRuntimePath: string): Promise<boolean> {
    return this.#write(['javaIntelligence', 'serverRuntimePath'], serverRuntimePath.trim())
  }

  async setJavaProjectRuntimePath(projectRuntimePath: string): Promise<boolean> {
    return this.#write(['javaIntelligence', 'projectRuntimePath'], projectRuntimePath.trim())
  }

  async setJdtLsPath(serverPath: string): Promise<boolean> {
    return this.#write(['javaIntelligence', 'serverPath'], serverPath.trim())
  }

  async #write(path: string[], value: boolean | number | string): Promise<boolean> {
    const form = this.#form
    if (form === undefined || this.#snapshot.saving || !this.#snapshot.writable) return false
    this.#replace({ ...this.#snapshot, saving: true, error: false })
    let accepted = false
    try {
      accepted = await form.mutate([{
        op: 'set',
        path,
        value,
      }])
      return accepted
    } catch {
      return false
    } finally {
      this.#sync(!accepted)
    }
  }

  #sync(error = this.#snapshot.error): void {
    const formSnapshot = this.#form?.getSnapshot()
    this.#replace({
      settings: resolveEditorSettings(formSnapshot?.value),
      pythonIntelligence: resolvePythonIntelligenceSettings(formSnapshot?.value),
      javaIntelligence: resolveJavaIntelligenceSettings(formSnapshot?.value),
      status: formSnapshot?.status ?? 'loading',
      writable: formSnapshot?.writable ?? false,
      saving: false,
      error,
    })
  }

  #replace(snapshot: EditorSettingsSnapshot): void {
    this.#snapshot = snapshot
    for (const listener of this.#listeners) listener()
  }
}

export const editorSettings = new EditorSettingsStore()
