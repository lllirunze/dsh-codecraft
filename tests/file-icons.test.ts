import { describe, expect, it } from 'vitest'

import { resolveFileIcon, resolveFileIconId } from '../src/client/icons/file-icon-resolver.js'

describe('Material file icon resolver', () => {
  it('prefers exact filenames over extension mappings', () => {
    expect(resolveFileIconId({ name: 'README.md', kind: 'file' })).toBe('readme')
    expect(resolveFileIconId({ name: 'notes.md', kind: 'file' })).toBe('markdown')
    expect(resolveFileIconId({ name: 'package.json', kind: 'file' })).toBe('nodejs')
    expect(resolveFileIconId({ name: 'ordinary.json', kind: 'file' })).toBe('json')
    expect(resolveFileIconId({ name: 'Dockerfile', kind: 'file' })).toBe('docker')
  })

  it('matches the longest compound extension first', () => {
    expect(resolveFileIconId({ name: 'types.d.ts', kind: 'file' })).toBe('typescript-def')
    expect(resolveFileIconId({ name: 'resolver.spec.ts', kind: 'file' })).toBe('test-ts')
    expect(resolveFileIconId({ name: 'resolver.test.ts', kind: 'file' })).toBe('test-ts')
    expect(resolveFileIconId({ name: 'resolver.ts', kind: 'file' })).toBe('typescript')
  })

  it('covers the required language, project, and script associations', () => {
    expect(resolveFileIconId({ name: 'main.py', kind: 'file' })).toBe('python')
    expect(resolveFileIconId({ name: 'Main.java', kind: 'file' })).toBe('java')
    expect(resolveFileIconId({ name: 'index.HTML', kind: 'file' })).toBe('html')
    expect(resolveFileIconId({ name: 'pom.xml', kind: 'file' })).toBe('maven')
    expect(resolveFileIconId({ name: 'build.gradle', kind: 'file' })).toBe('gradle')
    expect(resolveFileIconId({ name: '.env', kind: 'file' })).toBe('tune')
    expect(resolveFileIconId({ name: 'deploy.ps1', kind: 'file' })).toBe('powershell')
    expect(resolveFileIconId({ name: 'main.rs', kind: 'file' })).toBe('rust')
    expect(resolveFileIconId({ name: 'go.mod', kind: 'file' })).toBe('go-mod')
  })

  it('uses named, expanded, and explicit root folder icons', () => {
    expect(resolveFileIconId({ name: 'src', kind: 'directory' })).toBe('folder-src')
    expect(resolveFileIconId({ name: 'SRC', kind: 'directory', expanded: true })).toBe('folder-src-open')
    expect(resolveFileIconId({ name: 'workspace', kind: 'root', expanded: true })).toBe('folder-root-open')
  })

  it('uses the built-in icon without throwing when no rule matches', () => {
    const inputs = [
      { name: 'space and 中文.unknown', kind: 'file' as const },
      { name: '普通目录', kind: 'directory' as const },
      { name: '普通目录', kind: 'directory' as const, expanded: true },
      { name: '链接', kind: 'symlink' as const },
      { name: 'socket', kind: 'other' as const },
    ]

    for (const input of inputs) {
      expect(resolveFileIconId(input)).toBeUndefined()
      expect(() => resolveFileIcon(input)).not.toThrow()
      expect(resolveFileIcon(input)).toEqual({ id: 'default', fileName: '' })
    }
  })
})
