/** Workspace-relative path helpers used by the Explorer client. */

/** Join a relative directory and one validated child name with `/`. */
export function joinRelative(parent: string, name: string): string {
  return parent === '' ? name : `${parent}/${name}`
}

/** Parent directory of a relative path; the workspace root is `''`. */
export function parentOf(path: string): string {
  const index = path.lastIndexOf('/')
  return index < 0 ? '' : path.slice(0, index)
}

/** Convert an absolute or relative path to a workspace-relative path. */
export function relativeOf(root: string, path: string): string {
  const normalizedRoot = root.replaceAll('\\', '/').replace(/\/+$/, '')
  const normalizedPath = path.replaceAll('\\', '/')
  if (normalizedPath === normalizedRoot) return ''
  if (normalizedPath.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}/`)) {
    return normalizedPath.slice(normalizedRoot.length + 1)
  }
  return path
}

/** Build an absolute host path from a workspace-relative path. */
export function absoluteOf(root: string, path: string): string {
  if (path === '') return root
  const separator = root.includes('\\') && !root.includes('/') ? '\\' : '/'
  const base = root.replace(/[\\/]+$/, '')
  const child = separator === '\\' ? path.replaceAll('/', '\\') : path
  return `${base}${separator}${child}`
}

/** Whether `child` equals `parent` or lives below it. */
export function isInside(parent: string, child: string): boolean {
  return child === parent || child.startsWith(`${parent}/`)
}

/** File name portion of a relative path. */
export function baseName(path: string): string {
  const normalized = path.replaceAll('\\', '/')
  return normalized.slice(normalized.lastIndexOf('/') + 1)
}
