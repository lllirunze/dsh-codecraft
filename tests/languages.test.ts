import { describe, expect, it } from 'vitest'
import { EDITOR_EXTENSIONS, languageForFile, languageRegistry } from '../src/client/languages/index.js'
import { BaseLanguageAdapter } from '../src/client/languages/base/BaseLanguageAdapter.js'
import { LanguageRegistry } from '../src/client/languages/registry.js'

describe('EDITOR_EXTENSIONS', () => {
  it('is lowercase, unique, and dot-free', () => {
    expect(new Set(EDITOR_EXTENSIONS).size).toBe(EDITOR_EXTENSIONS.length)
    for (const extension of EDITOR_EXTENSIONS) {
      expect(extension).toBe(extension.toLowerCase())
      expect(extension.startsWith('.')).toBe(false)
      expect(extension.length).toBeGreaterThan(0)
    }
  })

  it('claims source and text suffixes without claiming binary containers', () => {
    for (const extension of ['py', 'ts', 'tsx', 'js', 'json', 'md', 'txt', 'go', 'rs', 'yaml']) {
      expect(EDITOR_EXTENSIONS).toContain(extension)
    }
    for (const extension of ['png', 'pdf', 'docx', 'xlsx', 'zip', 'mp4', 'wasm']) {
      expect(EDITOR_EXTENSIONS).not.toContain(extension)
    }
  })
})

describe('languageForFile', () => {
  it('maps source files to their CodeMirror language', () => {
    expect(languageForFile('main.py').label).toBe('Python')
    expect(languageForFile('main.ts').label).toBe('TypeScript')
    expect(languageForFile('types.d.ts').label).toBe('TypeScript')
    expect(languageForFile('types.d.tsx').label).toBe('TypeScript JSX')
    expect(languageForFile('main.tsx').label).toBe('TypeScript JSX')
    expect(languageForFile('main.jsx').label).toBe('JavaScript JSX')
    expect(languageForFile('main.go').label).toBe('Go')
    expect(languageForFile('main.rs').label).toBe('Rust')
    expect(languageForFile('config.yaml').label).toBe('YAML')
    expect(languageForFile('main.md').label).toBe('Markdown')
    expect(languageForFile('main.txt').label).toBe('纯文本')
    expect(languageForFile('Makefile').label).toBe('纯文本')
  })

  it('is case-insensitive', () => {
    expect(languageForFile('MAIN.PY').label).toBe('Python')
  })

  it('selects registered adapters by extension', () => {
    expect(languageRegistry.resolve('/workspace/MAIN.PY')?.id).toBe('python')
    expect(languageRegistry.resolve('Makefile')).toBeUndefined()
  })
})

class TestAdapter extends BaseLanguageAdapter {
  constructor(readonly id: string, readonly extensions: readonly string[]) {
    super()
  }
}

describe('LanguageRegistry', () => {
  it('rejects duplicate ids and extensions', () => {
    const registry = new LanguageRegistry<TestAdapter>()
    registry.register(new TestAdapter('one', ['one']))
    expect(() => registry.register(new TestAdapter('one', ['two']))).toThrow('duplicate language id')
    expect(() => registry.register(new TestAdapter('two', ['.ONE']))).toThrow('duplicate language extension')
  })

  it('provides a workspace-root default without language-specific infrastructure', async () => {
    const adapter = new TestAdapter('test', ['test'])
    await expect(adapter.detectProjectRoot('file:///workspace/a.test', 'file:///workspace')).resolves.toBe('file:///workspace')
  })
})
