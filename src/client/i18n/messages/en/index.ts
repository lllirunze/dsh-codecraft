import { enCore } from './core.js'
import { enHtml } from './html.js'
import { enSettings } from './settings.js'
import { enWorkspace } from './workspace.js'

/** Canonical CodeCraft catalog. Message keys are derived from this object. */
export const en = {
  ...enCore,
  ...enWorkspace,
  ...enSettings,
  ...enHtml,
} as const

