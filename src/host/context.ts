/**
 * The minimal DSH Host faces this plugin consumes.
 *
 * They are declared structurally instead of importing DSH's internal packages,
 * so the plugin stays a normal independent package and only depends on the
 * public service contracts it actually calls.
 */

/** A Node HTTP request, as handed to a `webServer` route handler. */
export interface RequestLike extends AsyncIterable<string | Uint8Array> {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  resume?(): void
}

/** A Node HTTP response, as handed to a `webServer` route handler. */
export interface ResponseLike {
  statusCode: number
  headersSent?: boolean
  setHeader(name: string, value: string | number | readonly string[]): void
  end(body?: string | Uint8Array): void
  destroy?(error?: Error): void
}

export interface WebServerRoute {
  kind: 'exact' | 'prefix'
  path: string
  handler: (req: RequestLike, res: ResponseLike) => void | Promise<void>
}

export interface WebServerService {
  register(route: WebServerRoute): () => void
}

export interface ConnectionService {
  /** Host/Origin fence plus browser authentication; `undefined` means admitted. */
  requestRejection(req: RequestLike): number | undefined
}

export interface HostSessionLike {
  header: { cwd?: string }
}

export interface SessionStoreService {
  get(id: string): HostSessionLike | undefined
}

export interface WorkingDirectoryService {
  get(session: HostSessionLike): string | undefined
}

/** The subset of the Cordis Host context used by this plugin. */
export interface HostContext {
  webServer: WebServerService
  connection: ConnectionService
  sessions: SessionStoreService
  effect(callback: () => (() => void) | void, label?: string): void
  get(name: string): unknown
}
