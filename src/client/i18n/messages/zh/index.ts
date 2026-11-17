import type { en } from '../en/index.js'
import { zhCore } from './core.js'
import { zhHtml } from './html.js'
import { zhSettings } from './settings.js'
import { zhWorkspace } from './workspace.js'

/** Simplified Chinese catalog, statically constrained to the canonical keys. */
export const zh = {
  ...zhCore,
  ...zhWorkspace,
  ...zhSettings,
  ...zhHtml,
} satisfies Record<keyof typeof en, string>

