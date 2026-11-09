/** Language selection backed by a small adapter registry. */

import { cpp } from '@codemirror/lang-cpp'
import { css } from '@codemirror/lang-css'
import { go } from '@codemirror/lang-go'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { php } from '@codemirror/lang-php'
import { rust } from '@codemirror/lang-rust'
import { sql } from '@codemirror/lang-sql'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import type { LanguageSupport } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import type { CompletionSource } from '@codemirror/autocomplete'
import { CODECRAFT_EDITABLE_EXTENSIONS } from '../../protocol.js'
import type { EditorLanguageAdapter } from './EditorLanguageAdapter.js'
import { LanguageRegistry } from './registry.js'
import { javaEditorLanguage } from './java/index.js'
import { htmlEditorLanguage } from './html/index.js'
import { pythonEditorLanguage } from './python/index.js'

export const EDITOR_EXTENSIONS = CODECRAFT_EDITABLE_EXTENSIONS

export interface FileLanguage {
  id: string
  label: string
  support: LanguageSupport | null
  editorExtensions: Extension
  completionSource?: CompletionSource
  initializationError?: boolean
}

class CodeMirrorLanguageAdapter implements EditorLanguageAdapter {
  constructor(
    readonly id: string,
    readonly label: string,
    readonly extensions: readonly string[],
    readonly createSupport: () => LanguageSupport,
    readonly createEditorExtensions: () => Extension = () => [],
  ) {
  }
}

const registry = new LanguageRegistry<EditorLanguageAdapter>()

for (const adapter of [
  pythonEditorLanguage,
  javaEditorLanguage,
  htmlEditorLanguage,
  new CodeMirrorLanguageAdapter('typescript', 'TypeScript', ['ts', 'mts', 'cts'], () => javascript({ typescript: true })),
  new CodeMirrorLanguageAdapter('typescript-jsx', 'TypeScript JSX', ['tsx'], () => javascript({ typescript: true, jsx: true })),
  new CodeMirrorLanguageAdapter('javascript-jsx', 'JavaScript JSX', ['jsx'], () => javascript({ jsx: true })),
  new CodeMirrorLanguageAdapter('javascript', 'JavaScript', ['js', 'mjs', 'cjs'], javascript),
  new CodeMirrorLanguageAdapter('json', 'JSON', ['json', 'jsonc'], json),
  new CodeMirrorLanguageAdapter('markdown', 'Markdown', ['md', 'markdown'], markdown),
  new CodeMirrorLanguageAdapter('css', 'CSS', ['css', 'scss', 'less'], css),
  new CodeMirrorLanguageAdapter('cpp', 'C/C++', ['c', 'h', 'cc', 'cpp', 'cxx', 'hpp', 'hh', 'hxx'], cpp),
  new CodeMirrorLanguageAdapter('go', 'Go', ['go'], go),
  new CodeMirrorLanguageAdapter('rust', 'Rust', ['rs'], rust),
  new CodeMirrorLanguageAdapter('php', 'PHP', ['php'], php),
  new CodeMirrorLanguageAdapter('sql', 'SQL', ['sql'], sql),
  new CodeMirrorLanguageAdapter('xml', 'XML', ['xml'], xml),
  new CodeMirrorLanguageAdapter('yaml', 'YAML', ['yaml', 'yml'], yaml),
]) registry.register(adapter)

const PLAIN: FileLanguage = { id: 'plain', label: '纯文本', support: null, editorExtensions: [] }

function resolveAdapter(name: string): EditorLanguageAdapter | undefined {
  const lower = name.toLowerCase()
  if (lower.endsWith('.d.tsx')) return registry.get('typescript-jsx')
  if (lower.endsWith('.d.ts')) return registry.get('typescript')
  return registry.resolve(lower)
}

/** Pick the status label and CodeMirror support for one filename. */
export function languageForFile(name: string): FileLanguage {
  const adapter = resolveAdapter(name)
  if (adapter === undefined) return PLAIN
  try {
    return {
      id: adapter.id,
      label: adapter.label,
      support: adapter.createSupport(),
      editorExtensions: adapter.createEditorExtensions(),
      ...(adapter.completionSource === undefined ? {} : { completionSource: adapter.completionSource }),
    }
  } catch {
    return {
      id: adapter.id,
      label: adapter.label,
      support: null,
      editorExtensions: [],
      initializationError: true,
      ...(adapter.completionSource === undefined ? {} : { completionSource: adapter.completionSource }),
    }
  }
}

/** Exposed for structural tests and future project-aware consumers. */
export const languageRegistry = registry
