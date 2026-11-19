import { ruCore } from './core.js'
import { ruWorkspace } from './workspace.js'
import { ruSettings } from './settings.js'
import { ruHtml } from './html.js'

export const ru = {
  ...ruCore,
  ...ruWorkspace,
  ...ruSettings,
  ...ruHtml,
} as const
