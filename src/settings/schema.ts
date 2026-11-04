/** Shared CodeCraft settings model and defensive wire-value parsing. */

export const AUTO_SAVE_INTERVAL_OPTIONS = [10, 30, 60, 120] as const

export type AutoSaveInterval = (typeof AUTO_SAVE_INTERVAL_OPTIONS)[number]

export interface AutoSaveSettings {
  enabled: boolean
  intervalSeconds: AutoSaveInterval
}

export interface CodeCraftSettings {
  editor: {
    autoSave: AutoSaveSettings
  }
}

export const DEFAULT_AUTO_SAVE_SETTINGS: AutoSaveSettings = {
  enabled: false,
  intervalSeconds: 30,
}

export const DEFAULT_CODECRAFT_SETTINGS: CodeCraftSettings = {
  editor: {
    autoSave: DEFAULT_AUTO_SAVE_SETTINGS,
  },
}

export function isAutoSaveInterval(value: unknown): value is AutoSaveInterval {
  return typeof value === 'number'
    && (AUTO_SAVE_INTERVAL_OPTIONS as readonly number[]).includes(value)
}

/** Resolve missing or malformed Host settings to the safe defaults. */
export function resolveAutoSaveSettings(value: unknown): AutoSaveSettings {
  const root = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  const editor = typeof root.editor === 'object' && root.editor !== null
    ? root.editor as Record<string, unknown>
    : {}
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
