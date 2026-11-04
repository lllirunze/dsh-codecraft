/** DSH Host configuration schema for persistent, live CodeCraft preferences. */

import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_AUTO_SAVE_SETTINGS,
  type CodeCraftSettings,
} from './settings/schema.js'

const AutoSaveSchema = z.object({
  enabled: z.boolean().default(DEFAULT_AUTO_SAVE_SETTINGS.enabled),
  intervalSeconds: z.union([
    z.const(10),
    z.const(30),
    z.const(60),
    z.const(120),
  ]).default(DEFAULT_AUTO_SAVE_SETTINGS.intervalSeconds),
})

/**
 * The editor group is volatile so accepted settings writes take effect without
 * remounting the Host plugin. The profile still persists the chosen values.
 */
export const Config = z.object({
  editor: z.object({
    autoSave: AutoSaveSchema.default(DEFAULT_AUTO_SAVE_SETTINGS),
  }).default({ autoSave: DEFAULT_AUTO_SAVE_SETTINGS }).volatile(),
}) as unknown as z<CodeCraftSettings>
