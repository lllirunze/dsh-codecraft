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
import { createApiHandler } from './host/routes.js'

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
export const inject = ['webServer', 'connection', 'sessions']

/**
 * Register the save adapter for this plugin's lifetime.
 * @param ctx - Host context carrying the web server, admission fence, and Sessions.
 */
export function apply(ctx: HostContext): void {
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: CODECRAFT_ROUTE,
      handler: createApiHandler(ctx),
    }),
    'dsh-codecraft: authenticated save API',
  )
}
