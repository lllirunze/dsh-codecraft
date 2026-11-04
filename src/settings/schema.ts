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

export interface CodeCraftSettings {
  editor: EditorSettings
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

export const DEFAULT_CODECRAFT_SETTINGS: CodeCraftSettings = {
  editor: DEFAULT_EDITOR_SETTINGS,
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
