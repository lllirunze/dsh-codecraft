/**
 * Best-effort system Trash integration for destructive Explorer operations.
 *
 * macOS moves into `~/.Trash` (renaming when possible, copying then removing
 * across volumes). Windows uses the Recycle Bin through a fixed PowerShell
 * script; the target path travels only through an environment variable, never
 * through shell interpolation. Other platforms and failures surface as
 * `trash-unavailable` so the UI can ask for explicit permanent deletion.
 *
 * @module dsh-codecraft/host/workspace/trash
 */

import { execFile } from 'node:child_process'
import { cp, lstat, mkdir, rename, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { CodeCraftError } from '../errors.js'
import { ERROR_CODES } from '../../protocol.js'
import { copyName } from './paths.js'

const run = promisify(execFile)

/** Windows Recycle Bin script; the only dynamic input is `$env:CODECRAFT_TRASH_TARGET`. */
const WINDOWS_TRASH_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  'Add-Type -AssemblyName Microsoft.VisualBasic',
  '$target = $env:CODECRAFT_TRASH_TARGET',
  "if (Test-Path -LiteralPath $target -PathType Container) {",
  "  [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($target, 'OnlyErrorDialogs', 'SendToRecycleBin')",
  '} else {',
  "  [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($target, 'OnlyErrorDialogs', 'SendToRecycleBin')",
  '}',
].join('\n')

/**
 * Move one file or directory to the platform Trash.
 * @param target - absolute path that already passed workspace validation.
 * @returns the path inside the Trash (best effort; Windows returns the original).
 */
export async function moveToTrash(target: string): Promise<string> {
  if (process.platform === 'darwin') return moveToMacTrash(target)
  if (process.platform === 'win32') return moveToWindowsRecycleBin(target)
  throw new CodeCraftError(
    ERROR_CODES.trashUnavailable,
    '当前平台没有可用的系统回收站；请确认后再永久删除。',
  )
}

/** Move to `~/.Trash`, falling back to copy-then-remove across volumes. */
async function moveToMacTrash(target: string): Promise<string> {
  const info = await lstat(target).catch(() => null)
  if (info === null) {
    throw new CodeCraftError(ERROR_CODES.notFound, '目标已不存在。', 404)
  }
  const directory = path.join(homedir(), '.Trash')
  await mkdir(directory, { recursive: true }).catch(() => undefined)
  const kind = info.isDirectory()
    ? 'directory'
    : info.isSymbolicLink()
      ? 'symlink'
      : 'file'
  const destination = await freeTrashPath(directory, path.basename(target), kind)

  try {
    await rename(target, destination)
    return destination
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') {
      throw new CodeCraftError(ERROR_CODES.trashUnavailable, '无法移入系统回收站。')
    }
  }

  try {
    await cp(target, destination, { recursive: true, force: false, errorOnExist: true, dereference: false })
    await rm(target, { recursive: true, force: false })
    return destination
  } catch {
    await rm(destination, { recursive: true, force: true }).catch(() => undefined)
    throw new CodeCraftError(ERROR_CODES.trashUnavailable, '无法移入系统回收站；原文件已保留。')
  }
}

/** Ask the Windows shell to recycle one path. */
async function moveToWindowsRecycleBin(target: string): Promise<string> {
  try {
    await run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      WINDOWS_TRASH_SCRIPT,
    ], {
      env: { ...process.env, CODECRAFT_TRASH_TARGET: target },
      cwd: tmpdir(),
      windowsHide: true,
      timeout: 30_000,
    })
    return target
  } catch {
    throw new CodeCraftError(
      ERROR_CODES.trashUnavailable,
      '无法移入 Windows 回收站；请确认后再永久删除。',
    )
  }
}

/** Find an unused name in the Trash without overwriting another item. */
async function freeTrashPath(
  directory: string,
  name: string,
  kind: 'file' | 'directory' | 'symlink',
): Promise<string> {
  for (let index = 0; index < 1000; index += 1) {
    const candidate = path.join(directory, index === 0 ? name : copyName(name, kind, index))
    try {
      await lstat(candidate)
    } catch {
      return candidate
    }
  }
  throw new CodeCraftError(ERROR_CODES.trashUnavailable, '系统回收站中同名项目过多。')
}
