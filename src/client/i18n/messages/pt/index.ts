import { ptCore } from './core.js'
import { ptWorkspace } from './workspace.js'
import { ptSettings } from './settings.js'
import { ptHtml } from './html.js'

export const pt = {
  ...ptCore,
  ...ptWorkspace,
  ...ptSettings,
  ...ptHtml,
} as const
