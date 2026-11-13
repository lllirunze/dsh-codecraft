import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CodeCraftError } from '../src/host/errors.js'
import { WorkspaceService } from '../src/host/workspace/operations.js'
import { resolveTarget, validateName } from '../src/host/workspace/paths.js'
import { ERROR_CODES } from '../src/protocol.js'

const cleanups: string[] = []

async function fixture(): Promise<{ root: string, outside: string }> {
  const base = await mkdtemp(join(tmpdir(), 'codecraft-workspace-'))
  cleanups.push(base)
  const root = join(base, 'workspace')
  const outside = join(base, 'outside')
  await mkdir(root)
  await mkdir(outside)
  return { root, outside }
}

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function service(): WorkspaceService {
  return new WorkspaceService({
    platform: 'darwin',
    trash: async target => `trash:${target}`,
  })
}

function movingService(trashDirectory: string): WorkspaceService {
  return new WorkspaceService({
    platform: 'darwin',
    trash: async (target) => {
      const destination = join(trashDirectory, `${Date.now()}-${basename(target)}`)
      await rename(target, destination)
      return destination
    },
  })
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(CodeCraftError)
  await promise.catch((error: unknown) => {
    expect((error as CodeCraftError).code).toBe(code)
  })
}

describe('workspace path validation', () => {
  it('rejects empty, traversal, separators, and platform-reserved names', () => {
    expect(validateName('', 'darwin')).not.toBeNull()
    expect(validateName('.', 'darwin')).not.toBeNull()
    expect(validateName('..', 'darwin')).not.toBeNull()
    expect(validateName('a/b', 'darwin')).not.toBeNull()
    expect(validateName('a\\b', 'darwin')).not.toBeNull()
    expect(validateName('a:b', 'darwin')).not.toBeNull()
    expect(validateName('con.txt', 'win32')).not.toBeNull()
    expect(validateName('name.', 'win32')).not.toBeNull()
    expect(validateName('name ', 'win32')).not.toBeNull()
    expect(validateName('name?', 'win32')).not.toBeNull()
    expect(validateName('normal.txt', 'darwin')).toBeNull()
    expect(validateName('正常.txt', 'win32')).toBeNull()
  })

  it('rejects a target outside the canonical workspace', async () => {
    const { root, outside } = await fixture()
    const workspace = { root, real: root }
    await expectCode(resolveTarget(workspace, '../outside/escape.txt'), ERROR_CODES.outsideWorkspace)
    await expectCode(resolveTarget(workspace, join(outside, 'escape.txt')), ERROR_CODES.outsideWorkspace)
  })

  it('rejects NUL bytes and empty path segments', async () => {
    const { root } = await fixture()
    const workspace = { root, real: await realpath(root) }
    await expectCode(resolveTarget(workspace, 'a\0b.txt'), ERROR_CODES.badRequest)
    await expectCode(resolveTarget(workspace, 'a//b.txt'), ERROR_CODES.outsideWorkspace)
    await expectCode(resolveTarget(workspace, 'a/./b.txt'), ERROR_CODES.outsideWorkspace)
  })

  it('does not follow a final symlink and reports it as a symlink', async () => {
    const { root, outside } = await fixture()
    await writeFile(join(outside, 'secret.txt'), 'outside\n')
    await symlink(outside, join(root, 'link'))
    const target = await resolveTarget({ root, real: await realpath(root) }, 'link')
    expect(target.kind).toBe('symlink')
  })
})

describe('workspace operations', () => {
  it('lists entries with hidden flags and sizes', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'a.txt'), '12345\n')
    await mkdir(join(root, 'dir'))
    await writeFile(join(root, '.hidden'), 'x')
    const listing = await service().list(root, '')
    expect(listing.entries.map(entry => entry.name).sort()).toEqual(['.hidden', 'a.txt', 'dir'])
    expect(listing.entries.find(entry => entry.name === 'a.txt')?.size).toBe(6)
    expect(listing.entries.find(entry => entry.name === '.hidden')?.hidden).toBe(true)
  })

  it('creates files and folders without ever overwriting', async () => {
    const { root } = await fixture()
    const operations = service()
    const created = await operations.run(root, { kind: 'createFile', path: 'notes.txt', content: 'hello\n' })
    expect(created.succeeded).toEqual([{ path: 'notes.txt' }])
    expect(await readFile(join(root, 'notes.txt'), 'utf8')).toBe('hello\n')

    const repeated = await operations.run(root, { kind: 'createFile', path: 'notes.txt' })
    expect(repeated.succeeded).toEqual([])
    expect(repeated.failed[0]?.code).toBe(ERROR_CODES.alreadyExists)
    expect(await readFile(join(root, 'notes.txt'), 'utf8')).toBe('hello\n')

    const folder = await operations.run(root, { kind: 'createDirectory', path: 'src' })
    expect(folder.changedPaths[0]).toEqual({ from: 'src', kind: 'created' })
    expect((await lstat(join(root, 'src'))).isDirectory()).toBe(true)
  })

  it('renames a file and rejects a different existing sibling', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'old.txt'), 'x')
    await writeFile(join(root, 'taken.txt'), 'y')
    const operations = service()
    const renamed = await operations.run(root, { kind: 'rename', path: 'old.txt', newName: 'new.txt' })
    expect(renamed.changedPaths[0]).toEqual({ from: 'old.txt', to: 'new.txt', kind: 'renamed' })
    expect(await readFile(join(root, 'new.txt'), 'utf8')).toBe('x')

    const conflict = await operations.run(root, { kind: 'rename', path: 'new.txt', newName: 'taken.txt' })
    expect(conflict.failed[0]?.code).toBe(ERROR_CODES.alreadyExists)
    expect(await readFile(join(root, 'new.txt'), 'utf8')).toBe('x')
  })

  it('copies one file and a whole directory, and can keep both on conflict', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'a.txt'), 'a')
    await mkdir(join(root, 'dir', 'deep'), { recursive: true })
    await writeFile(join(root, 'dir', 'deep', 'b.txt'), 'b')
    await mkdir(join(root, 'target'))
    const operations = service()

    const first = await operations.run(root, {
      kind: 'copy', paths: ['a.txt', 'dir'], targetDirectory: 'target', conflict: 'skip',
    })
    expect(first.succeeded).toHaveLength(2)
    expect(await readFile(join(root, 'target', 'a.txt'), 'utf8')).toBe('a')
    expect(await readFile(join(root, 'target', 'dir', 'deep', 'b.txt'), 'utf8')).toBe('b')

    const second = await operations.run(root, {
      kind: 'copy', paths: ['a.txt'], targetDirectory: 'target', conflict: 'rename',
    })
    expect(second.succeeded[0]?.to).toBe('target/a copy.txt')
    expect(await readFile(join(root, 'target', 'a copy.txt'), 'utf8')).toBe('a')
    expect(await readFile(join(root, 'a.txt'), 'utf8')).toBe('a')
  })

  it('requires explicit confirmation for file overwrite and never merges folders', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'a.txt'), 'new')
    await writeFile(join(root, 'target', 'a.txt'), 'old').catch(async () => {
      await mkdir(join(root, 'target'))
      await writeFile(join(root, 'target', 'a.txt'), 'old')
    })
    await mkdir(join(root, 'dir'))
    await mkdir(join(root, 'target', 'dir'))
    const operations = service()

    const unconfirmed = await operations.run(root, {
      kind: 'copy', paths: ['a.txt'], targetDirectory: 'target', conflict: 'overwrite',
    })
    expect(unconfirmed.failed[0]?.code).toBe(ERROR_CODES.confirmationRequired)
    expect(await readFile(join(root, 'target', 'a.txt'), 'utf8')).toBe('old')

    const confirmed = await operations.run(root, {
      kind: 'copy', paths: ['a.txt'], targetDirectory: 'target', conflict: 'overwrite', confirmedOverwrite: true,
    })
    expect(confirmed.succeeded).toHaveLength(1)
    expect(await readFile(join(root, 'target', 'a.txt'), 'utf8')).toBe('new')

    const folder = await operations.run(root, {
      kind: 'copy', paths: ['dir'], targetDirectory: 'target', conflict: 'overwrite', confirmedOverwrite: true,
    })
    expect(folder.failed[0]?.code).toBe(ERROR_CODES.alreadyExists)
  })

  it('moves a file and a directory while keeping the source only on failure', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'move.txt'), 'm')
    await mkdir(join(root, 'nested', 'deep'), { recursive: true })
    await writeFile(join(root, 'nested', 'deep', 'file.txt'), 'd')
    await mkdir(join(root, 'target'))
    const operations = service()

    const moved = await operations.run(root, {
      kind: 'move', paths: ['move.txt', 'nested'], targetDirectory: 'target', conflict: 'skip',
    })
    expect(moved.succeeded).toHaveLength(2)
    await expect(lstat(join(root, 'move.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(root, 'target', 'nested', 'deep', 'file.txt'), 'utf8')).toBe('d')

    const back = await operations.run(root, {
      kind: 'move', paths: ['target/move.txt'], targetDirectory: '', conflict: 'skip',
    })
    expect(back.succeeded).toHaveLength(1)
    expect(await readFile(join(root, 'move.txt'), 'utf8')).toBe('m')
  })

  it('rejects moving a directory into itself or a descendant', async () => {
    const { root } = await fixture()
    await mkdir(join(root, 'a', 'b'), { recursive: true })
    const result = await service().run(root, {
      kind: 'move', paths: ['a'], targetDirectory: 'a/b', conflict: 'skip',
    })
    expect(result.failed[0]?.code).toBe(ERROR_CODES.invalidTarget)
    expect((await lstat(join(root, 'a', 'b'))).isDirectory()).toBe(true)
  })

  it('trashes without deleting the source when trash fails', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'keep.txt'), 'k')
    const failing = new WorkspaceService({
      platform: 'darwin',
      trash: async () => { throw new CodeCraftError(ERROR_CODES.trashUnavailable, 'no trash') },
    })
    const failed = await failing.run(root, { kind: 'delete', paths: ['keep.txt'], mode: 'trash' })
    expect(failed.failed[0]?.code).toBe(ERROR_CODES.trashUnavailable)
    expect(await readFile(join(root, 'keep.txt'), 'utf8')).toBe('k')

    const trashDirectory = join(root, '.trash')
    await mkdir(trashDirectory)
    const trashed = await movingService(trashDirectory).run(root, { kind: 'delete', paths: ['keep.txt'], mode: 'trash' })
    expect(trashed.changedPaths[0]).toEqual({ from: 'keep.txt', kind: 'trashed' })
    await expect(lstat(join(root, 'keep.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('requires confirmation for permanent deletion', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'keep.txt'), 'k')
    await expectCode(
      service().run(root, { kind: 'delete', paths: ['keep.txt'], mode: 'permanent' }),
      ERROR_CODES.confirmationRequired,
    )
    expect(await readFile(join(root, 'keep.txt'), 'utf8')).toBe('k')
    const deleted = await service().run(root, {
      kind: 'delete', paths: ['keep.txt'], mode: 'permanent', confirmedPermanent: true,
    })
    expect(deleted.changedPaths[0]).toEqual({ from: 'keep.txt', kind: 'deleted' })
  })

  it('deletes a symlink itself and not its outside target', async () => {
    const { root, outside } = await fixture()
    await writeFile(join(outside, 'secret.txt'), 'secret')
    await symlink(outside, join(root, 'link'))
    const trashDirectory = join(root, '.trash')
    await mkdir(trashDirectory)
    const result = await movingService(trashDirectory).run(root, { kind: 'delete', paths: ['link'], mode: 'trash' })
    expect(result.succeeded).toHaveLength(1)
    await expect(lstat(join(root, 'link'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(outside, 'secret.txt'), 'utf8')).toBe('secret')
  })

  it('refuses to rename, move, or delete the workspace root', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'keep.txt'), 'x')
    await mkdir(join(root, 'sub'))
    const operations = service()
    await expectCode(
      operations.run(root, { kind: 'rename', path: '', newName: 'moved' }),
      ERROR_CODES.invalidTarget,
    )
    const deleted = await operations.run(root, { kind: 'delete', paths: [''], mode: 'trash' })
    expect(deleted.failed[0]?.code).toBe(ERROR_CODES.invalidTarget)
    const moved = await operations.run(root, {
      kind: 'move',
      paths: [''],
      targetDirectory: 'sub',
      conflict: 'skip',
    })
    expect(moved.failed[0]?.code).toBe(ERROR_CODES.invalidTarget)
    expect(await readFile(join(root, 'keep.txt'), 'utf8')).toBe('x')
  })

  it('reports per-item success and failure in one batch', async () => {
    const { root } = await fixture()
    await writeFile(join(root, 'a.txt'), 'x')
    const result = await service().run(root, {
      kind: 'delete',
      paths: ['a.txt', 'missing.txt'],
      mode: 'trash',
    })
    expect(result.succeeded).toEqual([{ path: 'a.txt' }])
    expect(result.failed.map(item => item.path)).toEqual(['missing.txt'])
    expect(result.changedPaths).toEqual([{ from: 'a.txt', kind: 'trashed' }])
  })

  it('serializes concurrent operations in one workspace', async () => {
    const { root } = await fixture()
    const operations = service()
    const results = await Promise.all([
      operations.run(root, { kind: 'createDirectory', path: 'one' }),
      operations.run(root, { kind: 'createDirectory', path: 'two' }),
    ])
    expect(results.every(result => result.succeeded.length === 1)).toBe(true)
    expect((await lstat(join(root, 'one'))).isDirectory()).toBe(true)
    expect((await lstat(join(root, 'two'))).isDirectory()).toBe(true)
  })
})
