import { describe, expect, it } from 'vitest'

import { documentTabFileIconInput } from '../src/client/renderer/DocumentTabTitle.js'
import { resolveFileIconId } from '../src/client/icons/file-icon-resolver.js'

describe('documentTabFileIconInput', () => {
  it('adapts each Session file tab to the shared Explorer icon resolver', () => {
    const cases = [
      ['src/main.py', 'python'],
      ['src/Main.java', 'java'],
      ['web/index.html', 'html'],
      ['web/theme.css', 'css'],
      ['src/app.js', 'javascript'],
      ['src/app.ts', 'typescript'],
      ['config/ordinary.json', 'json'],
      ['docs/notes.md', 'markdown'],
      ['config/app.yaml', 'yaml'],
      ['config/app.xml', 'xml'],
      ['notes/plain.txt', 'document'],
    ] as const

    for (const [path, icon] of cases) {
      const input = documentTabFileIconInput(`dsh-resource://file/session/s1/${path}`)
      expect(input).toEqual({ name: path.split('/').at(-1), path, kind: 'file' })
      expect(input === undefined ? undefined : resolveFileIconId(input)).toBe(icon)
    }
  })

  it('preserves exact-filename priority and generic file fallback', () => {
    const exact = documentTabFileIconInput('dsh-resource://file/session/s1/Dockerfile')
    const unknown = documentTabFileIconInput(
      'dsh-resource://file/session/s1/space%20and%20%E4%B8%AD%E6%96%87.unknown',
    )
    expect(exact === undefined ? undefined : resolveFileIconId(exact)).toBe('docker')
    expect(unknown).toEqual({
      name: 'space and 中文.unknown',
      path: 'space and 中文.unknown',
      kind: 'file',
    })
    expect(unknown === undefined ? undefined : resolveFileIconId(unknown)).toBe('file')
  })

  it('derives fresh identity after rename or move without shared active-tab state', () => {
    const before = documentTabFileIconInput('dsh-resource://file/session/s1/src/config.json')
    const renamed = documentTabFileIconInput('dsh-resource://file/session/s1/src/config.ts')
    const moved = documentTabFileIconInput('dsh-resource://file/session/s1/archive/config.ts')

    expect(before === undefined ? undefined : resolveFileIconId(before)).toBe('json')
    expect(renamed === undefined ? undefined : resolveFileIconId(renamed)).toBe('typescript')
    expect(moved).toEqual({ name: 'config.ts', path: 'archive/config.ts', kind: 'file' })
    expect(before).not.toBe(renamed)
    expect(renamed).not.toBe(moved)
  })

  it('leaves non-Session and malformed navigation addresses unmodified', () => {
    expect(documentTabFileIconInput('dsh://settings/plugins')).toBeUndefined()
    expect(documentTabFileIconInput('dsh-resource://file/absolute/tmp/file.ts')).toBeUndefined()
    expect(documentTabFileIconInput('dsh-resource://file/session/s1/%E0%A4%A')).toBeUndefined()
  })
})
