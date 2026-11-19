import { frCore } from './core.js'
import { frWorkspace } from './workspace.js'
import { frSettings } from './settings.js'
import { frHtml } from './html.js'

export const fr = {
  ...frCore,
  ...frWorkspace,
  ...frSettings,
  ...frHtml,
} as const
