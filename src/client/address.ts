/**
 * `dsh-resource://file/…` address parsing for the editor.
 *
 * The grammar is the one DSH publishes in `@deepseek-ai/dsh-util-workspace-path`
 * (`parseFileAddress`). It is reproduced here, narrowed to the Session scope
 * this plugin serves, so the browser bundle does not need a package that the
 * Host module table does not expose.
 *
 * @module dsh-codecraft/client/address
 */

const FILE_ADDRESS_PREFIX = 'dsh-resource://file/'

/** One file opened through an authenticated Session. */
export interface SessionFileAddress {
  sessionId: string
  /** Workspace-relative or absolute path, decoded per segment. */
  path: string
}

function decodeSegment(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment)
  } catch {
    return undefined
  }
}

function encodeSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/%3A/gi, ':')
}

/** Build the native DSH resource identity for one Session-owned file. */
export function sessionFileAddress(sessionId: string, path: string): string {
  const normalized = path.replaceAll('\\', '/').replace(/^(?:\.\/)+/, '')
  const encodedPath = normalized.split('/').map(encodeSegment).join('/')
  return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encodedPath}`
}

/**
 * Read a `file` address's Session scope.
 * @param address - a candidate `dsh-resource://` address.
 * @returns the authorization Session and decoded path, or `undefined` when the
 * address is not a Session file address.
 */
export function parseSessionFileAddress(address: string): SessionFileAddress | undefined {
  if (!address.startsWith(FILE_ADDRESS_PREFIX)) return undefined
  const end = address.search(/[?#]/)
  const rest = address.slice(FILE_ADDRESS_PREFIX.length, end === -1 ? undefined : end).split('/')
  const [scope, session, ...segments] = rest
  if (scope !== 'session' || session === undefined || session === '' || segments.length === 0) {
    return undefined
  }
  const sessionId = decodeSegment(session)
  if (sessionId === undefined || sessionId === '') return undefined
  const path: string[] = []
  for (const segment of segments) {
    const decoded = decodeSegment(segment)
    if (decoded === undefined) return undefined
    path.push(decoded)
  }
  return { sessionId, path: path.join('/') }
}

/**
 * The final path segment, used for language detection and labels.
 * @param path - a decoded path in either separator spelling.
 */
export function fileNameOf(path: string): string {
  const normalized = path.replaceAll('\\', '/')
  return normalized.slice(normalized.lastIndexOf('/') + 1)
}
