/**
 * DSH CodeCraft — Host half.
 *
 * The Host half owns exactly one thing: an authenticated JSON route that reads
 * and safely saves existing text files inside the Session workspace. It has no
 * file tree, no tab system, no tools, and no model-facing surface. The browser
 * half registers the document renderer that appears inside DSH's native file
 * tab; removing this plugin leaves the native preview untouched.
 *
 * @module dsh-codecraft
 */

import { CODECRAFT_ROUTE } from './protocol.js'
import type { HostContext } from './host/context.js'
import { IntelligenceManager } from './host/intelligence/manager.js'
import { createApiHandler } from './host/routes.js'
import { resolveCodeCraftSettings, type CodeCraftSettings } from './settings/schema.js'

export { CODECRAFT_ROUTE } from './protocol.js'
export { Config } from './config.js'
export type {
  CodeCraftEnvelope,
  CodeCraftErrorBody,
  CodeCraftRequest,
  IndentStyle,
  NewlineStyle,
  ReadResult,
  SaveResult,
  StatResult,
  TextFileSnapshot,
  UnsupportedFileSnapshot,
} from './protocol.js'

/** Cordis function-plugin name. */
export const name = 'dsh-codecraft'

/**
 * Native Host services required before mounting.
 *
 * `workingDirectory` is read optionally (the Session header provides the
 * fallback workspace), so it is intentionally absent here.
 */
export const inject = ['webServer', 'connection', 'sessions', 'subprocess']

/**
 * Register the save adapter for this plugin's lifetime.
 * @param ctx - Host context carrying the web server, admission fence, and Sessions.
 */
export function apply(ctx: HostContext, config: CodeCraftSettings): void {
  const settings = resolveCodeCraftSettings(config)
  const intelligence = new IntelligenceManager(
    ctx.subprocess,
    settings.pythonIntelligence,
    process.platform,
  )
  ctx.effect(
    () => {
      const unregister = ctx.webServer.register({
        kind: 'exact',
        path: CODECRAFT_ROUTE,
        handler: createApiHandler(ctx, intelligence),
      })
      return async () => {
        unregister()
        await intelligence.dispose()
      }
    },
    'dsh-codecraft: authenticated save API',
  )
}
