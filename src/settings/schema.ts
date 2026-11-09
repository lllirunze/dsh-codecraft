/** Shared CodeCraft settings model and defensive wire-value parsing. */

export const AUTO_SAVE_INTERVAL_OPTIONS = [10, 30, 60, 120] as const
export const INDENT_SIZE_OPTIONS = [2, 4] as const

export type AutoSaveInterval = (typeof AUTO_SAVE_INTERVAL_OPTIONS)[number]
export type IndentSize = (typeof INDENT_SIZE_OPTIONS)[number]

export interface AutoSaveSettings {
  enabled: boolean
  intervalSeconds: AutoSaveInterval
}

export interface IndentationSettings {
  useSpaces: true
  indentSize: IndentSize
}

export interface EditorSettings {
  autoSave: AutoSaveSettings
  indentation: IndentationSettings
}

export interface PythonIntelligenceSettings {
  enabled: boolean
  completion: boolean
  interpreterPath: string
  serverPath: string
}

export interface JavaEditingAssistanceSettings {
  enabled: boolean
}

export interface HtmlEditingAssistanceSettings {
  enabled: boolean
}

export interface CodeCraftSettings {
  editor: EditorSettings
  pythonIntelligence: PythonIntelligenceSettings
  javaEditingAssistance: JavaEditingAssistanceSettings
  htmlEditingAssistance: HtmlEditingAssistanceSettings
}

export const DEFAULT_AUTO_SAVE_SETTINGS: AutoSaveSettings = {
  enabled: false,
  intervalSeconds: 30,
}

export const DEFAULT_INDENTATION_SETTINGS: IndentationSettings = {
  useSpaces: true,
  indentSize: 2,
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  autoSave: DEFAULT_AUTO_SAVE_SETTINGS,
  indentation: DEFAULT_INDENTATION_SETTINGS,
}

export const DEFAULT_PYTHON_INTELLIGENCE_SETTINGS: PythonIntelligenceSettings = {
  enabled: true,
  completion: true,
  interpreterPath: '',
  serverPath: '',
}

export const DEFAULT_JAVA_EDITING_ASSISTANCE_SETTINGS: JavaEditingAssistanceSettings = {
  enabled: true,
}

export const DEFAULT_HTML_EDITING_ASSISTANCE_SETTINGS: HtmlEditingAssistanceSettings = {
  enabled: true,
}

export const DEFAULT_CODECRAFT_SETTINGS: CodeCraftSettings = {
  editor: DEFAULT_EDITOR_SETTINGS,
  pythonIntelligence: DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
  javaEditingAssistance: DEFAULT_JAVA_EDITING_ASSISTANCE_SETTINGS,
  htmlEditingAssistance: DEFAULT_HTML_EDITING_ASSISTANCE_SETTINGS,
}

export function isAutoSaveInterval(value: unknown): value is AutoSaveInterval {
  return typeof value === 'number'
    && (AUTO_SAVE_INTERVAL_OPTIONS as readonly number[]).includes(value)
}

export function isIndentSize(value: unknown): value is IndentSize {
  return typeof value === 'number'
    && (INDENT_SIZE_OPTIONS as readonly number[]).includes(value)
}

function editorValue(value: unknown): Record<string, unknown> {
  const root = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  return typeof root.editor === 'object' && root.editor !== null
    ? root.editor as Record<string, unknown>
    : {}
}

/** Resolve missing or malformed Host settings to the safe defaults. */
export function resolveAutoSaveSettings(value: unknown): AutoSaveSettings {
  const editor = editorValue(value)
  const autoSave = typeof editor.autoSave === 'object' && editor.autoSave !== null
    ? editor.autoSave as Record<string, unknown>
    : {}
  return {
    enabled: typeof autoSave.enabled === 'boolean'
      ? autoSave.enabled
      : DEFAULT_AUTO_SAVE_SETTINGS.enabled,
    intervalSeconds: isAutoSaveInterval(autoSave.intervalSeconds)
      ? autoSave.intervalSeconds
      : DEFAULT_AUTO_SAVE_SETTINGS.intervalSeconds,
  }
}

export function resolveIndentationSettings(value: unknown): IndentationSettings {
  const editor = editorValue(value)
  const indentation = typeof editor.indentation === 'object' && editor.indentation !== null
    ? editor.indentation as Record<string, unknown>
    : {}
  return {
    useSpaces: true,
    indentSize: isIndentSize(indentation.indentSize)
      ? indentation.indentSize
      : DEFAULT_INDENTATION_SETTINGS.indentSize,
  }
}

export function resolveEditorSettings(value: unknown): EditorSettings {
  return {
    autoSave: resolveAutoSaveSettings(value),
    indentation: resolveIndentationSettings(value),
  }
}

/** Resolve Python intelligence settings without accepting non-string paths. */
export function resolvePythonIntelligenceSettings(value: unknown): PythonIntelligenceSettings {
  const root = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  const intelligence = typeof root.pythonIntelligence === 'object' && root.pythonIntelligence !== null
    ? root.pythonIntelligence as Record<string, unknown>
    : {}
  return {
    enabled: typeof intelligence.enabled === 'boolean'
      ? intelligence.enabled
      : DEFAULT_PYTHON_INTELLIGENCE_SETTINGS.enabled,
    completion: typeof intelligence.completion === 'boolean'
      ? intelligence.completion
      : DEFAULT_PYTHON_INTELLIGENCE_SETTINGS.completion,
    interpreterPath: typeof intelligence.interpreterPath === 'string'
      ? intelligence.interpreterPath.trim()
      : DEFAULT_PYTHON_INTELLIGENCE_SETTINGS.interpreterPath,
    serverPath: typeof intelligence.serverPath === 'string'
      ? intelligence.serverPath.trim()
      : DEFAULT_PYTHON_INTELLIGENCE_SETTINGS.serverPath,
  }
}

/** Resolve the browser-local Java feature gate without accepting truthy wire values. */
export function resolveJavaEditingAssistanceSettings(value: unknown): JavaEditingAssistanceSettings {
  const root = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  const assistance = typeof root.javaEditingAssistance === 'object' && root.javaEditingAssistance !== null
    ? root.javaEditingAssistance as Record<string, unknown>
    : {}
  return {
    enabled: typeof assistance.enabled === 'boolean'
      ? assistance.enabled
      : DEFAULT_JAVA_EDITING_ASSISTANCE_SETTINGS.enabled,
  }
}

/** Resolve the browser-local HTML feature gate without accepting truthy wire values. */
export function resolveHtmlEditingAssistanceSettings(value: unknown): HtmlEditingAssistanceSettings {
  const root = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  const assistance = typeof root.htmlEditingAssistance === 'object' && root.htmlEditingAssistance !== null
    ? root.htmlEditingAssistance as Record<string, unknown>
    : {}
  return {
    enabled: typeof assistance.enabled === 'boolean'
      ? assistance.enabled
      : DEFAULT_HTML_EDITING_ASSISTANCE_SETTINGS.enabled,
  }
}

export function resolveCodeCraftSettings(value: unknown): CodeCraftSettings {
  return {
    editor: resolveEditorSettings(value),
    pythonIntelligence: resolvePythonIntelligenceSettings(value),
    javaEditingAssistance: resolveJavaEditingAssistanceSettings(value),
    htmlEditingAssistance: resolveHtmlEditingAssistanceSettings(value),
  }
}
