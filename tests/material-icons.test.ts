import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  assertExactVersion,
  assertSafeSvg,
  buildMaterialIconData,
  readDependencyState,
  sha256,
  synchronizeMaterialIcons,
} from '../scripts/material-icons.mjs'

const cleanups: string[] = []

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map(target => rm(target, { recursive: true, force: true })))
})

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'codecraft-material-icons-'))
  cleanups.push(directory)
  return directory
}

describe('Material icon development synchronization', () => {
  it('requires one exact dependency version and a locked package integrity', async () => {
    expect(assertExactVersion('5.40.0')).toBe('5.40.0')
    expect(() => assertExactVersion('^5.40.0')).toThrow(/exact semantic version/)
    const state = await readDependencyState()
    expect(state).toMatchObject({ version: '5.40.0' })
    expect(state.integrity).toMatch(/^sha512-/)
  })

  it('rejects active and external SVG content during development sync', () => {
    expect(() => assertSafeSvg('<svg><path d="M0 0"/></svg>')).not.toThrow()
    expect(() => assertSafeSvg('<svg><script>alert(1)</script></svg>')).toThrow(/disallowed/)
    expect(() => assertSafeSvg('<svg onload="alert(1)"></svg>')).toThrow(/disallowed/)
    expect(() => assertSafeSvg('<svg><foreignObject/></svg>')).toThrow(/disallowed/)
    expect(() => assertSafeSvg('<svg><image href="https://example.com/a.png"/></svg>')).toThrow(/disallowed/)
  })

  it('generates complete version-matched mappings and hashes without copying SVGs', async () => {
    const state = await readDependencyState()
    const data = await buildMaterialIconData(state)
    expect(Object.keys(data.iconFiles)).toHaveLength(1256)
    expect(Object.keys(data.fileHashes)).toHaveLength(1256)
    expect(data.manifest.fileNames).toBeTypeOf('object')
    expect(data.manifest.folderNames).toBeTypeOf('object')

    const base = await temporaryDirectory()
    const clientModule = path.join(base, 'client.ts')
    const hostModule = path.join(base, 'host.ts')
    await synchronizeMaterialIcons({ ...state, clientModule, hostModule })
    const firstClient = await readFile(clientModule, 'utf8')
    const firstHost = await readFile(hostModule, 'utf8')
    await synchronizeMaterialIcons({ ...state, clientModule, hostModule })
    expect(await readFile(clientModule, 'utf8')).toBe(firstClient)
    expect(await readFile(hostModule, 'utf8')).toBe(firstHost)
    expect(firstClient).not.toMatch(/import .*\.svg/)
    expect(firstHost).toContain(state.integrity)
  })

  it('preserves both last-good generated modules when upstream SVG validation fails', async () => {
    const state = await readDependencyState()
    const base = await temporaryDirectory()
    const clientModule = path.join(base, 'client.ts')
    const hostModule = path.join(base, 'host.ts')
    await synchronizeMaterialIcons({ ...state, clientModule, hostModule })
    const beforeClient = sha256(await readFile(clientModule))
    const beforeHost = sha256(await readFile(hostModule))

    const unsafeSource = path.join(base, 'unsafe-upstream')
    await cp(state.sourceDirectory, unsafeSource, { recursive: true })
    await writeFile(path.join(unsafeSource, 'icons/python.svg'), '<svg><script>alert(1)</script></svg>')
    await expect(synchronizeMaterialIcons({
      ...state,
      sourceDirectory: unsafeSource,
      clientModule,
      hostModule,
    })).rejects.toThrow(/disallowed/)
    expect(sha256(await readFile(clientModule))).toBe(beforeClient)
    expect(sha256(await readFile(hostModule))).toBe(beforeHost)
  })
})
