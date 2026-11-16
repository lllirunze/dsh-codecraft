import { describe, expect, it } from 'vitest'
import { highlightTree, tags, type Tag } from '@lezer/highlight'

import {
  GITHUB_BRACKET_PALETTES,
  GITHUB_SYNTAX_PALETTES,
  GITHUB_SYNTAX_PALETTE_CSS,
  GITHUB_SYNTAX_TAG_STYLES,
  githubSyntaxHighlightStyle,
  githubSyntaxThemeExtensions,
} from '../src/client/editor/syntax-theme.js'
import { languageForFile, languageRegistry } from '../src/client/languages/index.js'
import { CODECRAFT_CSS } from '../src/client/theme.js'

const LANGUAGE_SAMPLES: Readonly<Record<string, string>> = {
  python: 'def greet(name: str):\n    return "hello"\n',
  java: 'package demo; public class Main { static int value = 1; }',
  html: '<main class="app">Hello</main>',
  typescript: 'interface User { name: string }\nconst user: User = { name: "Ada" }',
  'typescript-jsx': 'const view = <main title="Hello">Text</main>',
  'javascript-jsx': 'const view = <main title="Hello">Text</main>',
  javascript: 'function greet(name) { return `Hello ${name}` }',
  json: '{"name":"Ada","active":true,"count":1}',
  markdown: '# Heading\n\n> Quote with `code` and **strong** text.',
  css: '.app { color: #0969da; display: block; }',
  cpp: 'class App { public: int run() { return 1; } };',
  go: 'package main\nfunc main() { value := 1 }',
  rust: 'fn main() { let value: i32 = 1; }',
  php: '<?php function greet($name) { return "Hello " . $name; }',
  sql: 'SELECT name FROM users WHERE active = true;',
  xml: '<root id="one"><item>Text</item></root>',
  yaml: 'name: Ada\nactive: true\ncount: 1\n',
}

function styleFor(tag: Tag): Record<string, unknown> | undefined {
  return GITHUB_SYNTAX_TAG_STYLES.find(spec => {
    const specTags = Array.isArray(spec.tag) ? spec.tag : [spec.tag]
    return specTags.includes(tag)
  })
}

describe('GitHub Default syntax theme', () => {
  it('pins the requested 6.3.4 Light and Dark semantic palettes', () => {
    expect(GITHUB_SYNTAX_PALETTES.light).toEqual({
      foreground: '#1F2328',
      comment: '#6E7781',
      keyword: '#CF222E',
      string: '#0A3069',
      constant: '#0550AE',
      function: '#8250DF',
      definition: '#953800',
      support: '#0550AE',
      property: '#0550AE',
      tag: '#116329',
      invalid: '#82071E',
    })
    expect(GITHUB_SYNTAX_PALETTES.dark).toEqual({
      foreground: '#E6EDF3',
      comment: '#8B949E',
      keyword: '#FF7B72',
      string: '#A5D6FF',
      constant: '#79C0FF',
      function: '#D2A8FF',
      definition: '#FFA657',
      support: '#79C0FF',
      property: '#79C0FF',
      tag: '#7EE787',
      invalid: '#FFA198',
    })
  })

  it('maps common and document semantics through one shared Lezer style', () => {
    expect(styleFor(tags.keyword)?.color).toBe('var(--cc-syn-keyword)')
    expect(styleFor(tags.string)?.color).toBe('var(--cc-syn-string)')
    expect(styleFor(tags.number)?.color).toBe('var(--cc-syn-constant)')
    expect(styleFor(tags.variableName)?.color).toBe('var(--cc-syn-foreground)')
    expect(styleFor(tags.propertyName)?.color).toBe('var(--cc-syn-property)')
    expect(styleFor(tags.attributeName)?.color).toBe('var(--cc-syn-foreground)')
    expect(styleFor(tags.tagName)?.color).toBe('var(--cc-syn-tag)')
    expect(styleFor(tags.heading)?.color).toBe('var(--cc-syn-support)')
    expect(styleFor(tags.quote)?.color).toBe('var(--cc-syn-tag)')
    expect(styleFor(tags.invalid)?.color).toBe('var(--cc-syn-invalid)')
  })

  it('pins six GitHub bracket levels, invalid brackets, and match feedback', () => {
    expect(GITHUB_BRACKET_PALETTES.light).toEqual({
      level1: '#0969DA',
      level2: '#1A7F37',
      level3: '#9A6700',
      level4: '#CF222E',
      level5: '#BF3989',
      level6: '#8250DF',
      invalid: '#656D76',
      matchBackground: '#4AC26B40',
      matchBorder: '#4AC26B99',
    })
    expect(GITHUB_BRACKET_PALETTES.dark).toEqual({
      level1: '#79C0FF',
      level2: '#56D364',
      level3: '#E3B341',
      level4: '#FFA198',
      level5: '#FF9BCE',
      level6: '#D2A8FF',
      invalid: '#7D8590',
      matchBackground: '#3FB95040',
      matchBorder: '#3FB95099',
    })
  })

  it('lets bracket pair colors win over the nested syntax-token span', () => {
    expect(CODECRAFT_CSS).toContain('.dsh-codecraft .dsh-codecraft-bracket * { color: inherit !important; }')
  })

  it('applies the shared highlighter to every registered language parser', () => {
    const adapters = languageRegistry.adapters()
    expect(Object.keys(LANGUAGE_SAMPLES).sort()).toEqual(adapters.map(adapter => adapter.id).sort())
    for (const adapter of adapters) {
      const support = adapter.createSupport()
      const tree = support.language.parser.parse(LANGUAGE_SAMPLES[adapter.id] ?? '')
      let highlightedRangeCount = 0
      highlightTree(tree, githubSyntaxHighlightStyle, () => {
        highlightedRangeCount += 1
      })
      expect(highlightedRangeCount, adapter.id).toBeGreaterThan(0)
    }
  })

  it('centralizes parser-backed JSON, HTML/XML, and Java exceptions', () => {
    expect(githubSyntaxThemeExtensions(languageForFile('data.json'))).toHaveLength(2)
    expect(githubSyntaxThemeExtensions(languageForFile('page.html'))).toHaveLength(2)
    expect(githubSyntaxThemeExtensions(languageForFile('layout.xml'))).toHaveLength(2)
    expect(githubSyntaxThemeExtensions(languageForFile('Main.java'))).toHaveLength(2)
    expect(githubSyntaxThemeExtensions(languageForFile('main.py'))).toHaveLength(1)
  })

  it('follows DSH appearance and leaves typography and host UI ownership unchanged', () => {
    expect(GITHUB_SYNTAX_PALETTE_CSS).toContain('body[data-ds-dark-theme] .dsh-codecraft')
    expect(CODECRAFT_CSS).toContain('--cc-syn-foreground: #1F2328')
    expect(CODECRAFT_CSS).toContain('--cc-syn-foreground: #E6EDF3')
    expect(CODECRAFT_CSS).toContain('--cc-bracket-level-1: #0969DA')
    expect(CODECRAFT_CSS).toContain('--cc-bracket-level-6: #D2A8FF')
    expect(CODECRAFT_CSS).toContain('--cc-bracket-match-background: #4AC26B40')
    expect(CODECRAFT_CSS).toContain('--cc-bracket-match-border: #3FB95099')
    expect(CODECRAFT_CSS).not.toMatch(/(^|\n)body\s*\{/)
    expect(CODECRAFT_CSS).toContain('font-family: var(--ds-font-family-code')
    expect(CODECRAFT_CSS).toContain('font-size: var(--dsh-code-font-size, 12.5px)')
    expect(CODECRAFT_CSS).not.toContain('dsh-codecraft-font-trigger')
  })
})
