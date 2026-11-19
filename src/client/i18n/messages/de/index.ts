import { deCore } from './core.js'
import { deWorkspace } from './workspace.js'
import { deSettings } from './settings.js'
import { deHtml } from './html.js'

export const de = {
  ...deCore,
  ...deWorkspace,
  ...deSettings,
  ...deHtml,
} as const
