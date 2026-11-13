import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  MaterialIconManager,
  extractMaterialIconArchive,
  materialIconCacheRoot,
  type MaterialIconPackageDefinition,
} from '../src/host/material-icons.js'

const cleanups: string[] = []

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map(target => rm(target, { recursive: true, force: true })))
})

function tarEntry(name: string, content: Buffer): Buffer {
  const header = Buffer.alloc(512)
  header.write(name, 0, 100, 'utf8')
  header.write('0000644\0', 100, 8, 'ascii')
  header.write('0000000\0', 108, 8, 'ascii')
  header.write('0000000\0', 116, 8, 'ascii')
  header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124, 12, 'ascii')
  header[156] = 48
  return Buffer.concat([header, content, Buffer.alloc((512 - content.length % 512) % 512)])
}

function packageArchive(files: Record<string, string>): Buffer {
  return gzipSync(Buffer.concat([
    ...Object.entries(files).map(([name, content]) => tarEntry(`package/icons/${name}`, Buffer.from(content))),
    Buffer.alloc(1024),
  ]))
}

function definition(files: Record<string, string>, archive: Buffer): MaterialIconPackageDefinition {
  return {
    name: 'material-icon-theme',
    version: '5.40.0',
    integrity: `sha512-${createHash('sha512').update(archive).digest('base64')}`,
    fileHashes: Object.fromEntries(Object.entries(files).map(([name, content]) => [
      name,
      createHash('sha256').update(content).digest('hex'),
    ])),
  }
}

function archiveResponse(archive: Buffer): Response {
  return new Response(Uint8Array.from(archive).buffer, { status: 200 })
}

describe('Material icon cache installation', () => {
  it('uses the DSH cache category and honors DSH_HOME', () => {
    expect(materialIconCacheRoot({}, '/users/test')).toBe(path.resolve('/users/test/.dsh/cache/codecraft/material-icons'))
    expect(materialIconCacheRoot({ DSH_HOME: '/data/dsh' }, '/users/test')).toBe(path.resolve('/data/dsh/cache/codecraft/material-icons'))
  })

  it('falls back between registries and atomically installs an integrity-matched package', async () => {
    const files = {
      'file.svg': '<svg><path d="M0 0"/></svg>',
      'folder.svg': '<svg><path d="M1 1"/></svg>',
    }
    const archive = packageArchive(files)
    const cacheRoot = await mkdtemp(path.join(tmpdir(), 'codecraft-icon-cache-'))
    cleanups.push(cacheRoot)
    const fetcher = vi.fn(async (url: string) => url.includes('primary.invalid')
      ? new Response('unavailable', { status: 503 })
      : archiveResponse(archive))
    const manager = new MaterialIconManager({
      cacheRoot,
      fetcher,
      registries: ['https://primary.invalid', 'https://fallback.invalid'],
      packageDefinition: definition(files, archive),
    })

    await expect(manager.status()).resolves.toMatchObject({ installed: false })
    await expect(manager.install()).resolves.toEqual({ version: '5.40.0', installed: true, iconCount: 2 })
    expect(fetcher).toHaveBeenCalledTimes(2)
    await expect(manager.status()).resolves.toMatchObject({ installed: true, iconCount: 2 })
    await expect(readFile(path.join(cacheRoot, '5.40.0', 'file.svg'), 'utf8')).resolves.toBe(files['file.svg'])
  })

  it('rejects hash mismatches and keeps an existing installation unchanged', async () => {
    const files = { 'file.svg': '<svg><path d="M0 0"/></svg>' }
    const archive = packageArchive(files)
    const cacheRoot = await mkdtemp(path.join(tmpdir(), 'codecraft-icon-cache-'))
    cleanups.push(cacheRoot)
    const validDefinition = definition(files, archive)
    const manager = new MaterialIconManager({
      cacheRoot,
      fetcher: async () => archiveResponse(archive),
      registries: ['https://registry.invalid'],
      packageDefinition: validDefinition,
    })
    await manager.install()
    const before = await readFile(path.join(cacheRoot, '5.40.0', 'file.svg'), 'utf8')

    const invalid = new MaterialIconManager({
      cacheRoot,
      fetcher: async () => archiveResponse(archive),
      registries: ['https://registry.invalid'],
      packageDefinition: { ...validDefinition, fileHashes: { 'file.svg': '0'.repeat(64) } },
    })
    await expect(invalid.install()).rejects.toMatchObject({ code: 'icon-package-invalid' })
    await expect(readFile(path.join(cacheRoot, '5.40.0', 'file.svg'), 'utf8')).resolves.toBe(before)
  })

  it('rejects active SVG content even when a caller supplies its matching hash', () => {
    const files = { 'file.svg': '<svg><script>alert(1)</script></svg>' }
    const archive = packageArchive(files)
    expect(() => extractMaterialIconArchive(archive, definition(files, archive).fileHashes)).toThrow(/active content/)
  })

  it('reads only declared SVG files that still match generated safety metadata', async () => {
    const files = { 'file.svg': '<svg><path d="M0 0"/></svg>' }
    const archive = packageArchive(files)
    const cacheRoot = await mkdtemp(path.join(tmpdir(), 'codecraft-icon-cache-'))
    cleanups.push(cacheRoot)
    const manager = new MaterialIconManager({
      cacheRoot,
      fetcher: async () => archiveResponse(archive),
      registries: ['https://registry.invalid'],
      packageDefinition: definition(files, archive),
    })
    await manager.install()

    await expect(manager.readIcon('file.svg')).resolves.toEqual(Buffer.from(files['file.svg']))
    await expect(manager.readIcon('../file.svg')).resolves.toBeUndefined()
    await expect(manager.readIcon('undeclared.svg')).resolves.toBeUndefined()

    await writeFile(path.join(cacheRoot, '5.40.0', 'file.svg'), '<svg><script>alert(1)</script></svg>')
    await expect(manager.readIcon('file.svg')).resolves.toBeUndefined()
  })
})
