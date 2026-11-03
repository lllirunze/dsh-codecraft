/**
 * Which files CodeCraft claims, and which CodeMirror language serves them.
 *
 * Registration uses a suffix whitelist: only source and plain-text files are
 * taken over, so images, PDFs, Office documents, and binary containers keep
 * their native preview. Content is validated again on the Host before a file
 * becomes editable.
 *
 * @module dsh-codecraft/client/languages
 */

import { cpp } from '@codemirror/lang-cpp'
import { css } from '@codemirror/lang-css'
import { go } from '@codemirror/lang-go'
import { html } from '@codemirror/lang-html'
import { java } from '@codemirror/lang-java'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { php } from '@codemirror/lang-php'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { sql } from '@codemirror/lang-sql'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import type { LanguageSupport } from '@codemirror/language'
import { CODECRAFT_EDITABLE_EXTENSIONS } from '../protocol.js'

/** Suffixes CodeCraft claims, without a leading dot. */
export const EDITOR_EXTENSIONS = CODECRAFT_EDITABLE_EXTENSIONS

/** The language shown in the status bar and given to CodeMirror. */
export interface FileLanguage {
  label: string
  support: LanguageSupport | null
}

const PLAIN: FileLanguage = { label: '纯文本', support: null }

/**
 * Pick a language for one filename.
 * @param name - final path segment, in either separator spelling.
 */
export function languageForFile(name: string): FileLanguage {
  const lower = name.toLowerCase()
  if (lower.endsWith('.d.ts')) return { label: 'TypeScript', support: javascript({ typescript: true }) }
  if (lower.endsWith('.d.tsx')) {
    return { label: 'TypeScript', support: javascript({ typescript: true, jsx: true }) }
  }
  const dot = lower.lastIndexOf('.')
  if (dot === -1) return PLAIN
  const extension = lower.slice(dot + 1)
  switch (extension) {
    case 'py': case 'pyi': case 'pyw': return { label: 'Python', support: python() }
    case 'ts': case 'mts': case 'cts': return { label: 'TypeScript', support: javascript({ typescript: true }) }
    case 'tsx': return { label: 'TypeScript JSX', support: javascript({ typescript: true, jsx: true }) }
    case 'jsx': return { label: 'JavaScript JSX', support: javascript({ jsx: true }) }
    case 'js': case 'mjs': case 'cjs': return { label: 'JavaScript', support: javascript() }
    case 'json': case 'jsonc': return { label: 'JSON', support: json() }
    case 'md': case 'markdown': return { label: 'Markdown', support: markdown() }
    case 'html': case 'htm': return { label: 'HTML', support: html() }
    case 'css': case 'scss': case 'less': return { label: 'CSS', support: css() }
    case 'java': return { label: 'Java', support: java() }
    case 'c': case 'h': case 'cc': case 'cpp': case 'cxx': case 'hpp': case 'hh': case 'hxx':
      return { label: 'C/C++', support: cpp() }
    case 'go': return { label: 'Go', support: go() }
    case 'rs': return { label: 'Rust', support: rust() }
    case 'php': return { label: 'PHP', support: php() }
    case 'sql': return { label: 'SQL', support: sql() }
    case 'xml': return { label: 'XML', support: xml() }
    case 'yaml': case 'yml': return { label: 'YAML', support: yaml() }
    default: return PLAIN
  }
}
