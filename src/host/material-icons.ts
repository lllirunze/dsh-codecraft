import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'

import { MATERIAL_ICON_PACKAGE } from './material-icon-package.generated.js'
import { CodeCraftError } from './errors.js'
import { ERROR_CODES, type MaterialIconStatusResult } from '../protocol.js'

const MAX_ARCHIVE_BYTES = 8 * 1024 * 1024
const MAX_UNPACKED_BYTES = 32 * 1024 * 1024
const DOWNLOAD_TIMEOUT_MS = 30_000
const INSTALL_MARKER = 'installation.json'
const ACTIVE_SVG = [
  /<script\b/i,
  /<foreignObject\b/i,
  /<!DOCTYPE\b/i,
  /<!ENTITY\b/i,
  /\son[a-z]+\s*=/i,
  /(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:|javascript:)/i,
]

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

export interface MaterialIconPackageDefinition {
  name: string
  version: string
  integrity: string
  fileHashes: Readonly<Record<string, string>>
}

export interface MaterialIconManagerOptions {
  cacheRoot?: string
  env?: NodeJS.ProcessEnv
  homeDirectory?: string
  fetcher?: Fetcher
  registries?: readonly string[]
  packageDefinition?: MaterialIconPackageDefinition
}

interface InstallMarker {
  schemaVersion: 1
  name: string
  version: string
  integrity: string
  iconCount: number
}

/** Resolve CodeCraft's rebuildable icon cache under the current DSH home. */
export function materialIconCacheRoot(
  env: NodeJS.ProcessEnv = process.env,
  homeDirectory = homedir(),
): string {
  const configured = env.DSH_HOME?.trim()
  const selected = configured === undefined || configured === ''
    ? path.join(homeDirectory, '.dsh')
    : configured === '~'
      ? homeDirectory
      : configured.startsWith('~/') || configured.startsWith('~\\')
        ? path.join(homeDirectory, configured.slice(2))
        : configured
  return path.join(path.resolve(selected), 'cache', 'codecraft', 'material-icons')
}

function registryList(env: NodeJS.ProcessEnv): string[] {
  const configured = env.npm_config_registry ?? env.NPM_CONFIG_REGISTRY
  return [
    ...(configured === undefined || configured.trim() === '' ? [] : [configured.trim()]),
    'https://registry.npmmirror.com',
    'https://registry.npmjs.org',
  ]
}

function tarballUrl(registry: string, definition: MaterialIconPackageDefinition): string {
  let base: URL
  try {
    base = new URL(registry.endsWith('/') ? registry : `${registry}/`)
  } catch {
    throw new CodeCraftError(ERROR_CODES.iconDownloadFailed, 'Material Icons 下载源地址无效。', 502)
  }
  if (base.protocol !== 'https:' && base.protocol !== 'http:') {
    throw new CodeCraftError(ERROR_CODES.iconDownloadFailed, 'Material Icons 下载源必须使用 HTTP 或 HTTPS。', 502)
  }
  return new URL(
    `${definition.name}/-/${definition.name}-${definition.version}.tgz`,
    base,
  ).href
}

function assertSafeSvg(content: Buffer, fileName: string): void {
  const svg = content.toString('utf8')
  if (!/^\s*<svg\b/i.test(svg)) throw new Error(`${fileName} is not SVG`)
  if (ACTIVE_SVG.some(pattern => pattern.test(svg))) throw new Error(`${fileName} contains active content`)
}

function parseOctal(buffer: Buffer): number {
  const value = buffer.toString('ascii').replaceAll('\0', '').trim()
  if (!/^[0-7]+$/.test(value)) return value === '' ? 0 : Number.NaN
  return Number.parseInt(value, 8)
}

function tarString(buffer: Buffer): string {
  const end = buffer.indexOf(0)
  return buffer.subarray(0, end < 0 ? buffer.length : end).toString('utf8')
}

/** Extract only the expected SVG entries from an integrity-verified npm tarball. */
export function extractMaterialIconArchive(
  archive: Buffer,
  expected: Readonly<Record<string, string>>,
): Map<string, Buffer> {
  const tar = gunzipSync(archive, { maxOutputLength: MAX_UNPACKED_BYTES })
  const output = new Map<string, Buffer>()
  let offset = 0
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every(byte => byte === 0)) break
    const name = tarString(header.subarray(0, 100))
    const prefix = tarString(header.subarray(345, 500))
    const entryPath = prefix === '' ? name : `${prefix}/${name}`
    const size = parseOctal(header.subarray(124, 136))
    const type = header[156]
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > tar.length) {
      throw new Error('invalid tar entry size')
    }
    const content = tar.subarray(offset + 512, offset + 512 + size)
    const iconPrefix = 'package/icons/'
    if ((type === 0 || type === 48) && entryPath.startsWith(iconPrefix)) {
      const fileName = entryPath.slice(iconPrefix.length)
      const expectedHash = expected[fileName]
      if (expectedHash !== undefined) {
        if (path.basename(fileName) !== fileName || output.has(fileName)) throw new Error('unsafe or duplicate icon path')
        assertSafeSvg(content, fileName)
        const actualHash = createHash('sha256').update(content).digest('hex')
        if (actualHash !== expectedHash) throw new Error(`icon hash mismatch: ${fileName}`)
        output.set(fileName, Buffer.from(content))
      }
    }
    offset += 512 + Math.ceil(size / 512) * 512
  }
  if (output.size !== Object.keys(expected).length) throw new Error('archive is missing expected Material icons')
  return output
}

async function readResponseBounded(response: Response, signal?: AbortSignal): Promise<Buffer> {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_ARCHIVE_BYTES) throw new Error('archive is too large')
  if (response.body === null) throw new Error('download returned no body')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    if (signal?.aborted) {
      await reader.cancel(signal.reason).catch(() => undefined)
      throw signal.reason
    }
    const item = await reader.read()
    if (item.done) break
    size += item.value.byteLength
    if (size > MAX_ARCHIVE_BYTES) {
      await reader.cancel().catch(() => undefined)
      throw new Error('archive is too large')
    }
    chunks.push(item.value)
  }
  return Buffer.concat(chunks, size)
}

function verifyIntegrity(archive: Buffer, integrity: string): void {
  const [algorithm, expected] = integrity.split('-', 2)
  if (algorithm !== 'sha512' || expected === undefined) throw new Error('unsupported package integrity')
  const actual = createHash('sha512').update(archive).digest('base64')
  if (actual !== expected) throw new Error('package integrity mismatch')
}

/** Owns versioned download, verification, and atomic cache installation. */
export class MaterialIconManager {
  readonly definition: MaterialIconPackageDefinition
  readonly cacheRoot: string
  private readonly fetcher: Fetcher
  private readonly registries: readonly string[]
  private installing: Promise<MaterialIconStatusResult> | null = null

  constructor(options: MaterialIconManagerOptions = {}) {
    this.definition = options.packageDefinition ?? MATERIAL_ICON_PACKAGE
    this.cacheRoot = options.cacheRoot ?? materialIconCacheRoot(options.env, options.homeDirectory)
    this.fetcher = options.fetcher ?? fetch
    this.registries = [...new Set(options.registries ?? registryList(options.env ?? process.env))]
  }

  private versionDirectory(): string {
    return path.join(this.cacheRoot, this.definition.version)
  }

  async status(): Promise<MaterialIconStatusResult> {
    try {
      const marker = JSON.parse(await readFile(path.join(this.versionDirectory(), INSTALL_MARKER), 'utf8')) as InstallMarker
      const installed = marker.schemaVersion === 1
        && marker.name === this.definition.name
        && marker.version === this.definition.version
        && marker.integrity === this.definition.integrity
        && marker.iconCount === Object.keys(this.definition.fileHashes).length
      return {
        version: this.definition.version,
        installed,
        iconCount: installed ? marker.iconCount : 0,
      }
    } catch {
      return { version: this.definition.version, installed: false, iconCount: 0 }
    }
  }

  install(signal?: AbortSignal): Promise<MaterialIconStatusResult> {
    if (this.installing !== null) return this.installing
    this.installing = this.performInstall(signal).finally(() => {
      this.installing = null
    })
    return this.installing
  }

  private async performInstall(signal?: AbortSignal): Promise<MaterialIconStatusResult> {
    let archive: Buffer | undefined
    let lastFailure: unknown
    for (const registry of this.registries) {
      if (signal?.aborted) throw signal.reason
      const attempt = new AbortController()
      const forwardAbort = (): void => attempt.abort(signal?.reason)
      signal?.addEventListener('abort', forwardAbort, { once: true })
      const timeout = setTimeout(() => attempt.abort(new Error('download timeout')), DOWNLOAD_TIMEOUT_MS)
      try {
        const response = await this.fetcher(tarballUrl(registry, this.definition), {
          method: 'GET',
          cache: 'no-store',
          redirect: 'follow',
          signal: attempt.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        archive = await readResponseBounded(response, attempt.signal)
        verifyIntegrity(archive, this.definition.integrity)
        break
      } catch (error) {
        if (signal?.aborted) throw signal.reason
        lastFailure = error
      } finally {
        clearTimeout(timeout)
        signal?.removeEventListener('abort', forwardAbort)
      }
    }
    if (archive === undefined) {
      throw new CodeCraftError(
        ERROR_CODES.iconDownloadFailed,
        `无法从国内镜像或 npm 官方源下载 Material Icons：${lastFailure instanceof Error ? lastFailure.message : '网络不可用'}`,
        502,
      )
    }
    let icons: Map<string, Buffer>
    try {
      icons = extractMaterialIconArchive(archive, this.definition.fileHashes)
    } catch {
      throw new CodeCraftError(ERROR_CODES.iconPackageInvalid, '下载的 Material Icons 包未通过完整性验证。', 502)
    }
    await mkdir(this.cacheRoot, { recursive: true })
    const target = this.versionDirectory()
    const suffix = randomUUID()
    const staging = `${target}.stage-${suffix}`
    const backup = `${target}.backup-${suffix}`
    let backedUp = false
    try {
      await mkdir(staging, { recursive: true })
      for (const [fileName, content] of icons) await writeFile(path.join(staging, fileName), content)
      const marker: InstallMarker = {
        schemaVersion: 1,
        name: this.definition.name,
        version: this.definition.version,
        integrity: this.definition.integrity,
        iconCount: icons.size,
      }
      await writeFile(path.join(staging, INSTALL_MARKER), `${JSON.stringify(marker, null, 2)}\n`)
      try {
        await rename(target, backup)
        backedUp = true
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      await rename(staging, target)
      await rm(backup, { recursive: true, force: true })
    } catch (error) {
      await rm(staging, { recursive: true, force: true }).catch(() => undefined)
      if (backedUp) {
        await rm(target, { recursive: true, force: true }).catch(() => undefined)
        await rename(backup, target).catch(() => undefined)
      }
      throw new CodeCraftError(
        ERROR_CODES.iconInstallFailed,
        'Material Icons 无法写入 DSH 缓存，请检查磁盘空间和目录权限。',
        500,
      )
    } finally {
      await rm(backup, { recursive: true, force: true }).catch(() => undefined)
    }
    return { version: this.definition.version, installed: true, iconCount: icons.size }
  }

  async readIcon(fileName: string): Promise<Buffer | undefined> {
    const expectedHash = this.definition.fileHashes[fileName]
    if (expectedHash === undefined || path.basename(fileName) !== fileName) return undefined
    try {
      const content = await readFile(path.join(this.versionDirectory(), fileName))
      assertSafeSvg(content, fileName)
      const actualHash = createHash('sha256').update(content).digest('hex')
      return actualHash === expectedHash ? content : undefined
    } catch {
      return undefined
    }
  }
}
