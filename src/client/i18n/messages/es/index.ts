import { esCore } from './core.js'
import { esWorkspace } from './workspace.js'
import { esSettings } from './settings.js'
import { esHtml } from './html.js'

export const es = {
  ...esCore,
  ...esWorkspace,
  ...esSettings,
  ...esHtml,
} as const
