import { jaCore } from './core.js'
import { jaWorkspace } from './workspace.js'
import { jaSettings } from './settings.js'
import { jaHtml } from './html.js'

export const ja = {
  ...jaCore,
  ...jaWorkspace,
  ...jaSettings,
  ...jaHtml,
} as const
