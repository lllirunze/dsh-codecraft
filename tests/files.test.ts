import { chmod, mkdir, mkdtemp, readdir, readFile, realpath, rm, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CodeCraftError } from '../src/host/errors.js'
import {
  detectIndent,
  readTextFile,
  resolveReadablePath,
  saveTextFile,
  statFile,
} from '../src/host/files.js'
import { MAX_EDITABLE_BYTES } from '../src/protocol.js'

const cleanups: string[] = []

async function fixture(): Promise<{ base: string, root: string, outside: string }> {
  const base = await mkdtemp(join(tmpdir(), 'codecraft-test-'))
  cleanups.push(base)
  const root = join(base, 'workspace')
  const outside = join(base, 'outside')
  await mkdir(root)
  await mkdir(outside)
  return { base, root, outside }
}

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function expectCodeCraftError(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(CodeCraftError)
  await promise.catch((error: unknown) => {
    expect((error as CodeCraftError).code).toBe(code)
  })
}

describe('readTextFile', () => {
  it('reads a UTF-8 LF file with an opaque version', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'main.py'), 'def calc(values):\n    return sum(values)\n')
    const snapshot = await readTextFile(root, 'main.py')
    expect(snapshot.kind).toBe('text')
    if (snapshot.kind !== 'text') return
    expect(snapshot.content).toBe('def calc(values):\n    return sum(values)\n')
    expect(snapshot.newline).toBe('lf')
    expect(snapshot.bom).toBe(false)
    expect(snapshot.writable).toBe(true)
    expect(snapshot.absolutePath).toBe(await realpath(join(root, 'main.py')))
    const stat = await statFile(root, 'main.py')
    expect(stat.version).toBe(snapshot.version)
  })

  it('normalizes CRLF line endings and preserves the UTF-8 BOM', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'win.ts'), Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('let a = 1\r\nlet b = 2\r\n'),
    ]))
    const snapshot = await readTextFile(root, join(root, 'win.ts'))
    expect(snapshot.kind).toBe('text')
    if (snapshot.kind !== 'text') return
    expect(snapshot.content).toBe('let a = 1\nlet b = 2\n')
    expect(snapshot.newline).toBe('crlf')
    expect(snapshot.bom).toBe(true)
  })

  it('refuses files above the editable limit without returning content', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'big.txt'), Buffer.alloc(MAX_EDITABLE_BYTES + 1, 0x61))
    const snapshot = await readTextFile(root, 'big.txt')
    expect(snapshot.kind).toBe('unsupported')
    if (snapshot.kind !== 'unsupported') return
    expect(snapshot.reason).toBe('too-large')
    expect('content' in snapshot).toBe(false)
  })

  it('refuses NUL bytes, invalid UTF-8, UTF-16 BOMs, and lone CR newlines', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'nul.txt'), Buffer.from([0x61, 0x00, 0x62]))
    await writeFile(join(root, 'bad.txt'), Buffer.from([0xc3, 0x28]))
    await writeFile(join(root, 'utf16.txt'), Buffer.from([0xff, 0xfe, 0x61, 0x00]))
    await writeFile(join(root, 'cr.txt'), 'a\rb')

    const nul = await readTextFile(root, 'nul.txt')
    const bad = await readTextFile(root, 'bad.txt')
    const utf16 = await readTextFile(root, 'utf16.txt')
    const cr = await readTextFile(root, 'cr.txt')
    expect(nul.kind === 'unsupported' && nul.reason).toBe('binary')
    expect(bad.kind === 'unsupported' && bad.reason).toBe('encoding')
    expect(utf16.kind === 'unsupported' && utf16.reason).toBe('encoding')
    expect(cr.kind === 'unsupported' && cr.reason).toBe('newline')
  })

  it('refuses files with mixed LF and CRLF line endings', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'mixed.txt'), 'a\r\nb\nc\r\n')
    const snapshot = await readTextFile(root, 'mixed.txt')
    expect(snapshot.kind === 'unsupported' && snapshot.reason).toBe('newline')
  })

  it('rejects lexical traversal and symlinks escaping the workspace', async () => {
    const { root, outside } = await fixture()
    await writeFile(join(outside, 'secret.txt'), 'secret')
    await symlink(join(outside, 'secret.txt'), join(root, 'escape.txt'))
    await expectCodeCraftError(readTextFile(root, '../outside/secret.txt'), 'outside-workspace')
    await expectCodeCraftError(readTextFile(root, 'escape.txt'), 'outside-workspace')
  })

  it('follows a symlink that stays inside the workspace', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'real.txt'), 'real')
    await symlink(join(root, 'real.txt'), join(root, 'link.txt'))
    const snapshot = await readTextFile(root, 'link.txt')
    expect(snapshot.kind).toBe('text')
    if (snapshot.kind !== 'text') return
    expect(snapshot.content).toBe('real')
    expect(snapshot.absolutePath).toBe(await realpath(join(root, 'real.txt')))
    expect(snapshot.writable).toBe(false)
    await expect(resolveReadablePath(root, 'link.txt')).resolves.toMatchObject({ target: await realpath(join(root, 'real.txt')) })
  })
})

describe('saveTextFile', () => {
  it('saves atomically, refreshes the version, and preserves CRLF + BOM', async () => {
    const { root } = await fixture()
    const file = join(root, 'crlf.ts')
    await writeFile(file, Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('a\r\nb\r\n'),
    ]))
    await chmod(file, 0o640)
    const snapshot = await readTextFile(root, 'crlf.ts')
    expect(snapshot.kind).toBe('text')
    if (snapshot.kind !== 'text') return
    const result = await saveTextFile({
      root,
      path: 'crlf.ts',
      content: 'a\nb\nc\n',
      expectedVersion: snapshot.version,
      newline: snapshot.newline,
      bom: snapshot.bom,
    })
    expect(result.version).not.toBe(snapshot.version)
    const bytes = await readFile(file)
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]))
    expect(bytes.subarray(3).toString('utf8')).toBe('a\r\nb\r\nc\r\n')
    const info = await statFile(root, 'crlf.ts')
    expect(info.size).toBe(bytes.byteLength)
    expect(info.version).toBe(result.version)
  })

  it.skipIf(process.platform === 'win32')('preserves the POSIX file mode', async () => {
    const { root } = await fixture()
    const file = join(root, 'mode.sh')
    await writeFile(file, '#!/bin/sh\necho hi\n')
    await chmod(file, 0o751)
    const snapshot = await readTextFile(root, 'mode.sh')
    expect(snapshot.kind).toBe('text')
    if (snapshot.kind !== 'text') return
    await saveTextFile({
      root,
      path: 'mode.sh',
      content: '#!/bin/sh\necho bye\n',
      expectedVersion: snapshot.version,
      newline: 'lf',
      bom: false,
    })
    const { stat } = await import('node:fs/promises')
    expect((await stat(file)).mode & 0o777).toBe(0o751)
  })

  it('rejects an overwrite after an external change and keeps the draft untouched', async () => {
    const { root } = await fixture()
    const file = join(root, 'conflict.ts')
    await writeFile(file, 'original\n')
    const snapshot = await readTextFile(root, 'conflict.ts')
    expect(snapshot.kind).toBe('text')
    if (snapshot.kind !== 'text') return
    await writeFile(file, 'external change\n')
    await utimes(file, new Date(), new Date(Date.now() + 2000))
    await expectCodeCraftError(saveTextFile({
      root,
      path: 'conflict.ts',
      content: 'my draft\n',
      expectedVersion: snapshot.version,
      newline: 'lf',
      bom: false,
    }), 'conflict')
    expect(await readFile(file, 'utf8')).toBe('external change\n')
    const leftovers = (await readdir(root)).filter(name => name.includes('.codecraft-'))
    expect(leftovers).toEqual([])
  })

  it('refuses to write through a symlink target', async () => {
    const { root } = await fixture()
    const realFile = join(root, 'real.txt')
    await writeFile(realFile, 'real\n')
    await symlink(realFile, join(root, 'link.txt'))
    const snapshot = await readTextFile(root, 'link.txt')
    expect(snapshot.kind).toBe('text')
    if (snapshot.kind !== 'text') return
    await expectCodeCraftError(saveTextFile({
      root,
      path: 'link.txt',
      content: 'changed\n',
      expectedVersion: snapshot.version,
      newline: 'lf',
      bom: false,
    }), 'symlink-target')
    expect(await readFile(realFile, 'utf8')).toBe('real\n')
  })

  it('refuses content above the editable limit and lone CR', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'a.txt'), 'a\n')
    const snapshot = await readTextFile(root, 'a.txt')
    expect(snapshot.kind).toBe('text')
    if (snapshot.kind !== 'text') return
    await expectCodeCraftError(saveTextFile({
      root,
      path: 'a.txt',
      content: 'x'.repeat(MAX_EDITABLE_BYTES + 1),
      expectedVersion: snapshot.version,
      newline: 'lf',
      bom: false,
    }), 'too-large')
    await expectCodeCraftError(saveTextFile({
      root,
      path: 'a.txt',
      content: 'a\rb',
      expectedVersion: snapshot.version,
      newline: 'lf',
      bom: false,
    }), 'bad-request')
  })
})

describe('statFile', () => {
  it('reports a missing file without throwing, and refuses outside paths', async () => {
    const { root, outside } = await fixture()
    await expect(statFile(root, 'missing.txt')).resolves.toMatchObject({ exists: false })
    await expectCodeCraftError(statFile(root, join(outside, 'x.txt')), 'outside-workspace')
  })
})

describe('detectIndent', () => {
  it('detects spaces, tabs, and an empty file', () => {
    expect(detectIndent('a\n    b\n        c\n')).toEqual({ kind: 'spaces', size: 4 })
    expect(detectIndent('a\n\tb\n\t\tc\n')).toEqual({ kind: 'tabs', size: 4 })
    expect(detectIndent('')).toEqual({ kind: 'spaces', size: 2 })
  })
})
