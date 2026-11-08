/** DSH Host configuration schema for persistent, live CodeCraft preferences. */

import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_AUTO_SAVE_SETTINGS,
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_INDENTATION_SETTINGS,
  DEFAULT_JAVA_EDITING_ASSISTANCE_SETTINGS,
  DEFAULT_PYTHON_INTELLIGENCE_SETTINGS,
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

const IndentationSchema = z.object({
  useSpaces: z.const(true).default(true),
  indentSize: z.union([
    z.const(2),
    z.const(4),
  ]).default(DEFAULT_INDENTATION_SETTINGS.indentSize),
})

const PythonIntelligenceSchema = z.object({
  enabled: z.boolean().default(DEFAULT_PYTHON_INTELLIGENCE_SETTINGS.enabled),
  completion: z.boolean().default(DEFAULT_PYTHON_INTELLIGENCE_SETTINGS.completion),
  interpreterPath: z.string().default(DEFAULT_PYTHON_INTELLIGENCE_SETTINGS.interpreterPath),
  serverPath: z.string().default(DEFAULT_PYTHON_INTELLIGENCE_SETTINGS.serverPath),
})

const JavaEditingAssistanceSchema = z.object({
  enabled: z.boolean().default(DEFAULT_JAVA_EDITING_ASSISTANCE_SETTINGS.enabled),
})

/**
 * The editor group is volatile so accepted settings writes take effect without
 * remounting the Host plugin. The profile still persists the chosen values.
 */
export const Config = z.object({
  editor: z.object({
    autoSave: AutoSaveSchema.default(DEFAULT_AUTO_SAVE_SETTINGS),
    indentation: IndentationSchema.default(DEFAULT_INDENTATION_SETTINGS),
  }).default(DEFAULT_EDITOR_SETTINGS).volatile(),
  pythonIntelligence: PythonIntelligenceSchema
    .default(DEFAULT_PYTHON_INTELLIGENCE_SETTINGS),
  javaEditingAssistance: JavaEditingAssistanceSchema
    .default(DEFAULT_JAVA_EDITING_ASSISTANCE_SETTINGS)
    .volatile(),
}) as unknown as z<CodeCraftSettings>
